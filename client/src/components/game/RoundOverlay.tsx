import { cn } from '@/lib/utils'
import type { RoundOverData } from '@/hooks/socket/useRoomSocket'

interface Props {
  roundOver: RoundOverData
}

export function RoundOverlay({ roundOver }: Props) {
  return (
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
  )
}
