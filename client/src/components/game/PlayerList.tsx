import type { Player } from '@/types'
import { PlayerAvatar } from '@/components/game/PlayerAvatar'
import { cn } from '@/lib/utils'

interface Props {
  players: Player[]
  currentPlayerId: string | null
}

export function PlayerList({ players, currentPlayerId }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Players · {players.length}
        </p>
      </div>
      <div className="flex flex-col gap-0.5 p-2 overflow-y-auto">
        {sorted.map((player, rank) => (
          <div
            key={player.id}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
              player.id === currentPlayerId ? 'bg-primary/8' : 'hover:bg-muted/60',
            )}
          >
            <span className={cn(
              'text-xs font-bold w-4 text-center shrink-0',
              rank === 0 && 'text-yellow-500',
              rank === 1 && 'text-slate-400',
              rank === 2 && 'text-amber-600',
              rank > 2 && 'text-muted-foreground',
            )}>
              {rank + 1}
            </span>

            <div className="relative shrink-0">
              <PlayerAvatar username={player.username} size={28} />
              {player.isDrawing && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-blue border-2 border-card" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-medium truncate leading-tight', player.id === currentPlayerId && 'text-primary')}>
                {player.username}
                {player.isHost && <span className="text-brand-amber font-normal ml-1 text-[10px]">HOST</span>}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">{player.score} pts</p>
            </div>

            {player.hasGuessed && !player.isDrawing && (
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
