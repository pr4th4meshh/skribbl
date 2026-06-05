import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  onJoin: (username: string) => void
  onLoginRedirect: () => void
}

export function GuestJoin({ onJoin, onLoginRedirect }: Props) {
  const [username, setUsername] = useState('')

  const submit = () => {
    const trimmed = username.trim()
    if (!trimmed) return
    onJoin(trimmed)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">skribbl</span>
          <span className="text-2xl ml-1.5">✏️</span>
          <p className="text-sm text-muted-foreground mt-2">Join as guest to play</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Your username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pick a cool name…"
              maxLength={20}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            />
          </div>
          <Button className="w-full" onClick={submit}>
            Join room
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-5">
          or{' '}
          <button className="text-primary font-medium hover:underline" onClick={onLoginRedirect}>
            log in
          </button>
          {' '}for full access
        </p>
      </div>
    </div>
  )
}
