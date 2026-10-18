import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Props {
  words: string[]
  onSelect: (word: string) => void
  // Must match the server's auto-pick delay, which picks for the drawer when this runs out
  pickSeconds: number
}

export function WordChoices({ words, onSelect, pickSeconds }: Props) {
  const [timeLeft, setTimeLeft] = useState(pickSeconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (words.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setTimeLeft(pickSeconds)
      return
    }

    setTimeLeft(pickSeconds)
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          const random = words[Math.floor(Math.random() * words.length)]!
          onSelect(random)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [words]) // eslint-disable-line react-hooks/exhaustive-deps

  const urgent = timeLeft <= Math.ceil(pickSeconds / 3)
  const pct = (timeLeft / pickSeconds) * 100

  return (
    <Dialog open={words.length > 0}>
      <DialogContent className="sm:max-w-xs rounded-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-base">Pick a word to draw</DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden -mt-1">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear',
              urgent ? 'bg-red-500' : 'bg-primary',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          {words.map((word, i) => (
            <button
              key={word}
              onClick={() => onSelect(word)}
              className="group w-full text-left px-4 py-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base group-hover:text-primary transition-colors">{word}</span>
                <span className="text-xs text-muted-foreground">
                  {i === 0 ? 'Easy' : i === 1 ? 'Medium' : 'Hard'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{word.length} letters</p>
            </button>
          ))}
        </div>

        <p className={cn('text-center text-xs tabular-nums', urgent ? 'text-red-500 font-semibold' : 'text-muted-foreground')}>
          Auto-selecting in {timeLeft}s
        </p>
      </DialogContent>
    </Dialog>
  )
}
