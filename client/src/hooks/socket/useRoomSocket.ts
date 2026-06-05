import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import type { RefObject } from 'react'
import { SERVER_EVENTS, CLIENT_EVENTS } from '@skribbl/shared'
import type { DrawData, ApiResponse } from '@/types'
import type { CanvasHandle } from '@/components/game/Canvas'
import { useAuthStore } from '@/stores/auth.store'
import { useGameStore } from '@/stores/game.store'
import { api } from '@/lib/axios'
import type { ClientSocket } from '.'

const SOCKET_URL = (import.meta.env['VITE_SOCKET_URL'] as string | undefined) ?? 'http://localhost:6969'

export interface GameEndData {
  scores: { id: string; username: string; score: number }[]
  winner: { id: string; username: string; score: number }
}

export interface RoundOverData {
  word: string
  round: number
  scores: { id: string; username: string; score: number }[]
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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const drawTimeRef = useRef(0)
  const timerStartedRef = useRef(false)

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setTimer(0)
  }, [])

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
        patchRoomState({ status: 'IN_PROGRESS', currentRound: round, totalRounds })
      })

      socket.on(SERVER_EVENTS.GAME_ROUND_START, ({ round, totalRounds, drawer, drawTime }) => {
        setRoundOver(null)
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
        setWordChoices(words)
      })

      socket.on(SERVER_EVENTS.GAME_WORD_SELECTED, ({ word }) => {
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

      socket.on(SERVER_EVENTS.GAME_MESSAGE, (msg) => {
        addMessage(msg)
      })

      socket.on(SERVER_EVENTS.GAME_GUESS_CORRECT, ({ player, scores }) => {
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
        setRoundOver({ word, round: useGameStore.getState().roomState?.currentRound ?? 0, scores })
        const curr = useGameStore.getState().roomState
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

  return {
    connect,
    disconnect,
    error,
    timer,
    wordChoices,
    clearWordChoices: () => setWordChoices([]),
    gameOver,
    roundOver,
    startGame,
    sendDraw,
    sendClear,
    selectWord,
    sendMessage,
  }
}
