import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'
import type { DrawData } from '@/types'
import { Button } from '@/components/ui/button'
import { fillStroke, type ActiveStroke } from '@/utils/canvas'

export interface CanvasHandle {
  applyDraw: (data: DrawData) => void
  clearCanvas: () => void
  replayStrokes: (strokes: DrawData[]) => void
}

interface Props {
  isDrawer: boolean
  onDraw: (data: DrawData) => void
  onClear: () => void
}

const CANVAS_W = 800
const CANVAS_H = 600
const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#78716c']
const SIZES = [3, 8, 16]

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas({ isDrawer, onDraw, onClear }, ref) {
  const displayRef = useRef<HTMLCanvasElement>(null)
  const committedRef = useRef<HTMLCanvasElement | null>(null)
  const activeStroke = useRef<ActiveStroke | null>(null)
  const isPointerDown = useRef(false)

  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(SIZES[1]!)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')

  function initCommitted() {
    const offscreen = document.createElement('canvas')
    offscreen.width = CANVAS_W
    offscreen.height = CANVAS_H
    const ctx = offscreen.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    committedRef.current = offscreen
  }

  function compositeToDisplay() {
    const display = displayRef.current
    const committed = committedRef.current
    if (!display || !committed) return
    const ctx = display.getContext('2d')!
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.drawImage(committed, 0, 0)
    if (activeStroke.current) {
      const { points, color: c, size: s, tool: t } = activeStroke.current
      fillStroke(ctx, points, c, s, t)
    }
  }

  function commitActiveStroke() {
    const committed = committedRef.current
    if (!committed || !activeStroke.current) return
    const ctx = committed.getContext('2d')!
    const { points, color: c, size: s, tool: t } = activeStroke.current
    fillStroke(ctx, points, c, s, t)
    activeStroke.current = null
  }

  function applyData(data: DrawData) {
    const x = data.x * CANVAS_W
    const y = data.y * CANVAS_H

    if (data.type === 'start') {
      activeStroke.current = { points: [[x, y]], color: data.color, size: data.size, tool: data.tool as 'pen' | 'eraser' }
    } else if (data.type === 'move' && activeStroke.current) {
      activeStroke.current.points.push([x, y])
    } else if (data.type === 'end') {
      if (activeStroke.current) {
        activeStroke.current.points.push([x, y])
        commitActiveStroke()
      }
    }
    compositeToDisplay()
  }

  useEffect(() => {
    initCommitted()
    compositeToDisplay()
  }, [])

  useImperativeHandle(ref, () => ({
    applyDraw: applyData,
    clearCanvas: () => {
      activeStroke.current = null
      const committed = committedRef.current
      if (committed) {
        const ctx = committed.getContext('2d')!
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      }
      compositeToDisplay()
    },
    replayStrokes: (strokes) => {
      activeStroke.current = null
      initCommitted()
      const committed = committedRef.current!
      const ctx = committed.getContext('2d')!

      let batch: ActiveStroke | null = null
      for (const data of strokes) {
        const x = data.x * CANVAS_W
        const y = data.y * CANVAS_H
        if (data.type === 'start') {
          batch = { points: [[x, y]], color: data.color, size: data.size, tool: data.tool as 'pen' | 'eraser' }
        } else if (data.type === 'move' && batch) {
          batch.points.push([x, y])
        } else if (data.type === 'end' && batch) {
          batch.points.push([x, y])
          fillStroke(ctx, batch.points, batch.color, batch.size, batch.tool)
          batch = null
        }
      }
      compositeToDisplay()
    },
  }))

  function getRelPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = displayRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  function emitAndApply(type: DrawData['type'], e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = getRelPos(e)
    const data: DrawData = { type, x, y, color: tool === 'eraser' ? '#ffffff' : color, size, tool }
    onDraw(data)
    applyData(data)
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer) return
    displayRef.current?.setPointerCapture(e.pointerId)
    isPointerDown.current = true
    emitAndApply('start', e)
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !isPointerDown.current) return
    emitAndApply('move', e)
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !isPointerDown.current) return
    isPointerDown.current = false
    emitAndApply('end', e)
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative flex-1 bg-white rounded-md overflow-hidden border">
        <canvas
          ref={displayRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-full"
          style={{ cursor: isDrawer ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      {isDrawer && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool('pen') }}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: color === c && tool === 'pen' ? '#6366f1' : '#d1d5db',
                  transform: color === c && tool === 'pen' ? 'scale(1.15)' : undefined,
                }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className="w-8 h-8 rounded flex items-center justify-center border transition-colors hover:bg-muted"
                style={{ borderColor: size === s ? '#6366f1' : '#d1d5db' }}
              >
                <div className="rounded-full bg-foreground" style={{ width: s, height: s }} />
              </button>
            ))}
          </div>
          <Button
            variant={tool === 'eraser' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
          >
            Eraser
          </Button>
          <Button variant="outline" size="sm" onClick={onClear}>Clear</Button>
        </div>
      )}
    </div>
  )
})

export { Canvas }
