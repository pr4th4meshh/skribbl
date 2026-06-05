import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  words: string[]
  onSelect: (word: string) => void
}

export function WordChoices({ words, onSelect }: Props) {
  return (
    <Dialog open={words.length > 0}>
      <DialogContent className="sm:max-w-xs rounded-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-base">Pick a word to draw</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2.5 mt-1">
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
      </DialogContent>
    </Dialog>
  )
}
