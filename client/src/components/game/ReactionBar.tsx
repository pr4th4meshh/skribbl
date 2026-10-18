import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import type { Reaction } from '@/types'
import type { ReactionState } from '@/hooks/socket/useRoomSocket'
import { cn } from '@/lib/utils'

interface Props {
  reactions: ReactionState
  canReact: boolean
  onReact: (reaction: Reaction) => void
  // Lift above the drawing toolbar when it's shown
  raised?: boolean
}

export function ReactionBar({ reactions, canReact, onReact, raised }: Props) {
  const { likes, dislikes, mine, last } = reactions
  const [visibleKey, setVisibleKey] = useState<number | null>(null)

  useEffect(() => {
    if (!last) return
    setVisibleKey(last.key)
    const t = setTimeout(() => setVisibleKey(null), 2500)
    return () => clearTimeout(t)
  }, [last])

  const button = (reaction: Reaction, count: number) => {
    const Icon = reaction === 'like' ? ThumbsUp : ThumbsDown
    const active = mine === reaction
    return (
      <button
        onClick={() => onReact(reaction)}
        disabled={!canReact}
        title={canReact ? (reaction === 'like' ? 'Like this drawing' : 'Dislike this drawing') : undefined}
        className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors',
          'disabled:cursor-default',
          active && reaction === 'like' && 'bg-green-500 text-white',
          active && reaction === 'dislike' && 'bg-red-500 text-white',
          !active && 'bg-muted text-muted-foreground enabled:hover:bg-muted-foreground/20',
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {count}
      </button>
    )
  }

  return (
    <div className={cn(
      'absolute right-4 z-[5] flex items-center gap-1.5 rounded-full border bg-card/90 p-1 shadow-sm backdrop-blur-sm',
      raised ? 'bottom-14' : 'bottom-4',
    )}>
      {last && visibleKey === last.key && (
        <span
          key={last.key}
          className="pointer-events-none absolute -top-7 right-2 animate-in fade-in slide-in-from-bottom-2 duration-500 whitespace-nowrap rounded-full bg-card border px-2 py-0.5 text-[11px] shadow-sm"
        >
          {last.username} {last.reaction === 'like' ? '👍' : '👎'}
        </span>
      )}
      {button('like', likes)}
      {button('dislike', dislikes)}
    </div>
  )
}
