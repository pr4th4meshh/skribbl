import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useGameStore } from '@/stores/game.store'
import { useRoomSocket } from '@/hooks/socket/useRoomSocket'
import { Canvas, type CanvasHandle } from '@/components/game/Canvas'
import { Chat } from '@/components/game/Chat'
import { PlayerList } from '@/components/game/PlayerList'
import { WordChoices } from '@/components/game/WordChoices'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function Room() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const roomState = useGameStore((s) => s.roomState)
  const messages = useGameStore((s) => s.messages)
  const playerId = useGameStore((s) => s.playerId)
  const reset = useGameStore((s) => s.reset)

  const canvasRef = useRef<CanvasHandle>(null)
  const roomCode = code?.toUpperCase() ?? ''

  const {
    connect,
    disconnect,
    error,
    timer,
    wordChoices,
    clearWordChoices,
    gameOver,
    roundOver,
    startGame,
    sendDraw,
    sendClear,
    selectWord,
    sendMessage,
  } = useRoomSocket(roomCode, canvasRef)

  const [guestUsername, setGuestUsername] = useState('')
  const [showGuestDialog, setShowGuestDialog] = useState(!user)

  useEffect(() => {
    reset()
    if (user) connect()
    return () => disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const currentPlayer = roomState?.players.find((p) => p.id === playerId) ?? null
  const isDrawer = currentPlayer?.isDrawing ?? false
  const isHost = currentPlayer?.isHost ?? false
  const timerCritical = timer > 0 && timer <= 10
  const timerWarning = timer > 10 && timer <= 20
  const chatDisabled = isDrawer && roomState?.status === 'IN_PROGRESS' && !!roomState.currentWordHint

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
                    connect(guestUsername.trim())
                  }
                }}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!guestUsername.trim()) return
                setShowGuestDialog(false)
                connect(guestUsername.trim())
              }}
            >
              Join room
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-5">
            or{' '}
            <button className="text-primary font-medium hover:underline" onClick={() => navigate('/login')}>
              log in
            </button>
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
          <Button size="sm" onClick={startGame} disabled={roomState.players.length < 2}>
            Start game
          </Button>
        )}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-44 border-r shrink-0 overflow-hidden">
          <PlayerList players={roomState.players} currentPlayerId={playerId} />
        </div>

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

        <div className="w-60 border-l flex flex-col shrink-0 min-h-0 overflow-hidden">
          <Chat
            messages={messages}
            onSend={(text) => sendMessage(text, isDrawer)}
            disabled={chatDisabled}
          />
        </div>
      </div>

      <WordChoices
        words={wordChoices}
        onSelect={(word) => {
          selectWord(word)
          clearWordChoices()
        }}
      />

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
                    <span className={cn(
                      'font-bold w-5 text-center text-xs',
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
