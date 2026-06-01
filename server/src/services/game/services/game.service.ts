import type { Server } from 'socket.io';
import { gameDAO, type GameDAO } from '../dao/game.dao';
import { roomService } from '../../room/services/room.service';
import { getRandomWords, getWordHint, revealLetter } from '../../../shared/utils/words';
import {
  gameQueue,
  scheduleAutoWord,
  scheduleEndRound,
  scheduleReveal,
  clearGameJobs,
} from '../queue/game.queue';
import { roomDAO } from '../../room/dao/room.dao';
import type { RoomState } from '../../../shared/types';

export class GameService {
  constructor(private readonly dao: GameDAO) {}

  async startGame(code: string, io: Server): Promise<boolean> {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'WAITING') return false;

    const connected = state.players.filter((p) => p.connected);
    if (connected.length < 2) return false;

    const game = await this.dao.createGame(state.id);

    state.status = 'IN_PROGRESS';
    state.gameId = String(game.id); // int → string at app boundary
    state.currentRound = 1;
    state.drawerOrder = connected.map((p) => p.id);
    state.drawerIndex = 0;

    await roomService.setRoomState(state);
    await roomDAO.updateStatus(code, 'IN_PROGRESS');

    io.to(code).emit('game:started', { round: 1, totalRounds: state.totalRounds });
    await this.beginRound(code, io);
    return true;
  }

  async beginRound(code: string, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS') return;

    state.players.forEach((p) => { p.hasGuessed = false; p.isDrawing = false; });

    const drawerId = state.drawerOrder[state.drawerIndex];
    if (!drawerId) { await this.advanceDrawer(code, io); return; }

    const drawerIdx = state.players.findIndex((p) => p.id === drawerId);
    if (drawerIdx === -1 || !state.players[drawerIdx]?.connected) {
      await this.advanceDrawer(code, io);
      return;
    }

    state.players[drawerIdx]!.isDrawing = true;
    const words = getRandomWords(3);
    state.wordChoices = words;
    state.currentWord = '';
    state.currentWordHint = '';
    state.revealedIndices = [];
    state.roundStartedAt = 0;

    await roomService.setRoomState(state);

    const drawer = state.players[drawerIdx]!;
    io.to(code).emit('game:round-start', {
      round: state.currentRound,
      totalRounds: state.totalRounds,
      drawer: { id: drawer.id, username: drawer.username },
      drawTime: state.drawTime,
    });
    io.to(drawer.socketId).emit('game:word-choices', { words });
    await scheduleAutoWord(code, words);
  }

  async handleAutoWord(code: string, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.currentWord) return;
    const word = state.wordChoices[Math.floor(Math.random() * state.wordChoices.length)]!;
    await this.setWord(code, word, io);
  }

  async setWord(code: string, word: string, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.currentWord) return;

    const autoWordJob = await gameQueue.getJob(`auto-word:${code}`);
    if (autoWordJob) await autoWordJob.remove();

    state.currentWord = word;
    state.currentWordHint = getWordHint(word);
    state.wordChoices = [];
    state.roundStartedAt = Date.now();

    await roomService.setRoomState(state);
    io.to(code).emit('game:hint', { hint: state.currentWordHint });

    const drawTimeMs = state.drawTime * 1_000;
    const letterCount = word.replace(/ /g, '').length;
    const revealCount = Math.min(3, Math.max(1, Math.floor(letterCount / 3)));
    const revealInterval = drawTimeMs / (revealCount + 1);

    for (let i = 1; i <= revealCount; i++) {
      await scheduleReveal(code, i, revealInterval * i);
    }
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

  async handleGuess(code: string, playerId: string, text: string, io: Server): Promise<boolean> {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS' || !state.currentWord) return false;

    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.isDrawing || player.hasGuessed) return false;
    if (text.trim().toLowerCase() !== state.currentWord.toLowerCase()) return false;

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

    const allGuessed = state.players.filter((p) => !p.isDrawing && p.connected).every((p) => p.hasGuessed);
    if (allGuessed) {
      await clearGameJobs(code);
      await this.endRound(code, io);
    }
    return true;
  }

  async endRound(code: string, io: Server) {
    await clearGameJobs(code);
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS') return;

    io.to(code).emit('game:round-end', {
      word: state.currentWord,
      scores: state.players.map((p) => ({ id: p.id, username: p.username, score: p.score })),
    });

    await new Promise<void>((r) => setTimeout(r, 4_000));
    await this.advanceDrawer(code, io);
  }

  private async advanceDrawer(code: string, io: Server) {
    const state = await roomService.getRoomState(code);
    if (!state || state.status !== 'IN_PROGRESS') return;

    state.drawerIndex++;
    if (state.drawerIndex >= state.drawerOrder.length) {
      state.currentRound++;
      state.drawerIndex = 0;
      state.drawerOrder = state.players.filter((p) => p.connected).map((p) => p.id);
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

    if (state.gameId) {
      await this.dao.endGame(state.gameId);
      await this.dao.persistScores(state, winner.id);
      await roomDAO.updateStatusById(state.id, 'ENDED');
    }

    io.to(code).emit('game:ended', {
      scores: sorted.map((p) => ({ id: p.id, username: p.username, score: p.score })),
      winner: { id: winner.id, username: winner.username, score: winner.score },
    });
  }
}

export const gameService = new GameService(gameDAO);
