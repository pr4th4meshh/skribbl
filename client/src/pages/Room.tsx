import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useGameStore } from '@/stores/game.store'
import { useRoomSocket } from '@/hooks/socket/useRoomSocket'
import { Canvas, type CanvasHandle } from '@/components/game/Canvas'
import { Chat } from '@/components/game/Chat'
import { PlayerList } from '@/components/game/PlayerList'
import { WordChoices } from '@/components/game/WordChoices'
import { GuestJoin } from '@/components/game/GuestJoin'
import { RoomTopBar } from '@/components/game/RoomTopBar'
import { WaitingLobby } from '@/components/game/WaitingLobby'
import { RoundOverlay } from '@/components/game/RoundOverlay'
import { SelectingWordOverlay } from '@/components/game/SelectingWordOverlay'
import { GameOverDialog } from '@/components/game/GameOverDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Room() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const locationGuestUsername = (location.state as { guestUsername?: string } | null)?.guestUsername
  const roomState = useGameStore((s) => s.roomState)
  const messages = useGameStore((s) => s.messages)
  const playerId = useGameStore((s) => s.playerId)
  const reset = useGameStore((s) => s.reset)

  const canvasRef = useRef<CanvasHandle>(null)
  const roomCode = code?.toUpperCase() ?? ''
  const [showGuestJoin, setShowGuestJoin] = useState(!user && !locationGuestUsername)
  const [mobileTab, setMobileTab] = useState<'players' | 'chat'>('chat')

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
    sendUndo,
    selectWord,
    sendMessage,
  } = useRoomSocket(roomCode, canvasRef)

  useEffect(() => {
    reset()
    if (user) connect()
    else if (locationGuestUsername) connect(locationGuestUsername)
    return () => disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (showGuestJoin && !user) {
    return (
      <GuestJoin
        onJoin={(username) => {
          setShowGuestJoin(false)
          connect(username)
        }}
        onLoginRedirect={() => navigate('/login')}
      />
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
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

  const currentPlayer = roomState.players.find((p) => p.id === playerId) ?? null
  const drawer = roomState.players.find((p) => p.isDrawing) ?? null
  const isDrawer = currentPlayer?.isDrawing ?? false
  const isHost = currentPlayer?.isHost ?? false
  const chatDisabled = isDrawer && roomState.status === 'IN_PROGRESS' && !!roomState.currentWordHint
  const drawerIsSelecting =
    roomState.status === 'IN_PROGRESS' && !roomState.currentWordHint && !isDrawer && !!drawer

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background">
      <RoomTopBar
        roomCode={roomCode}
        status={roomState.status}
        currentRound={roomState.currentRound}
        totalRounds={roomState.totalRounds}
        currentWord={roomState.currentWord ?? ''}
        currentWordHint={roomState.currentWordHint}
        isDrawer={isDrawer}
        isHost={isHost}
        playerCount={roomState.players.length}
        timer={timer}
        onStartGame={startGame}
        onLogoClick={() => navigate('/')}
      />

      {/* Main content: 3-col on desktop, canvas-only on mobile */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Players — desktop sidebar */}
        <div className="hidden md:flex w-44 border-r shrink-0 overflow-hidden flex-col">
          <PlayerList players={roomState.players} currentPlayerId={playerId} />
        </div>

        {/* Canvas / waiting area */}
        <div className="flex-1 flex flex-col overflow-hidden p-2 gap-2 relative min-h-0">
          {roomState.status === 'WAITING' && (
            <WaitingLobby
              roomCode={roomCode}
              isHost={isHost}
              playerCount={roomState.players.length}
              maxPlayers={roomState.maxPlayers}
            />
          )}
          {roomState.status !== 'WAITING' && (
            <Canvas ref={canvasRef} isDrawer={isDrawer} onDraw={sendDraw} onClear={sendClear} onUndo={sendUndo} />
          )}
          {drawerIsSelecting && <SelectingWordOverlay drawerName={drawer!.username} />}
          {roundOver && <RoundOverlay roundOver={roundOver} />}
        </div>

        {/* Chat — desktop sidebar */}
        <div className="hidden md:flex w-60 border-l flex-col shrink-0 min-h-0 overflow-hidden">
          <Chat
            messages={messages}
            onSend={(text) => sendMessage(text, isDrawer)}
            disabled={chatDisabled}
          />
        </div>
      </div>

      {/* Mobile bottom panel: tab bar + Players or Chat */}
      <div className="md:hidden flex flex-col border-t shrink-0">
        <div className="flex">
          <button
            className={cn(
              'flex-1 py-2 text-xs font-semibold transition-colors',
              mobileTab === 'players'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground',
            )}
            onClick={() => setMobileTab('players')}
          >
            Players · {roomState.players.length}
          </button>
          <button
            className={cn(
              'flex-1 py-2 text-xs font-semibold transition-colors',
              mobileTab === 'chat'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground',
            )}
            onClick={() => setMobileTab('chat')}
          >
            Chat
          </button>
        </div>
        <div className="h-44 overflow-hidden">
          {mobileTab === 'players' ? (
            <PlayerList players={roomState.players} currentPlayerId={playerId} />
          ) : (
            <Chat
              messages={messages}
              onSend={(text) => sendMessage(text, isDrawer)}
              disabled={chatDisabled}
            />
          )}
        </div>
      </div>

      <WordChoices
        words={wordChoices}
        onSelect={(word) => { selectWord(word); clearWordChoices() }}
      />

      <GameOverDialog gameOver={gameOver} onClose={() => navigate('/')} />
    </div>
  )
}
