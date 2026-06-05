import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.store'
import { useGameStore } from '@/stores/game.store'
import { Canvas, type CanvasHandle } from '@/components/game/Canvas'
import { Chat } from '@/components/game/Chat'
import { PlayerList } from '@/components/game/PlayerList'
import { WordChoices } from '@/components/game/WordChoices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/axios'
import { cn } from '@/lib/utils'
import type { DrawData, RoomState, ChatMessage, Player, ApiResponse } from '@/types'

const SOCKET_URL = (import.meta.env['VITE_SOCKET_URL'] as string | undefined) ?? 'http://localhost:6969'

interface GameEndData {
  scores: { id: string; username: string; score: number }[]
  winner: { id: string; username: string; score: number }
}

export function Room() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, accessToken } = useAuthStore()
  const { setSocket, clearSocket, reset, setRoomState, patchRoomState, addMessage, setMessages, setPlayerId, playerId, roomState, messages } =
    useGameStore()

  const canvasRef = useRef<CanvasHandle>(null)
  const [wordChoices, setWordChoices] = useState<string[]>([])
  const [gameOver, setGameOver] = useState<GameEndData | null>(null)
  const [roundOver, setRoundOver] = useState<{ word: string; round: number; scores: { id: string; username: string; score: number }[] } | null>(null)
  const [error, setError] = useState('')
  const [timer, setTimer] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const drawTimeRef = useRef(0)
  const timerStartedRef = useRef(false)
  const [guestUsername, setGuestUsername] = useState('')
  const [showGuestDialog, setShowGuestDialog] = useState(!user)

  const roomCode = code?.toUpperCase() ?? ''

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

  const joinRoom = useCallback(
    (username?: string) => {
      const socket = io(SOCKET_URL, {
        auth: accessToken ? { token: accessToken } : {},
        reconnection: false,
      })
      setSocket(socket)

      socket.on('connect', () => {
        socket.emit('room:join', { roomCode, username })
      })

      let refreshing = false
      socket.on('connect_error', (err: Error) => {
        if (err.message !== 'Invalid token' || refreshing) return
        refreshing = true

        const { refreshToken, setAuth, clearAuth, user } = useAuthStore.getState()
        if (!refreshToken) {
          clearAuth()
          navigate('/login')
          return
        }

        api
          .post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken })
          .then((res) => {
            const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data
            setAuth(user!, newAccess, newRefresh)
            socket.auth = { token: newAccess }
            socket.connect()
          })
          .catch(() => {
            clearAuth()
            navigate('/login')
          })
          .finally(() => { refreshing = false })
      })

      socket.on('room:joined', ({ playerId: pid, state, messages: msgs }: { playerId: string; state: RoomState; messages: ChatMessage[] }) => {
        setPlayerId(pid)
        setRoomState(state)
        if (msgs?.length) setMessages(msgs)
      })

      socket.on('room:updated', (state: RoomState) => setRoomState(state))

      socket.on('game:started', ({ round, totalRounds }: { round: number; totalRounds: number }) => {
        patchRoomState({ status: 'IN_PROGRESS', currentRound: round, totalRounds })
      })

      socket.on(
        'game:round-start',
        ({ round, totalRounds, drawer, drawTime }: { round: number; totalRounds: number; drawer: { id: string; username: string }; drawTime: number }) => {
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
        },
      )

      socket.on('game:word-choices', ({ words }: { words: string[] }) => {
        setWordChoices(words)
      })

      socket.on('game:word-selected', ({ word }: { word: string }) => {
        patchRoomState({ currentWord: word })
      })

      socket.on('game:hint', ({ hint }: { hint: string }) => {
        patchRoomState({ currentWordHint: hint })
        if (!timerStartedRef.current) {
          timerStartedRef.current = true
          startTimer(drawTimeRef.current)
        }
      })

      socket.on('game:draw', (data: DrawData) => {
        canvasRef.current?.applyDraw(data)
      })

      socket.on('game:clear', () => {
        canvasRef.current?.clearCanvas()
      })

      socket.on('game:message', (msg: ChatMessage) => {
        addMessage(msg)
      })

      socket.on(
        'game:guess-correct',
        ({ player, scores }: { player: Player; score: number; timeLeft: number; scores: { id: string; score: number }[] }) => {
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
        },
      )

      socket.on(
        'game:round-end',
        ({ word, scores }: { word: string; scores: { id: string; username: string; score: number }[] }) => {
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
        },
      )

      socket.on('game:ended', (data: GameEndData) => {
        stopTimer()
        setGameOver(data)
      })

      socket.on('error', ({ message }: { message: string }) => {
        setError(message)
      })
    },
    [accessToken, roomCode, setSocket, setPlayerId, setRoomState, patchRoomState, addMessage, setMessages, startTimer, stopTimer, navigate],
  )

  useEffect(() => {
    reset()
    if (user) joinRoom()
    return () => {
      clearSocket()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const socket = useGameStore((s) => s.socket)
  const currentPlayer = roomState?.players.find((p) => p.id === playerId) ?? null
  const isDrawer = currentPlayer?.isDrawing ?? false
  const isHost = currentPlayer?.isHost ?? false

  const sendDraw = useCallback((data: DrawData) => socket?.emit('game:draw', data), [socket])
  const sendClear = useCallback(() => { socket?.emit('game:clear'); canvasRef.current?.clearCanvas() }, [socket])
  const selectWord = useCallback((word: string) => { socket?.emit('game:select-word', { word }); setWordChoices([]) }, [socket])
  const sendMessage = useCallback(
    (text: string) => {
      if (!socket) return
      const state = useGameStore.getState().roomState
      if (state?.status === 'IN_PROGRESS' && state.currentWordHint && !isDrawer) {
        socket.emit('game:guess', { text })
      } else {
        socket.emit('chat:message', { text })
      }
    },
    [socket, isDrawer],
  )

  // Guest prompt
  if (showGuestDialog && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-3xl font-black tracking-tight">skribbl</span>
            <span className="text-2xl ml-1.5">✏️</span>
            <p className="text-sm text-muted-foreground mt-2">Join as guest to play</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your username</label>
              <Input
                value={guestUsername}
                onChange={(e) => setGuestUsername(e.target.value)}
                placeholder="Pick a cool name…"
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && guestUsername.trim()) {
                    setShowGuestDialog(false)
                    joinRoom(guestUsername.trim())
                  }
                }}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!guestUsername.trim()) return
                setShowGuestDialog(false)
                joinRoom(guestUsername.trim())
              }}
            >
              Join room
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-5">
            or{' '}
            <button className="text-primary font-medium hover:underline" onClick={() => navigate('/login')}>log in</button>
            {' '}for full access
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-4xl">😕</p>
          <p className="text-lg font-semibold">{error}</p>
          <Button onClick={() => navigate('/')}>Back to home</Button>
        </div>
      </div>
    )
  }

  if (!roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm">Connecting…</p>
      </div>
    )
  }

  const chatDisabled = isDrawer && roomState.status === 'IN_PROGRESS' && !!roomState.currentWordHint
  const timerCritical = timer > 0 && timer <= 10
  const timerWarning = timer > 10 && timer <= 20

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="h-13 border-b flex items-center px-4 gap-3 shrink-0 bg-card">
        <button
          onClick={() => navigate('/')}
          className="text-base font-black tracking-tight hover:text-primary transition-colors"
        >
          skribbl
        </button>
        <span className="text-border">|</span>
        <span className="text-xs text-muted-foreground font-mono tracking-widest">{roomCode}</span>

        {/* Center: word/hint */}
        <div className="flex-1 flex justify-center items-center gap-4">
          {roomState.status === 'IN_PROGRESS' && (
            <>
              <span className="text-xs text-muted-foreground">
                Round {roomState.currentRound}/{roomState.totalRounds}
              </span>
              {roomState.currentWordHint && (
                <span className="font-mono text-xl tracking-[0.5em] font-black text-foreground">
                  {isDrawer ? roomState.currentWord : roomState.currentWordHint}
                </span>
              )}
            </>
          )}
        </div>

        {/* Right: timer or start button */}
        {roomState.status === 'IN_PROGRESS' && timer > 0 && (
          <div className={cn(
            'font-bold text-base tabular-nums min-w-[3ch] text-right transition-colors',
            timerCritical && 'text-red-500',
            timerWarning && 'text-yellow-500',
            !timerCritical && !timerWarning && 'text-muted-foreground',
          )}>
            {timer}s
          </div>
        )}
        {roomState.status === 'WAITING' && isHost && (
          <Button
            size="sm"
            onClick={() => socket?.emit('game:start')}
            disabled={roomState.players.length < 2}
          >
            Start game
          </Button>
        )}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Player list */}
        <div className="w-44 border-r shrink-0 overflow-hidden">
          <PlayerList players={roomState.players} currentPlayerId={playerId} />
        </div>

        {/* Canvas / waiting area */}
        <div className="flex-1 flex flex-col overflow-hidden p-2 gap-2 relative">
          {roomState.status === 'WAITING' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
              <div>
                <p className="text-2xl font-bold mb-1">Waiting for players…</p>
                <p className="text-sm text-muted-foreground">
                  {isHost ? 'You need at least 2 players to start' : 'Host will start soon'}
                </p>
              </div>
              {isHost && (
                <div className="bg-muted rounded-2xl px-8 py-5">
                  <p className="text-xs text-muted-foreground mb-1.5 tracking-wider uppercase">Room code</p>
                  <p className="text-4xl font-black font-mono tracking-[0.3em] text-foreground">{roomCode}</p>
                  <p className="text-xs text-muted-foreground mt-2">Share with friends</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {roomState.players.length}/{roomState.maxPlayers} players joined
              </p>
            </div>
          )}
          {roomState.status !== 'WAITING' && (
            <Canvas ref={canvasRef} isDrawer={isDrawer} onDraw={sendDraw} onClear={sendClear} />
          )}

          {/* Round over overlay */}
          {roundOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/96 z-10 rounded-md backdrop-blur-sm">
              <div className="text-center px-8 max-w-sm w-full">
                <p className="text-4xl mb-3">🎨</p>
                <p className="text-2xl font-black mb-1">Round {roundOver.round}</p>
                <p className="text-muted-foreground text-sm mb-5">
                  The word was{' '}
                  <span className="font-bold text-foreground">{roundOver.word}</span>
                </p>
                <div className="space-y-1.5">
                  {roundOver.scores.slice(0, 5).map((s, i) => (
                    <div
                      key={s.id}
                      className={cn(
                        'flex items-center gap-3 text-sm px-3 py-2 rounded-lg',
                        i === 0 && 'bg-yellow-50 border border-yellow-200',
                        i > 0 && 'bg-muted/50',
                      )}
                    >
                      <span className={cn('font-bold w-4 text-center', i === 0 && 'text-yellow-500')}>
                        {i + 1}
                      </span>
                      <span className="flex-1 text-left font-medium">{s.username}</span>
                      <span className="font-semibold text-muted-foreground">{s.score} pts</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-5 animate-pulse">Next round starting…</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="w-60 border-l flex flex-col shrink-0 min-h-0 overflow-hidden">
          <Chat messages={messages} onSend={sendMessage} disabled={chatDisabled} />
        </div>
      </div>

      <WordChoices words={wordChoices} onSelect={selectWord} />

      {/* Game over */}
      <Dialog open={!!gameOver} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm rounded-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Game over!</DialogTitle>
          </DialogHeader>
          {gameOver && (
            <div className="space-y-4 mt-1">
              <div className="text-center py-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-3xl mb-1">🏆</p>
                <p className="font-bold text-lg">{gameOver.winner.username}</p>
                <p className="text-sm text-muted-foreground">{gameOver.winner.score} pts</p>
              </div>
              <div className="space-y-1">
                {gameOver.scores.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-muted/50">
                    <span className={cn('font-bold w-5 text-center text-xs',
                      i === 0 && 'text-yellow-500',
                      i === 1 && 'text-slate-400',
                      i === 2 && 'text-amber-600',
                      i > 2 && 'text-muted-foreground',
                    )}>
                      {i + 1}
                    </span>
                    <span className="flex-1 font-medium">{s.username}</span>
                    <span className="text-muted-foreground font-medium">{s.score} pts</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => navigate('/')}>Back to home</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
