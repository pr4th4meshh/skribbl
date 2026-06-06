import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  roomCode: string
  status: 'WAITING' | 'IN_PROGRESS' | 'ENDED'
  currentRound: number
  totalRounds: number
  currentWord: string
  currentWordHint: string
  isDrawer: boolean
  isHost: boolean
  playerCount: number
  timer: number
  onStartGame: () => void
  onLogoClick: () => void
}

export function RoomTopBar({
  roomCode,
  status,
  currentRound,
  totalRounds,
  currentWord,
  currentWordHint,
  isDrawer,
  isHost,
  playerCount,
  timer,
  onStartGame,
  onLogoClick,
}: Props) {
  const timerCritical = timer > 0 && timer <= 10
  const timerWarning = timer > 10 && timer <= 20

  return (
    <div className="h-13 border-b flex items-center px-4 gap-3 shrink-0 bg-card">
      <button
        onClick={onLogoClick}
        className="text-base font-black tracking-tight text-brand-deep hover:text-brand-blue transition-colors"
      >
        skribbl
      </button>
      <span className="text-border">|</span>
      <span className="text-xs text-muted-foreground font-mono tracking-widest">{roomCode}</span>

      <div className="flex-1 flex justify-center items-center gap-4">
        {status === 'IN_PROGRESS' && (
          <>
            <span className="text-xs text-muted-foreground">
              Round {currentRound}/{totalRounds}
            </span>
            {currentWordHint && (
              <span className="font-mono text-lg tracking-[0.4em] font-black px-3 py-0.5 rounded-lg bg-brand-yellow text-brand-deep">
                {isDrawer ? currentWord : currentWordHint}
              </span>
            )}
          </>
        )}
      </div>

      {status === 'IN_PROGRESS' && timer > 0 && (
        <div className={cn(
          'font-bold text-base tabular-nums min-w-[3ch] text-right transition-colors',
          timerCritical && 'text-red-500',
          timerWarning && 'text-brand-amber',
          !timerCritical && !timerWarning && 'text-muted-foreground',
        )}>
          {timer}s
        </div>
      )}

      {status === 'WAITING' && isHost && (
        <Button size="sm" onClick={onStartGame} disabled={playerCount < 2}>
          Start game
        </Button>
      )}
    </div>
  )
}
