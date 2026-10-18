import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import type { RefObject } from 'react'
import { SERVER_EVENTS, CLIENT_EVENTS } from '@skribbl/shared'
import type { DrawData, ApiResponse, Reaction, Team, RoomSettings } from '@/types'
import type { CanvasHandle } from '@/components/game/Canvas'
import { useAuthStore } from '@/stores/auth.store'
import { useGameStore } from '@/stores/game.store'
import { api } from '@/lib/axios'
import { playSound } from '@/utils/sounds'
import type { ClientSocket } from '.'

const SOCKET_URL = (import.meta.env['VITE_SOCKET_URL'] as string | undefined) ?? 'http://localhost:6969'

export interface GameEndData {
  scores: { id: string; username: string; score: number }[]
  winner: { id: string; username: string; score: number }
  teams?: { red: number; blue: number; winner: Team | 'tie' }
}

export interface ReactionState {
  likes: number
  dislikes: number
  mine: Reaction | null
  // Bumped on every incoming reaction so the UI can replay its pop animation
  last: { reaction: Reaction; username: string; key: number } | null
}

const EMPTY_REACTIONS: ReactionState = { likes: 0, dislikes: 0, mine: null, last: null }

export interface RoundOverData {
  word: string
  round: number
  scores: { id: string; username: string; score: number; roundScore: number }[]
}

export interface Drawing {
  round: number
  drawer: string
  word: string
  image: string
}

let socket: ClientSocket | null = null

export function useRoomSocket(roomCode: string, canvasRef: RefObject<CanvasHandle | null>) {
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()
  const { setRoomState, patchRoomState, addMessage, setMessages, setPlayerId } = useGameStore()

  const [error, setError] = useState('')
  const [wordChoices, setWordChoices] = useState<string[]>([])
  const [gameOver, setGameOver] = useState<GameEndData | null>(null)
  const [roundOver, setRoundOver] = useState<RoundOverData | null>(null)
  const [timer, setTimer] = useState(0)
  const [reactions, setReactions] = useState<ReactionState>(EMPTY_REACTIONS)
  const [drawings, setDrawings] = useState<Drawing[]>([])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const drawTimeRef = useRef(0)
  const timerStartedRef = useRef(false)

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setTimer(0)
  }, [])

  // Count down the last ten seconds, louder for the final three
  useEffect(() => {
    if (timer > 0 && timer <= 10) playSound(timer <= 3 ? 'tickFinal' : 'tick')
  }, [timer])

  const startTimer = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimer(seconds)
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          return 0
        }
        return t - 1
      })
    }, 1000)
  }, [])

  const connect = useCallback((username?: string): Promise<void> => {
    if (socket?.connected) return Promise.resolve()

    return new Promise<void>((resolve, reject) => {
      socket = io(SOCKET_URL, {
        auth: accessToken ? { token: accessToken } : {},
        reconnection: false,
      }) as ClientSocket

      let refreshing = false

      // Re-emit room:join on every (re)connect so token refresh works transparently
      socket.on('connect', () => {
        socket!.emit(CLIENT_EVENTS.ROOM_JOIN, { roomCode, username })
      })

      socket.on('connect_error', (err: Error) => {
        if (err.message !== 'Invalid token' || refreshing) {
          reject(err)
          return
        }
        refreshing = true
        const { refreshToken, setAuth, clearAuth, user } = useAuthStore.getState()
        if (!refreshToken) {
          clearAuth()
          navigate('/login')
          reject(err)
          return
        }
        api
          .post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken })
          .then((res) => {
            const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data
            setAuth(user!, newAccess, newRefresh)
            socket!.auth = { token: newAccess }
            socket!.connect()
          })
          .catch(() => {
            clearAuth()
            navigate('/login')
            reject(err)
          })
          .finally(() => { refreshing = false })
      })

      // Resolve once server confirms the join
      let resolved = false
      socket.on(SERVER_EVENTS.ROOM_JOINED, (data) => {
        setPlayerId(data.playerId)
        setRoomState(data.state)
        if (data.messages?.length) setMessages(data.messages)
        if (!resolved) { resolved = true; resolve() }
      })

      socket.on(SERVER_EVENTS.ROOM_UPDATED, (state) => {
        setRoomState(state)
      })

      socket.on(SERVER_EVENTS.GAME_STARTED, ({ round, totalRounds }) => {
        setDrawings([])
        patchRoomState({ status: 'IN_PROGRESS', currentRound: round, totalRounds })
      })

      socket.on(SERVER_EVENTS.GAME_ROUND_START, ({ round, totalRounds, drawer, drawTime }) => {
        setRoundOver(null)
        setReactions(EMPTY_REACTIONS)
        drawTimeRef.current = drawTime
        timerStartedRef.current = false
        stopTimer()
        const curr = useGameStore.getState().roomState
        if (curr) {
          patchRoomState({
            currentRound: round,
            totalRounds,
            currentWord: '',
            currentWordHint: '',
            wordChoices: [],
            players: curr.players.map((p) => ({
              ...p,
              isDrawing: p.id === drawer.id,
              hasGuessed: false,
            })),
          })
        }
        canvasRef.current?.clearCanvas()
      })

      socket.on(SERVER_EVENTS.GAME_WORD_CHOICES, ({ words }) => {
        playSound('yourTurn')
        setWordChoices(words)
      })

      socket.on(SERVER_EVENTS.GAME_WORD_SELECTED, ({ word }) => {
        // Server may have auto-picked for us — close the picker either way
        setWordChoices([])
        patchRoomState({ currentWord: word })
      })

      socket.on(SERVER_EVENTS.GAME_HINT, ({ hint }) => {
        patchRoomState({ currentWordHint: hint })
        if (!timerStartedRef.current) {
          timerStartedRef.current = true
          startTimer(drawTimeRef.current)
        }
      })

      socket.on(SERVER_EVENTS.GAME_DRAW, (data) => {
        canvasRef.current?.applyDraw(data)
      })

      socket.on(SERVER_EVENTS.GAME_CLEAR, () => {
        canvasRef.current?.clearCanvas()
      })

      socket.on(SERVER_EVENTS.GAME_CANVAS_SYNC, (sync) => {
        canvasRef.current?.syncCanvas(sync)
      })

      socket.on(SERVER_EVENTS.GAME_MESSAGE, (msg) => {
        addMessage(msg)
      })

      socket.on(SERVER_EVENTS.GAME_GUESS_CORRECT, ({ player, scores }) => {
        playSound('correct')
        const curr = useGameStore.getState().roomState
        if (curr) {
          patchRoomState({
            players: curr.players.map((p) => ({
              ...p,
              score: scores.find((s) => s.id === p.id)?.score ?? p.score,
              hasGuessed: p.id === player.id ? true : p.hasGuessed,
            })),
          })
        }
      })

      socket.on(SERVER_EVENTS.GAME_ROUND_END, ({ word, scores }) => {
        stopTimer()
        const curr = useGameStore.getState().roomState
        const roundScores = scores.map((s) => ({
          ...s,
          roundScore: s.score - (curr?.players.find((p) => p.id === s.id)?.score ?? 0),
        }))
        setRoundOver({ word, round: curr?.currentRound ?? 0, scores: roundScores })
        // Capture the finished drawing before the next round clears the canvas
        const image = canvasRef.current?.snapshot()
        const drawer = curr?.players.find((p) => p.isDrawing)
        if (image) {
          setDrawings((d) => [...d, { round: curr?.currentRound ?? 0, drawer: drawer?.username ?? '', word, image }])
        }
        if (curr) {
          patchRoomState({
            currentWord: word,
            players: curr.players.map((p) => ({
              ...p,
              score: scores.find((s) => s.id === p.id)?.score ?? p.score,
            })),
          })
        }
      })

      socket.on(SERVER_EVENTS.GAME_ENDED, (data) => {
        stopTimer()
        setGameOver(data)
      })

      socket.on(SERVER_EVENTS.GAME_NOTICE, ({ message }) => {
        addMessage({ playerId: '', username: '', text: message, isCorrect: false, isSystem: false, timestamp: Date.now(), kind: 'close' })
      })

      socket.on(SERVER_EVENTS.GAME_REACTION, ({ playerId: reactorId, username, reaction, likes, dislikes }) => {
        const isMine = reactorId === useGameStore.getState().playerId
        setReactions((r) => ({
          likes,
          dislikes,
          mine: isMine ? reaction : r.mine,
          last: { reaction, username, key: (r.last?.key ?? 0) + 1 },
        }))
      })

      socket.on(SERVER_EVENTS.ROOM_KICKED, ({ reason }) => {
        setError(reason)
        socket?.disconnect()
      })

      socket.on(SERVER_EVENTS.ERROR, ({ message }) => {
        setError(message)
      })
    })
  }, [accessToken, roomCode, setRoomState, patchRoomState, addMessage, setMessages, setPlayerId, startTimer, stopTimer, navigate, canvasRef])

  const disconnect = useCallback(() => {
    socket?.disconnect()
    socket = null
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const startGame = useCallback(() => {
    socket?.emit(CLIENT_EVENTS.GAME_START)
  }, [])

  const sendDraw = useCallback((data: DrawData) => {
    socket?.emit(CLIENT_EVENTS.GAME_DRAW, data)
  }, [])

  const sendClear = useCallback(() => {
    socket?.emit(CLIENT_EVENTS.GAME_CLEAR)
    canvasRef.current?.clearCanvas()
  }, [canvasRef])

  const undo = useCallback(() => {
    socket?.emit(CLIENT_EVENTS.GAME_UNDO)
  }, [])

  const redo = useCallback(() => {
    socket?.emit(CLIENT_EVENTS.GAME_REDO)
  }, [])

  const updateSettings = useCallback((settings: RoomSettings) => {
    socket?.emit(CLIENT_EVENTS.ROOM_UPDATE_SETTINGS, settings)
  }, [])

  const selectWord = useCallback((word: string) => {
    socket?.emit(CLIENT_EVENTS.GAME_SELECT_WORD, { word })
  }, [])

  const sendMessage = useCallback((text: string, isDrawer: boolean) => {
    const state = useGameStore.getState().roomState
    if (state?.status === 'IN_PROGRESS' && state.currentWordHint && !isDrawer) {
      socket?.emit(CLIENT_EVENTS.GAME_GUESS, { text })
    } else {
      socket?.emit(CLIENT_EVENTS.CHAT_MESSAGE, { text })
    }
  }, [])

  const kickPlayer = useCallback((playerId: string) => {
    socket?.emit(CLIENT_EVENTS.ROOM_KICK, { playerId })
  }, [])

  const voteKick = useCallback((playerId: string) => {
    socket?.emit(CLIENT_EVENTS.ROOM_VOTE_KICK, { playerId })
  }, [])

  const react = useCallback((reaction: Reaction) => {
    socket?.emit(CLIENT_EVENTS.GAME_REACT, { reaction })
  }, [])

  return {
    connect,
    disconnect,
    error,
    timer,
    wordChoices,
    clearWordChoices: () => setWordChoices([]),
    gameOver,
    roundOver,
    drawings,
    startGame,
    sendDraw,
    sendClear,
    undo,
    redo,
    updateSettings,
    selectWord,
    sendMessage,
    reactions,
    react,
    kickPlayer,
    voteKick,
  }
}
