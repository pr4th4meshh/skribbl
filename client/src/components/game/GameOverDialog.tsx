import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Download } from 'lucide-react'
import type { GameEndData, Drawing } from '@/hooks/socket/useRoomSocket'
import { PlayerAvatar } from '@/components/game/PlayerAvatar'
import { TEAM_STYLES } from '@/utils/gameModes'

interface Props {
  gameOver: GameEndData | null
  drawings: Drawing[]
  onClose: () => void
}

function drawingFilename({ round, word }: Drawing) {
  const slug = word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
  return `skribbl-round${round}-${slug || 'drawing'}.png`
}

export function GameOverDialog({ gameOver, drawings, onClose }: Props) {
  return (
    <Dialog open={!!gameOver} onOpenChange={() => {}}>
      <DialogContent
        className={cn('rounded-2xl max-h-[90dvh] overflow-y-auto', drawings.length ? 'sm:max-w-lg' : 'sm:max-w-sm')}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Game over!</DialogTitle>
        </DialogHeader>
        {gameOver && (
          <div className="space-y-4 mt-1">
            {gameOver.teams && (
              <div className="text-center py-3 rounded-xl border bg-muted/40">
                <p className="font-black text-lg">
                  {gameOver.teams.winner === 'tie' ? "It's a tie!" : (
                    <span className={TEAM_STYLES[gameOver.teams.winner].text}>
                      {TEAM_STYLES[gameOver.teams.winner].label} team wins!
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className={TEAM_STYLES.red.text}>Red {gameOver.teams.red}</span>
                  {' · '}
                  <span className={TEAM_STYLES.blue.text}>Blue {gameOver.teams.blue}</span>
                </p>
              </div>
            )}
            <div className="text-center py-4 bg-brand-yellow/25 border border-brand-amber/40 rounded-xl">
              <PlayerAvatar username={gameOver.winner.username} size={56} className="mx-auto mb-2" />
              <p className="font-bold text-lg">{gameOver.winner.username}</p>
              <p className="text-sm text-muted-foreground">{gameOver.winner.score} pts</p>
            </div>
            <div className="space-y-1">
              {gameOver.scores.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-muted/50">
                  <span className={cn(
                    'font-bold w-5 text-center text-xs shrink-0',
                    i === 0 && 'text-brand-amber',
                    i === 1 && 'text-slate-400',
                    i === 2 && 'text-amber-600',
                    i > 2 && 'text-muted-foreground',
                  )}>
                    {i + 1}
                  </span>
                  <PlayerAvatar username={s.username} size={24} />
                  <span className="flex-1 font-medium">{s.username}</span>
                  <span className="text-muted-foreground font-medium">{s.score} pts</span>
                </div>
              ))}
            </div>
            {drawings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Drawings</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {drawings.map((d, i) => (
                    <figure key={i} className="rounded-lg border overflow-hidden bg-white">
                      <img src={d.image} alt={`${d.drawer} drawing ${d.word}`} className="w-full aspect-[4/3] object-contain" />
                      <figcaption className="px-2 py-1 text-xs bg-card border-t flex items-center gap-1">
                        <span className="flex-1 min-w-0 truncate">
                          <span className="font-medium">{d.word}</span>
                          {d.drawer && <span className="text-muted-foreground"> · {d.drawer}</span>}
                        </span>
                        <a
                          href={d.image}
                          download={drawingFilename(d)}
                          title="Download PNG"
                          aria-label={`Download ${d.word} drawing`}
                          className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
            <Button className="w-full" onClick={onClose}>Back to home</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
