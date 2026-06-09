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
    <div className="h-12 border-b flex items-center px-3 gap-2 shrink-0 bg-card">
      <button
        onClick={onLogoClick}
        className="text-base font-black tracking-tight text-brand-deep hover:text-brand-blue transition-colors shrink-0"
      >
        skribbl
      </button>
      <span className="text-border hidden sm:inline">|</span>
      <span className="text-xs text-muted-foreground font-mono tracking-widest hidden sm:inline">{roomCode}</span>

      <div className="flex-1 flex justify-center items-center gap-2 sm:gap-4 overflow-hidden">
        {status === 'IN_PROGRESS' && (
          <>
            <span className="text-xs text-muted-foreground shrink-0">
              {currentRound}/{totalRounds}
            </span>
            {currentWordHint && (
              <span className="font-mono text-sm sm:text-lg tracking-[0.3em] sm:tracking-[0.4em] font-black px-2 sm:px-3 py-0.5 rounded-lg bg-brand-yellow text-brand-deep truncate max-w-[50vw] sm:max-w-none">
                {isDrawer ? currentWord : currentWordHint}
              </span>
            )}
          </>
        )}
      </div>

      {status === 'IN_PROGRESS' && timer > 0 && (
        <div className={cn(
          'font-bold text-base tabular-nums min-w-[3ch] text-right transition-colors shrink-0',
          timerCritical && 'text-red-500',
          timerWarning && 'text-brand-amber',
          !timerCritical && !timerWarning && 'text-muted-foreground',
        )}>
          {timer}s
        </div>
      )}

      {status === 'WAITING' && isHost && (
        <Button size="sm" onClick={onStartGame} disabled={playerCount < 2} className="shrink-0 text-xs sm:text-sm px-2 sm:px-3">
          Start
        </Button>
      )}
    </div>
  )
}
