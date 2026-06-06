import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { GameEndData } from '@/hooks/socket/useRoomSocket'
import { PlayerAvatar } from '@/components/game/PlayerAvatar'

interface Props {
  gameOver: GameEndData | null
  onClose: () => void
}

export function GameOverDialog({ gameOver, onClose }: Props) {
  return (
    <Dialog open={!!gameOver} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm rounded-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Game over!</DialogTitle>
        </DialogHeader>
        {gameOver && (
          <div className="space-y-4 mt-1">
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
            <Button className="w-full" onClick={onClose}>Back to home</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
