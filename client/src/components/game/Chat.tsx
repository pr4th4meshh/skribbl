import { useRef, useEffect, useState } from 'react'
import type { ChatMessage } from '@/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  messages: ChatMessage[]
  onSend: (text: string) => void
  disabled?: boolean
}

export function Chat({ messages, onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="px-3 py-2 border-b shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chat</p>
      </div>
      <ScrollArea className="flex-1 min-h-0 px-2 py-2">
        <div className="flex flex-col gap-1">
          {messages.map((msg, i) => {
            if (msg.isSystem) {
              return (
                <div key={i} className="flex items-center gap-2 my-1">
                  <div className="flex-1 h-px bg-border" />
                  <p className="text-xs text-muted-foreground italic shrink-0">{msg.text}</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )
            }
            if (msg.isCorrect) {
              return (
                <div key={i} className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-2.5 py-1.5 text-xs font-medium">
                  <span className="font-semibold">{msg.username}</span> guessed correctly!
                </div>
              )
            }
            return (
              <div key={i} className="text-sm px-1 py-0.5 rounded">
                <span className="font-semibold text-foreground">{msg.username}</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span className="text-foreground/80">{msg.text}</span>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <form onSubmit={submit} className="flex gap-1.5 p-2 border-t shrink-0">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? 'Drawing…' : 'Guess the word…'}
          disabled={disabled}
          maxLength={200}
          className="flex-1 text-sm h-8"
        />
        <Button type="submit" size="sm" className="h-8 px-3" disabled={disabled || !text.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
