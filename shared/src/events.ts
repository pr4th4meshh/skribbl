import type { DrawData, RoomState, ChatMessage } from './schemas.js';

export const CLIENT_EVENTS = {
  ROOM_JOIN:        'room:join',
  GAME_START:       'game:start',
  GAME_SELECT_WORD: 'game:select-word',
  GAME_DRAW:        'game:draw',
  GAME_CLEAR:       'game:clear',
  GAME_GUESS:       'game:guess',
  CHAT_MESSAGE:     'chat:message',
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
  GAME_MESSAGE:      'game:message',
  GAME_GUESS_CORRECT:'game:guess-correct',
  GAME_ROUND_END:    'game:round-end',
  GAME_ENDED:        'game:ended',
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
  }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomCode: string; username?: string }) => void;
  'game:start': () => void;
  'game:select-word': (data: { word: string }) => void;
  'game:draw': (data: DrawData) => void;
  'game:clear': () => void;
  'game:guess': (data: { text: string }) => void;
  'chat:message': (data: { text: string }) => void;
}
