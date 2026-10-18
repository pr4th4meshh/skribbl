import type { DrawData, RoomState, ChatMessage, Reaction, Team, RoomSettings } from './schemas.js';

export const CLIENT_EVENTS = {
  ROOM_JOIN:        'room:join',
  GAME_START:       'game:start',
  GAME_SELECT_WORD: 'game:select-word',
  GAME_DRAW:        'game:draw',
  GAME_CLEAR:       'game:clear',
  GAME_UNDO:        'game:undo',
  GAME_REDO:        'game:redo',
  GAME_GUESS:       'game:guess',
  CHAT_MESSAGE:     'chat:message',
  ROOM_KICK:        'room:kick',
  ROOM_VOTE_KICK:   'room:vote-kick',
  GAME_REACT:       'game:react',
  ROOM_UPDATE_SETTINGS: 'room:update-settings',
} as const;

export const SERVER_EVENTS = {
  ROOM_JOINED:       'room:joined',
  ROOM_UPDATED:      'room:updated',
  GAME_STARTED:      'game:started',
  GAME_ROUND_START:  'game:round-start',
  GAME_WORD_CHOICES: 'game:word-choices',
  GAME_WORD_SELECTED:'game:word-selected',
  GAME_HINT:         'game:hint',
  GAME_DRAW:         'game:draw',
  GAME_CLEAR:        'game:clear',
  GAME_CANVAS_SYNC:  'game:canvas-sync',
  GAME_MESSAGE:      'game:message',
  GAME_GUESS_CORRECT:'game:guess-correct',
  GAME_ROUND_END:    'game:round-end',
  GAME_ENDED:        'game:ended',
  GAME_NOTICE:       'game:notice',
  GAME_REACTION:     'game:reaction',
  ROOM_KICKED:       'room:kicked',
  ERROR:             'error',
} as const;

// socket.io typed event interfaces below
export interface ServerToClientEvents {
  'room:joined': (data: {
    code: string;
    playerId: string;
    state: RoomState;
    messages: ChatMessage[];
  }) => void;
  'room:updated': (state: RoomState) => void;
  'game:started': (data: { round: number; totalRounds: number }) => void;
  'game:round-start': (data: {
    round: number;
    totalRounds: number;
    drawer: { id: string; username: string };
    drawTime: number;
  }) => void;
  'game:word-choices': (data: { words: string[] }) => void;
  'game:word-selected': (data: { word: string }) => void;
  'game:hint': (data: { hint: string }) => void;
  'game:draw': (data: DrawData) => void;
  'game:clear': () => void;
  // Full stroke list after an undo/redo; clients redraw from scratch
  'game:canvas-sync': (data: { strokes: DrawData[]; canUndo: boolean; canRedo: boolean }) => void;
  'game:message': (msg: ChatMessage) => void;
  'game:guess-correct': (data: {
    player: { id: string; username: string };
    score: number;
    timeLeft: number;
    scores: { id: string; score: number }[];
  }) => void;
  'game:round-end': (data: {
    word: string;
    scores: { id: string; username: string; score: number }[];
  }) => void;
  'game:ended': (data: {
    scores: { id: string; username: string; score: number }[];
    winner: { id: string; username: string; score: number };
    teams?: { red: number; blue: number; winner: Team | 'tie' };
  }) => void;
  // Private message shown only to the receiving player (close guesses, warnings)
  'game:notice': (data: { message: string }) => void;
  'game:reaction': (data: {
    playerId: string;
    username: string;
    reaction: Reaction;
    likes: number;
    dislikes: number;
  }) => void;
  'room:kicked': (data: { reason: string }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomCode: string; username?: string }) => void;
  'game:start': () => void;
  'game:select-word': (data: { word: string }) => void;
  'game:draw': (data: DrawData) => void;
  'game:clear': () => void;
  'game:undo': () => void;
  'game:redo': () => void;
  'game:guess': (data: { text: string }) => void;
  'chat:message': (data: { text: string }) => void;
  'room:kick': (data: { playerId: string }) => void;
  'room:vote-kick': (data: { playerId: string }) => void;
  'game:react': (data: { reaction: Reaction }) => void;
  'room:update-settings': (data: RoomSettings) => void;
}
