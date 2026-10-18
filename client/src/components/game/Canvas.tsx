import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'
import type { DrawData, DrawTool } from '@/types'
import { Button } from '@/components/ui/button'
import { Pencil, Eraser, PaintBucket, Minus, Square, Circle, Undo2, Redo2, type LucideIcon } from 'lucide-react'
import { fillStroke, floodFill, drawShape, type ActiveStroke, type ShapeTool } from '@/utils/canvas'

export interface CanvasSync {
  strokes: DrawData[]
  canUndo: boolean
  canRedo: boolean
}

export interface CanvasHandle {
  applyDraw: (data: DrawData) => void
  clearCanvas: () => void
  syncCanvas: (sync: CanvasSync) => void
  /** PNG data URL of the drawing on a white background, or null if nothing was drawn */
  snapshot: () => string | null
}

interface Props {
  isDrawer: boolean
  onDraw: (data: DrawData) => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
}

const CANVAS_W = 800
const CANVAS_H = 600
const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#78716c']
const SIZES = [3, 8, 16] as const
const SIZE_LABELS = ['Thin', 'Med', 'Thick'] as const
const TOOLS: { id: DrawTool; label: string; icon: LucideIcon }[] = [
  { id: 'pen', label: 'Pen', icon: Pencil },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'fill', label: 'Fill', icon: PaintBucket },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Ellipse', icon: Circle },
]
const SELECTED = '#6366f1'
const UNSELECTED = '#d1d5db'

const isShapeTool = (t: DrawTool): t is ShapeTool => t === 'line' || t === 'rect' || t === 'circle'

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas({ isDrawer, onDraw, onClear, onUndo, onRedo }, ref) {
  const displayRef = useRef<HTMLCanvasElement>(null)
  const committedRef = useRef<HTMLCanvasElement | null>(null)
  const activeStroke = useRef<ActiveStroke | null>(null)
  // Shape being dragged by the drawer, in relative (0–1) coordinates
  const shapeDraft = useRef<{ tool: ShapeTool; x: number; y: number; x2: number; y2: number } | null>(null)
  const isPointerDown = useRef(false)
  const hasContent = useRef(false)

  // The server owns the stroke history; these mirror what it last told us
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState<number>(SIZES[0])
  const [tool, setTool] = useState<DrawTool>('pen')

  function initCommitted() {
    const offscreen = document.createElement('canvas')
    offscreen.width = CANVAS_W
    offscreen.height = CANVAS_H
    const ctx = offscreen.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    committedRef.current = offscreen
  }

  function paintShape(ctx: CanvasRenderingContext2D, data: { tool: ShapeTool; x: number; y: number; x2: number; y2: number }, c: string, s: number) {
    drawShape(ctx, data.tool, data.x * CANVAS_W, data.y * CANVAS_H, data.x2 * CANVAS_W, data.y2 * CANVAS_H, c, s)
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
    if (shapeDraft.current) paintShape(ctx, shapeDraft.current, color, size)
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
      if (data.type === 'shape') {
        if (isShapeTool(data.tool)) paintShape(ctx, { tool: data.tool, x: data.x, y: data.y, x2: data.x2 ?? data.x, y2: data.y2 ?? data.y }, data.color, data.size)
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

  function applyData(data: DrawData) {
    hasContent.current = true
    const x = data.x * CANVAS_W
    const y = data.y * CANVAS_H

    if (data.tool === 'fill') {
      if (data.type === 'start') {
        floodFill(committedRef.current!, x, y, data.color)
        compositeToDisplay()
      }
      return
    }

    if (data.type === 'shape') {
      if (isShapeTool(data.tool)) {
        const ctx = committedRef.current!.getContext('2d')!
        paintShape(ctx, { tool: data.tool, x: data.x, y: data.y, x2: data.x2 ?? data.x, y2: data.y2 ?? data.y }, data.color, data.size)
      }
      compositeToDisplay()
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

  // The drawer finished a stroke: it can be undone, and anything undone before is gone
  function markStrokeDone() {
    setCanUndo(true)
    setCanRedo(false)
  }

  useEffect(() => {
    initCommitted()
    compositeToDisplay()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl+Y to redo — but not while typing in chat
  useEffect(() => {
    if (!isDrawer) return
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); onUndo() }
      else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); onRedo() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDrawer, onUndo, onRedo])

  useImperativeHandle(ref, () => ({
    applyDraw: applyData,
    clearCanvas: () => {
      activeStroke.current = null
      shapeDraft.current = null
      hasContent.current = false
      setCanUndo(false)
      setCanRedo(false)
      const committed = committedRef.current
      if (committed) {
        const ctx = committed.getContext('2d')!
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      }
      compositeToDisplay()
    },
    syncCanvas: ({ strokes, canUndo: undoable, canRedo: redoable }) => {
      activeStroke.current = null
      hasContent.current = strokes.length > 0
      setCanUndo(undoable)
      setCanRedo(redoable)
      replayOntoCommitted(strokes)
      compositeToDisplay()
    },
    snapshot: () => {
      const committed = committedRef.current
      if (!committed || !hasContent.current) return null
      // The eraser cuts transparent holes, so flatten onto white for the export
      const out = document.createElement('canvas')
      out.width = CANVAS_W
      out.height = CANVAS_H
      const ctx = out.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.drawImage(committed, 0, 0)
      return out.toDataURL('image/png')
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
      markStrokeDone()
      return
    }

    displayRef.current?.setPointerCapture(e.pointerId)
    isPointerDown.current = true

    if (isShapeTool(tool)) {
      shapeDraft.current = { tool, x, y, x2: x, y2: y }
      return
    }

    const data: DrawData = { type: 'start', x, y, color: tool === 'eraser' ? '#ffffff' : color, size, tool }
    onDraw(data)
    applyData(data)
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !isPointerDown.current) return
    const { x, y } = getRelPos(e)
    if (shapeDraft.current) {
      shapeDraft.current = { ...shapeDraft.current, x2: x, y2: y }
      compositeToDisplay()
      return
    }
    const data: DrawData = { type: 'move', x, y, color: tool === 'eraser' ? '#ffffff' : color, size, tool }
    onDraw(data)
    applyData(data)
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawer || !isPointerDown.current) return
    isPointerDown.current = false
    const { x, y } = getRelPos(e)

    if (shapeDraft.current) {
      const draft = { ...shapeDraft.current, x2: x, y2: y }
      shapeDraft.current = null
      // A click without dragging would send an invisible shape
      if (draft.x === draft.x2 && draft.y === draft.y2) {
        compositeToDisplay()
        return
      }
      const data: DrawData = { type: 'shape', ...draft, color, size }
      onDraw(data)
      applyData(data)
      markStrokeDone()
      return
    }

    const data: DrawData = { type: 'end', x, y, color: tool === 'eraser' ? '#ffffff' : color, size, tool }
    onDraw(data)
    applyData(data)
    markStrokeDone()
  }

  const cursor = !isDrawer ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair'
  const fillActive = tool === 'fill'
  const eraserActive = tool === 'eraser'
  const customColor = !COLORS.includes(color)

  // Picking a colour while erasing switches back to the pen; fill and shape tools keep their mode
  function pickColor(c: string) {
    setColor(c)
    if (eraserActive) setTool('pen')
  }

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
          <div className="flex gap-0.5 sm:gap-1 flex-wrap items-center">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => pickColor(c)}
                aria-label={`Colour ${c}`}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: color === c && !eraserActive ? SELECTED : UNSELECTED,
                  transform: color === c && !eraserActive ? 'scale(1.15)' : undefined,
                }}
              />
            ))}
            <label
              title="Custom colour"
              className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 overflow-hidden cursor-pointer transition-transform hover:scale-110"
              style={{
                background: customColor ? color : 'conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #ec4899, #ef4444)',
                borderColor: customColor && !eraserActive ? SELECTED : UNSELECTED,
                transform: customColor && !eraserActive ? 'scale(1.15)' : undefined,
              }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => pickColor(e.target.value)}
                aria-label="Custom colour"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>

          {/* Stroke sizes — dimmed when fill is active */}
          <div className={`flex gap-1 transition-opacity ${fillActive ? 'opacity-30 pointer-events-none' : ''}`}>
            {SIZES.map((s, i) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className="w-10 h-8 rounded flex flex-col items-center justify-center gap-0.5 border transition-colors hover:bg-muted"
                style={{ borderColor: size === s && !fillActive ? SELECTED : UNSELECTED }}
              >
                <div className="rounded-full bg-foreground" style={{ width: Math.min(s, 10), height: Math.min(s, 10) }} />
                <span className="text-[9px] leading-none text-muted-foreground">{SIZE_LABELS[i]}</span>
              </button>
            ))}
          </div>

          {/* Tools group */}
          <div className="flex gap-1">
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={tool === id ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 w-8 p-0"
                title={label}
                aria-label={label}
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="w-3.5 h-3.5" />
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
