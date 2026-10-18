import type { Server } from 'socket.io';
import { gameDAO, type GameDAO } from '../dao/game.dao';
import { roomService, sanitizeState } from '../../room/services/room.service';
import {
  getRandomWords,
  getRandomCombinations,
  getWordHint,
  revealLetter,
  countLetters,
  checkGuess,
  COMBINATION_SEPARATOR,
  type GuessResult,
  type WordOptions,
} from '../../../shared/utils/words';
import {
  gameQueue,
  scheduleAutoWord,
  scheduleEndRound,
  scheduleReveal,
  scheduleIdleCheck,
  clearGameJobs,
} from '../queue/game.queue';
import { roomDAO } from '../../room/dao/room.dao';
import { redis } from '../../../shared/config/redis';
import { SOCKET_ROOM_KEY, SOCKET_PID_KEY } from '../../../shared/utils/socketKeys';
import type { RoomState, ChatMessage, Player, Reaction, Team } from '../../../shared/types';

const DRAWN_KEY = (code: string) => `drawn:${code}`;
const REACTIONS_KEY = (code: string) => `reactions:${code}`;
const ROUND_END_LOCK = (code: string, round: number, drawerIndex: number) =>
  `roundend:${code}:${round}:${drawerIndex}`;

const MAX_AFK_STRIKES = 2;
const MIN_TEAMS_PLAYERS = 4;

export type HandleGuessResult = GuessResult | 'blocked';

async function persistMessage(code: string, msg: ChatMessage) {
  await redis.rpush(`messages:${code}`, JSON.stringify(msg));
  await redis.ltrim(`messages:${code}`, -200, -1);
  await redis.expire(`messages:${code}`, 86400);
}

async function announce(code: string, io: Server, text: string) {
  const msg: ChatMessage = { playerId: '', username: '', text, isCorrect: false, isSystem: true, timestamp: Date.now() };
  await persistMessage(code, msg);
  io.to(code).emit('game:message', msg);
}

function wordOptions(state: RoomState): WordOptions {
  return {
    difficulty: state.wordDifficulty ?? 'mixed',
    customWords: state.customWords ?? [],
    customWordsOnly: state.customWordsOnly ?? false,
    exclude: state.usedWords ?? [],
  };
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// In teams mode only the drawer's teammates guess; fall back to everyone if they have none left
export function eligibleGuessers(state: RoomState): Player[] {
  const drawer = state.players.find((p) => p.isDrawing);
  const others = state.players.filter((p) => !p.isDrawing);
  if (state.mode !== 'teams' || !drawer?.team) return others;
  const teammates = others.filter((p) => p.team === drawer.team);
  return teammates.length ? teammates : others;
}

// Teams alternate turns: red, blue, red, blue…
function buildDrawerOrder(state: RoomState): string[] {
  if (state.mode !== 'teams') return state.players.map((p) => p.id);
  const red = state.players.filter((p) => p.team === 'red');
  const blue = state.players.filter((p) => p.team === 'blue');
  const order: string[] = [];
  for (let i = 0; i < Math.max(red.length, blue.length); i++) {
    if (red[i]) order.push(red[i]!.id);
    if (blue[i]) order.push(blue[i]!.id);
  }
  return order;
}

function idleDelayMs(state: RoomState): number {
  return Math.min(20, Math.max(10, Math.floor(state.drawTime / 3))) * 1_000;
}

export class GameService {
  constructor(private readonly dao: GameDAO) {}

  /** Returns an error message, or null if the game started. */
  async startGame(code: string, io: Server): Promise<string | null> {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'WAITING') return 'Game cannot be started';

    if (state.players.length < 2) return 'Need at least 2 players to start';
    if (state.mode === 'teams' && state.players.length < MIN_TEAMS_PLAYERS) {
      return `Teams mode needs at least ${MIN_TEAMS_PLAYERS} players`;
    }

    state.status = 'IN_PROGRESS';
    if (state.id) {
      const game = await this.dao.createGame(state.id);
      state.gameId = String(game.id);
    }
    if (state.mode === 'teams') {
      shuffle(state.players).forEach((p, i) => { p.team = i % 2 === 0 ? 'red' : 'blue'; });
    }
    state.currentRound = 1;
    state.drawerOrder = buildDrawerOrder(state);
    state.drawerIndex = 0;
    state.usedWords = [];
    state.afkStrikes = {};

    await roomService.setRoomState(state);
    if (state.id) await roomDAO.updateStatus(code, 'IN_PROGRESS');

    io.to(code).emit('room:updated', sanitizeState(state, ''));
    io.to(code).emit('game:started', { round: 1, totalRounds: state.totalRounds });
    await this.beginRound(code, io);
    return null;
  }

  async beginRound(code: string, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS') return;

    state.players.forEach((p) => { p.hasGuessed = false; p.isDrawing = false; });

    const drawerId = state.drawerOrder[state.drawerIndex];
    if (!drawerId) { await this.advanceDrawer(code, io); return; }

    const drawerIdx = state.players.findIndex((p) => p.id === drawerId);
    if (drawerIdx === -1) {
      console.warn('[beginRound] drawer not found in players, advancing. drawerId:', drawerId, 'players:', state.players.map(p => p.id));
      await this.advanceDrawer(code, io);
      return;
    }

    state.players[drawerIdx]!.isDrawing = true;
    const words = state.mode === 'combination'
      ? getRandomCombinations(3, wordOptions(state))
      : getRandomWords(3, wordOptions(state));
    state.wordChoices = words;
    state.currentWord = '';
    state.currentWordHint = '';
    state.revealedIndices = [];
    state.roundStartedAt = 0;

    await roomService.setRoomState(state);
    await redis.del(DRAWN_KEY(code), REACTIONS_KEY(code));

    const drawer = state.players[drawerIdx]!;
    console.log('[beginRound] drawer:', drawer.username, 'socketId:', drawer.socketId, 'words:', words);
    io.to(code).emit('game:round-start', {
      round: state.currentRound,
      totalRounds: state.totalRounds,
      drawer: { id: drawer.id, username: drawer.username },
      drawTime: state.drawTime,
    });
    io.to(drawer.socketId).emit('game:word-choices', { words });
    await scheduleAutoWord(code, words, state.mode === 'speed' ? 5_000 : 10_000);
  }

  async handleAutoWord(code: string, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.currentWord || !state.wordChoices?.length) return;
    const word = state.wordChoices[Math.floor(Math.random() * state.wordChoices.length)]!;
    await this.setWord(code, word, io);
  }

  async setWord(code: string, word: string, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.currentWord) { console.warn('[setWord] skipped — no state or word already set'); return; }

    const autoWordJob = await gameQueue.getJob(`autoword-${code}`);
    if (autoWordJob) await autoWordJob.remove();

    state.currentWord = word;
    state.currentWordHint = getWordHint(word);
    state.wordChoices = [];
    state.roundStartedAt = Date.now();
    state.usedWords = [...(state.usedWords ?? []), ...word.split(COMBINATION_SEPARATOR)];

    await roomService.setRoomState(state);

    // Send the actual word only to the drawer; everyone else gets the masked hint
    const drawer = state.players.find((p) => p.isDrawing);
    if (drawer) io.to(drawer.socketId).emit('game:word-selected', { word });
    io.to(code).emit('game:hint', { hint: state.currentWordHint });

    const drawTimeMs = state.drawTime * 1_000;
    if (state.mode !== 'hidden') {
      const revealCount = Math.min(3, Math.max(1, Math.floor(countLetters(word) / 3)));
      const revealInterval = drawTimeMs / (revealCount + 1);
      for (let i = 1; i <= revealCount; i++) {
        await scheduleReveal(code, i, revealInterval * i);
      }
    }
    await scheduleIdleCheck(code, state.currentRound, state.drawerIndex, idleDelayMs(state));
    await scheduleEndRound(code, drawTimeMs);
  }

  async handleReveal(code: string, _revealNum: number, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS' || !state.currentWord) return;

    const { hint, newIndex } = revealLetter(state.currentWord, state.currentWordHint, state.revealedIndices);
    if (newIndex !== null) {
      state.currentWordHint = hint;
      state.revealedIndices.push(newIndex);
      await roomService.setRoomState(state);
      io.to(code).emit('game:hint', { hint });
    }
  }

  async markDrawn(code: string) {
    await redis.set(DRAWN_KEY(code), '1', 'EX', 600);
  }

  async handleIdleCheck(code: string, round: number, drawerIndex: number, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS' || !state.currentWord) return;
    if (state.currentRound !== round || state.drawerIndex !== drawerIndex) return;
    if (await redis.exists(DRAWN_KEY(code))) return;

    const drawer = state.players.find((p) => p.isDrawing);
    if (!drawer) return;

    const strikes = (state.afkStrikes?.[drawer.id] ?? 0) + 1;
    state.afkStrikes = { ...state.afkStrikes, [drawer.id]: strikes };
    await roomService.setRoomState(state);

    if (strikes >= MAX_AFK_STRIKES) {
      await this.kickPlayer(code, drawer.id, io, {
        reason: 'You were removed from the room for being inactive',
        announcement: `${drawer.username} was removed for being AFK`,
        ban: false,
      });
      return;
    }

    await announce(code, io, `${drawer.username} didn't draw anything — skipping their turn`);
    await this.endRound(code, io);
  }

  async handleGuess(code: string, playerId: string, text: string, io: Server): Promise<HandleGuessResult> {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS' || !state.currentWord) return 'wrong';

    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.isDrawing || player.hasGuessed) return 'wrong';

    const result = checkGuess(text, state.currentWord);
    const guessers = eligibleGuessers(state);
    if (!guessers.some((p) => p.id === playerId)) {
      // Opposing team: let them chat, but never let them leak the answer
      return result === 'wrong' ? 'wrong' : 'blocked';
    }
    if (result !== 'correct') return result;

    const elapsed = Math.floor((Date.now() - state.roundStartedAt) / 1_000);
    const timeLeft = Math.max(0, state.drawTime - elapsed);
    const score = Math.max(50, Math.round(500 * (timeLeft / state.drawTime)));

    player.hasGuessed = true;
    player.score += score;
    const drawer = state.players.find((p) => p.isDrawing);
    if (drawer) drawer.score += 50;

    await roomService.setRoomState(state);
    io.to(code).emit('game:guess-correct', {
      player: { id: player.id, username: player.username },
      score,
      timeLeft,
      scores: state.players.map((p) => ({ id: p.id, score: p.score })),
    });

    const guessMsg: ChatMessage = { playerId: player.id, username: player.username, text: '', isCorrect: true, isSystem: false, timestamp: Date.now() };
    await persistMessage(code, guessMsg);
    io.to(code).emit('game:message', guessMsg);

    if (eligibleGuessers(state).every((p) => p.hasGuessed)) {
      await this.endRound(code, io);
    }
    return 'correct';
  }

  async react(code: string, playerId: string, reaction: Reaction, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS' || !state.currentWord) return;
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.isDrawing) return;

    const prev = await redis.hget(REACTIONS_KEY(code), playerId);
    if (prev === reaction) return;
    await redis.hset(REACTIONS_KEY(code), playerId, reaction);
    await redis.expire(REACTIONS_KEY(code), 600);

    const all = await redis.hvals(REACTIONS_KEY(code));
    io.to(code).emit('game:reaction', {
      playerId,
      username: player.username,
      reaction,
      likes: all.filter((r) => r === 'like').length,
      dislikes: all.filter((r) => r === 'dislike').length,
    });
  }

  async endRound(code: string, io: Server) {
    await clearGameJobs(code);
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS') return;

    // Timer job, last guess, idle skip and drawer leaving can all race to end the same turn
    const locked = await redis.set(ROUND_END_LOCK(code, state.currentRound, state.drawerIndex), '1', 'EX', 30, 'NX');
    if (!locked) return;

    if (state.currentWord) {
      const roundEndScores = state.players.map((p) => ({ id: p.id, username: p.username, score: p.score }));
      io.to(code).emit('game:round-end', { word: state.currentWord, scores: roundEndScores });
      await announce(code, io, `The word was: ${state.currentWord}`);
    }

    await new Promise<void>((r) => setTimeout(r, state.currentWord ? 4_000 : 1_500));
    await this.advanceDrawer(code, io);
  }

  /**
   * Removes a player from the room and keeps the game consistent: transfers host,
   * skips the turn if they were drawing, ends the round if everyone left has guessed,
   * and ends the game if fewer than 2 players remain.
   */
  async removePlayer(code: string, playerId: string, io: Server, announcement?: string) {
    const state = await roomService.getRoomState(code);
    if (!state) return;

    const playerIdx = state.players.findIndex((p) => p.id === playerId);
    if (playerIdx === -1) return;
    const player = state.players[playerIdx]!;

    if (player.isHost) {
      const next = state.players.find((_, i) => i !== playerIdx);
      if (next) { next.isHost = true; state.hostId = next.id; }
    }

    state.players.splice(playerIdx, 1);

    const kickVotes: Record<string, string[]> = {};
    for (const [target, voters] of Object.entries(state.kickVotes ?? {})) {
      if (target !== playerId) kickVotes[target] = voters.filter((v) => v !== playerId);
    }
    state.kickVotes = kickVotes;

    await roomService.setRoomState(state);

    if (state.players.length === 0) {
      await clearGameJobs(code);
      return;
    }

    io.to(code).emit('room:updated', sanitizeState(state, ''));
    if (state.status !== 'IN_PROGRESS') {
      if (announcement) await announce(code, io, announcement);
      return;
    }

    await announce(code, io, announcement ?? `${player.username} left the game`);

    if (state.players.length < 2) {
      await clearGameJobs(code);
      await this.endGame(code, io, state);
    } else if (player.isDrawing) {
      await this.endRound(code, io);
    } else if (state.currentWord && eligibleGuessers(state).every((p) => p.hasGuessed)) {
      await this.endRound(code, io);
    }
  }

  async kickPlayer(
    code: string,
    targetId: string,
    io: Server,
    opts: { reason: string; announcement: string; ban: boolean },
  ) {
    const state = await roomService.getRoomState(code);
    const target = state?.players.find((p) => p.id === targetId);
    if (!state || !target) return;

    if (opts.ban) {
      state.bannedIds = [...new Set([...(state.bannedIds ?? []), targetId])];
      await roomService.setRoomState(state);
    }

    io.to(target.socketId).emit('room:kicked', { reason: opts.reason });
    io.in(target.socketId).socketsLeave(code);
    await redis.del(SOCKET_ROOM_KEY(target.socketId), SOCKET_PID_KEY(target.socketId));
    await this.removePlayer(code, targetId, io, opts.announcement);
  }

  async voteKick(code: string, voterId: string, targetId: string, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || voterId === targetId) return;
    const voter = state.players.find((p) => p.id === voterId);
    const target = state.players.find((p) => p.id === targetId);
    if (!voter || !target) return;

    const votes = state.kickVotes?.[targetId] ?? [];
    if (votes.includes(voterId)) return;
    votes.push(voterId);

    // Strict majority of everyone else, and never fewer than 2 votes
    const required = Math.max(2, Math.floor((state.players.length - 1) / 2) + 1);

    if (votes.length >= required) {
      const { [targetId]: _, ...rest } = state.kickVotes ?? {};
      state.kickVotes = rest;
      await roomService.setRoomState(state);
      await this.kickPlayer(code, targetId, io, {
        reason: 'You were vote-kicked from the room',
        announcement: `${target.username} was vote-kicked`,
        ban: true,
      });
      return;
    }

    state.kickVotes = { ...state.kickVotes, [targetId]: votes };
    await roomService.setRoomState(state);
    io.to(code).emit('room:updated', sanitizeState(state, ''));
    await announce(code, io, `${voter.username} voted to kick ${target.username} (${votes.length}/${required})`);
  }

  private async advanceDrawer(code: string, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS') return;

    if (state.players.length < 2) {
      await this.endGame(code, io, state);
      return;
    }

    state.drawerIndex++;
    if (state.drawerIndex >= state.drawerOrder.length) {
      state.currentRound++;
      state.drawerIndex = 0;
      state.drawerOrder = buildDrawerOrder(state);
    }

    if (state.currentRound > state.totalRounds || state.drawerOrder.length === 0) {
      await this.endGame(code, io, state);
      return;
    }

    await roomService.setRoomState(state);
    await this.beginRound(code, io);
  }

  private async endGame(code: string, io: Server, state: RoomState) {
    state.status = 'ENDED';
    await roomService.setRoomState(state);

    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0]!;

    let teams: { red: number; blue: number; winner: Team | 'tie' } | undefined;
    let winnerIds = [winner.id];
    if (state.mode === 'teams') {
      const total = (team: Team) => state.players.filter((p) => p.team === team).reduce((sum, p) => sum + p.score, 0);
      const red = total('red');
      const blue = total('blue');
      const winningTeam = red === blue ? 'tie' : red > blue ? 'red' : 'blue';
      teams = { red, blue, winner: winningTeam };
      if (winningTeam !== 'tie') winnerIds = state.players.filter((p) => p.team === winningTeam).map((p) => p.id);
    }

    if (state.gameId && state.id) {
      await this.dao.endGame(state.gameId);
      await this.dao.persistScores(state, winnerIds);
      await roomDAO.updateStatusById(state.id, 'ENDED');
    }

    io.to(code).emit('game:ended', {
      scores: sorted.map((p) => ({ id: p.id, username: p.username, score: p.score })),
      winner: { id: winner.id, username: winner.username, score: winner.score },
      teams,
    });
  }
}

export const gameService = new GameService(gameDAO);
