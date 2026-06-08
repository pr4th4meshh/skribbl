import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRooms } from '@/hooks/tanstack/rooms/useRooms'
import { useCreateRoom } from '@/hooks/tanstack/rooms/useCreateRoom'
import { useAuthStore } from '@/stores/auth.store'
import { Navbar } from '@/components/layout/Navbar'
import { joinRoomSchema, createRoomSchema, type JoinRoomForm, type CreateRoomForm } from '@/schema/room.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export function Home() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [showCreate, setShowCreate] = useState(false)

  const { data: rooms, isLoading } = useRooms()

  const joinForm = useForm<JoinRoomForm>({ resolver: zodResolver(joinRoomSchema) })
  const createForm = useForm<CreateRoomForm & { guestUsername?: string }>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { name: '', isPrivate: false as boolean, maxPlayers: 8, rounds: 3, drawTime: 80 },
  })

  const createMutation = useCreateRoom({
    onSuccess: ({ code }) => {
      const guestUsername = createForm.getValues('guestUsername')
      navigate(`/room/${code}`, { state: { guestUsername: user ? undefined : guestUsername } })
    },
  })

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-4xl mx-auto px-5 py-12 space-y-12">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden py-24 text-center">
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at 15% 40%, #f97316 0%, transparent 55%),
                radial-gradient(ellipse at 85% 60%, #3b82f6 0%, transparent 55%),
                radial-gradient(ellipse at 50% 80%, #eab308 0%, transparent 50%),
                radial-gradient(ellipse at 75% 15%, #ec4899 0%, transparent 45%),
                radial-gradient(ellipse at 25% 75%, #22c55e 0%, transparent 45%),
                #8b5cf6
              `,
            }}
          />
          <div className="relative" style={{ isolation: 'isolate' }}>
            <h1 className="text-8xl font-black tracking-tighter" style={{ color: '#ffffff', mixBlendMode: 'difference' }}>
              skribbl
            </h1>
            <p className="text-xl font-semibold mt-3" style={{ color: '#ffffff', mixBlendMode: 'difference' }}>
              Draw. Guess. Have fun.
            </p>
          </div>
        </div>

        {/* Join / Create */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-1">Join a room</h2>
            <p className="text-sm text-muted-foreground mb-4">Have a code? Jump straight in.</p>
            <form
              onSubmit={joinForm.handleSubmit(({ code }) => navigate(`/room/${code.toUpperCase()}`))}
              className="flex gap-2"
            >
              <Input
                {...joinForm.register('code')}
                placeholder="Enter room code"
                className="uppercase font-mono tracking-wider"
                maxLength={10}
              />
              <Button type="submit">Join</Button>
            </form>
            {joinForm.formState.errors.code && (
              <p className="text-destructive text-xs mt-2">{joinForm.formState.errors.code.message}</p>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="font-semibold text-base mb-1">Create a room</h2>
              <p className="text-sm text-muted-foreground mb-4">Set up a game and invite friends.</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="w-full">
              Create room
            </Button>
          </div>
        </div>

        {/* Public rooms */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Public rooms</h2>
            {rooms && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {rooms.length} open
              </span>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {rooms && rooms.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No rooms open right now</p>
              <p className="text-sm mt-1">Be the first to create one!</p>
            </div>
          )}

          {rooms && rooms.length > 0 && (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="group flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate(`/room/${room.code}`)}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{room.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {room.host.username} · {room.rounds} rounds · {room.drawTime}s draw time
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Badge variant="outline" className="font-mono tracking-wider">{room.code}</Badge>
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/room/${room.code}`) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create room dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create a room</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d) => createMutation.mutate({ ...d, guestUsername: user ? undefined : d.guestUsername }))}
            className="space-y-4 mt-1"
          >
            {!user && (
              <div className="space-y-1.5">
                <Label>Your username</Label>
                <Input {...createForm.register('guestUsername')} placeholder="Pick a cool name…" maxLength={20} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Room name</Label>
              <Input {...createForm.register('name')} placeholder="Friday night drawing club" />
              {createForm.formState.errors.name && (
                <p className="text-destructive text-xs">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Max players</Label>
                <Input type="number" {...createForm.register('maxPlayers', { valueAsNumber: true })} min={2} max={12} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Rounds</Label>
                <Input type="number" {...createForm.register('rounds', { valueAsNumber: true })} min={1} max={10} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Draw time (s)</Label>
                <Input type="number" {...createForm.register('drawTime', { valueAsNumber: true })} min={30} max={180} />
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" className="rounded" {...createForm.register('isPrivate')} />
              <span className="text-sm">Private room</span>
            </label>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create room'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
