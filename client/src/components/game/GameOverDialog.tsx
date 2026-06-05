import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { GameEndData } from '@/hooks/socket/useRoomSocket'

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
            <Button className="w-full" onClick={onClose}>Back to home</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
