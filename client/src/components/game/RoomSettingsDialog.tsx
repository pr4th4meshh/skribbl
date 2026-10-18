import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GAME_MODES, WORD_DIFFICULTIES, LANGUAGES } from '@skribbl/shared'
import type { RoomSettings } from '@/types'
import { roomSettingsSchema, type RoomSettingsForm } from '@/schema/room.schema'
import { GAME_MODE_INFO, WORD_DIFFICULTY_LABELS, LANGUAGE_LABELS } from '@/utils/gameModes'
import { SELECT_CLASS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: RoomSettings
  playerCount: number
  onSave: (settings: RoomSettings) => void
}

export function RoomSettingsDialog({ open, onOpenChange, settings, playerCount, onSave }: Props) {
  const form = useForm<RoomSettingsForm>({ resolver: zodResolver(roomSettingsSchema), defaultValues: settings })
  const selectedMode = useWatch({ control: form.control, name: 'mode' })

  // Start from the room's current settings every time the dialog opens
  useEffect(() => {
    if (open) form.reset(settings)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Room settings</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => {
            if (values.maxPlayers < playerCount) {
              form.setError('maxPlayers', { message: `There are already ${playerCount} players in the room` })
              return
            }
            onSave(values)
            onOpenChange(false)
          })}
          className="space-y-4 mt-1"
        >
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Max players</Label>
              <Input type="number" {...form.register('maxPlayers', { valueAsNumber: true })} min={2} max={12} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Rounds</Label>
              <Input type="number" {...form.register('rounds', { valueAsNumber: true })} min={1} max={10} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Draw time (s)</Label>
              <Input type="number" {...form.register('drawTime', { valueAsNumber: true })} min={30} max={180} />
            </div>
          </div>
          {(errors.maxPlayers ?? errors.rounds ?? errors.drawTime) && (
            <p className="text-destructive text-xs">
              {(errors.maxPlayers ?? errors.rounds ?? errors.drawTime)?.message}
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Game mode</Label>
              <select {...form.register('mode')} className={SELECT_CLASS}>
                {GAME_MODES.map((m) => <option key={m} value={m}>{GAME_MODE_INFO[m].label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Difficulty</Label>
              <select {...form.register('wordDifficulty')} className={SELECT_CLASS}>
                {WORD_DIFFICULTIES.map((d) => <option key={d} value={d}>{WORD_DIFFICULTY_LABELS[d]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Language</Label>
              <select {...form.register('language')} className={SELECT_CLASS}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{GAME_MODE_INFO[selectedMode]?.description}</p>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" className="rounded" {...form.register('isPrivate')} />
            <span className="text-sm">Private room</span>
          </label>
          <Button type="submit" className="w-full">Save settings</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
