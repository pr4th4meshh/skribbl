import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'
import type { DrawData } from '@/types'
import { Button } from '@/components/ui/button'
import { PaintBucket, Eraser, Undo2 } from 'lucide-react'
import { fillStroke, floodFill, type ActiveStroke } from '@/utils/canvas'

export interface CanvasHandle {
  applyDraw: (data: DrawData) => void
  clearCanvas: () => void
  replayStrokes: (strokes: DrawData[]) => void
}

interface Props {
  isDrawer: boolean
  onDraw: (data: DrawData) => void
  onClear: () => void
  onUndo?: (remainingStrokes: DrawData[]) => void
}

const CANVAS_W = 800
const CANVAS_H = 600
const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#78716c']
const SIZES = [3, 8, 16] as const
const SIZE_LABELS = ['Thin', 'Med', 'Thick'] as const

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas({ isDrawer, onDraw, onClear, onUndo }, ref) {
  const displayRef = useRef<HTMLCanvasElement>(null)
  const committedRef = useRef<HTMLCanvasElement | null>(null)
  const activeStroke = useRef<ActiveStroke | null>(null)
  const isPointerDown = useRef(false)

  // Undo history: each entry is one complete stroke (array of DrawData events)
  const strokeHistory = useRef<DrawData[][]>([])
  const currentStrokeEvents = useRef<DrawData[]>([])
  const [canUndo, setCanUndo] = useState(false)

  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState<number>(SIZES[0])
  const [tool, setTool] = useState<'pen' | 'eraser' | 'fill'>('pen')

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

  function replayOntoCommitted(strokes: DrawData[]) {
    initCommitted()
    const committed = committedRef.current!
    const ctx = committed.getContext('2d')!
    let batch: ActiveStroke | null = null
    for (const data of strokes) {
      const x = data.x * CANVAS_W
      const y = data.y * CANVAS_H
      if (data.tool === 'fill') {
        if (data.type === 'start') floodFill(committed, x, y, data.color)
        continue
      }
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
  }

  function pushStroke(events: DrawData[]) {
    if (!events.length) return
    strokeHistory.current.push([...events])
    setCanUndo(true)
  }

  function clearHistory() {
    strokeHistory.current = []
    currentStrokeEvents.current = []
    setCanUndo(false)
  }

  function handleUndo() {
    if (!strokeHistory.current.length) return
    strokeHistory.current.pop()
    setCanUndo(strokeHistory.current.length > 0)
    activeStroke.current = null
    const remaining = strokeHistory.current.flat()
    replayOntoCommitted(remaining)
    compositeToDisplay()
    onUndo?.(remaining)
  }

  function applyData(data: DrawData) {
    const x = data.x * CANVAS_W
    const y = data.y * CANVAS_H

    if (data.tool === 'fill') {
      if (data.type === 'start') {
        floodFill(committedRef.current!, x, y, data.color)
        compositeToDisplay()
      }
      return
    }

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
      clearHistory()
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
      replayOntoCommitted(strokes)
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

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer) return
    const { x, y } = getRelPos(e)

    if (tool === 'fill') {
      const data: DrawData = { type: 'start', x, y, color, size, tool: 'fill' }
      onDraw(data)
      applyData(data)
      pushStroke([data])
      return
    }

    displayRef.current?.setPointerCapture(e.pointerId)
    isPointerDown.current = true
    const data: DrawData = { type: 'start', x, y, color: tool === 'eraser' ? '#ffffff' : color, size, tool }
    currentStrokeEvents.current = [data]
    onDraw(data)
    applyData(data)
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !isPointerDown.current) return
    const { x, y } = getRelPos(e)
    const data: DrawData = { type: 'move', x, y, color: tool === 'eraser' ? '#ffffff' : color, size, tool }
    currentStrokeEvents.current.push(data)
    onDraw(data)
    applyData(data)
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !isPointerDown.current) return
    isPointerDown.current = false
    const { x, y } = getRelPos(e)
    const data: DrawData = { type: 'end', x, y, color: tool === 'eraser' ? '#ffffff' : color, size, tool }
    currentStrokeEvents.current.push(data)
    pushStroke(currentStrokeEvents.current)
    currentStrokeEvents.current = []
    onDraw(data)
    applyData(data)
  }

  const cursor = !isDrawer ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair'
  const fillActive = tool === 'fill'
  const eraserActive = tool === 'eraser'

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative flex-1 bg-white rounded-md overflow-hidden border">
        <canvas
          ref={displayRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-full"
          style={{ cursor, touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      {isDrawer && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Color palette */}
          <div className="flex gap-0.5 sm:gap-1 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c)
                  // keep fill active when changing color in fill mode
                  if (tool !== 'fill') setTool('pen')
                }}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: color === c && !eraserActive ? '#6366f1' : '#d1d5db',
                  transform: color === c && !eraserActive ? 'scale(1.15)' : undefined,
                }}
              />
            ))}
          </div>

          {/* Stroke sizes — dimmed when fill is active */}
          <div className={`flex gap-1 transition-opacity ${fillActive ? 'opacity-30 pointer-events-none' : ''}`}>
            {SIZES.map((s, i) => (
              <button
                key={s}
                onClick={() => { setSize(s); if (eraserActive) setTool('pen') }}
                className="w-10 h-8 rounded flex flex-col items-center justify-center gap-0.5 border transition-colors hover:bg-muted"
                style={{ borderColor: size === s && !eraserActive && !fillActive ? '#6366f1' : '#d1d5db' }}
              >
                <div className="rounded-full bg-foreground" style={{ width: Math.min(s, 10), height: Math.min(s, 10) }} />
                <span className="text-[9px] leading-none text-muted-foreground">{SIZE_LABELS[i]}</span>
              </button>
            ))}
          </div>

          {/* Tools group */}
          <div className="flex gap-1">
            <Button
              variant={eraserActive ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs gap-1.5"
              onClick={() => setTool(eraserActive ? 'pen' : 'eraser')}
            >
              <Eraser className="w-3.5 h-3.5" />
              Eraser
            </Button>
            <Button
              variant={fillActive ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs gap-1.5"
              onClick={() => setTool(fillActive ? 'pen' : 'fill')}
            >
              <PaintBucket className="w-3.5 h-3.5" />
              Fill
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs gap-1.5"
              onClick={handleUndo}
              disabled={!canUndo}
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 text-xs" onClick={onClear}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})

export { Canvas }
