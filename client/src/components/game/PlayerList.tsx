import { UserX } from 'lucide-react'
import type { Player } from '@/types'
import { PlayerAvatar } from '@/components/game/PlayerAvatar'
import { TEAM_STYLES } from '@/utils/gameModes'
import { cn } from '@/lib/utils'

interface Props {
  players: Player[]
  currentPlayerId: string | null
  isHost?: boolean
  kickVotes?: Record<string, string[]>
  onKick?: (playerId: string) => void
  onVoteKick?: (playerId: string) => void
}

export function PlayerList({ players, currentPlayerId, isHost, kickVotes = {}, onKick, onVoteKick }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const hasTeams = players.some((p) => p.team)
  const teamScore = (team: 'red' | 'blue') =>
    players.filter((p) => p.team === team).reduce((sum, p) => sum + p.score, 0)

  const handleKick = (player: Player) => {
    if (isHost) {
      if (window.confirm(`Kick ${player.username} from the room?`)) onKick?.(player.id)
    } else {
      onVoteKick?.(player.id)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Players · {players.length}
        </p>
        {hasTeams && (
          <div className="flex gap-2 mt-1 text-[11px] font-semibold">
            <span className={TEAM_STYLES.red.text}>Red {teamScore('red')}</span>
            <span className={TEAM_STYLES.blue.text}>Blue {teamScore('blue')}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1 min-h-0">
        {sorted.map((player, rank) => {
          const votes = kickVotes[player.id]
          const myVote = !!currentPlayerId && !!votes?.includes(currentPlayerId)
          const canKick = player.id !== currentPlayerId && (isHost ? !!onKick : !!onVoteKick)
          return (
            <div
              key={player.id}
              className={cn(
                'group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                player.team && TEAM_STYLES[player.team].bg,
                player.id === currentPlayerId ? 'ring-1 ring-primary/30' : 'hover:bg-muted/60',
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
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {player.score} pts
                  {votes?.length ? <span className="text-red-500 ml-1">· {votes.length} kick vote{votes.length > 1 ? 's' : ''}</span> : null}
                </p>
              </div>

              {player.hasGuessed && !player.isDrawing && (
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              )}

              {canKick && (
                <button
                  onClick={() => handleKick(player)}
                  disabled={!isHost && myVote}
                  title={isHost ? 'Kick player' : myVote ? 'You voted to kick' : 'Vote to kick'}
                  className={cn(
                    'shrink-0 rounded p-0.5 text-muted-foreground transition-opacity hover:text-red-500 disabled:text-red-500',
                    'md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100',
                    myVote && 'md:opacity-100',
                  )}
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
