import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBackendHealth } from '@/hooks/tanstack/health/useBackendHealth'

export function BackendWakeupModal() {
  const { isDown } = useBackendHealth()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef<number>(0)

  useEffect(() => {
    if (isDown && !timerRef.current) {
      startedAt.current = Date.now()
    }
    if (!isDown && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isDown])

  return (
    <Dialog open={isDown} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Waking up the server…
          </DialogTitle>
          <DialogDescription>
            The backend is on a free-tier host and may take up to a minute to spin up. Hang tight!
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
