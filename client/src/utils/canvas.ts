import { getStroke } from 'perfect-freehand'

export type ActiveStroke = {
  points: Array<[number, number]>
  color: string
  size: number
  tool: 'pen' | 'eraser'
}

export function buildPath(points: Array<[number, number]>, size: number): Path2D {
  const outline: number[][] = getStroke(points, {
    size,
    thinning: 0,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: false,
  })
  if (!outline.length) return new Path2D()
  const path = new Path2D()
  const first = outline[0]!
  path.moveTo(first[0]!, first[1]!)
  for (let i = 1; i < outline.length - 1; i++) {
    const a = outline[i]!
    const b = outline[i + 1]!
    path.quadraticCurveTo(a[0]!, a[1]!, (a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2)
  }
  path.closePath()
  return path
}

export function fillStroke(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string,
  size: number,
  tool: 'pen' | 'eraser',
) {
  if (!points.length) return
  const path = buildPath(points, size)
  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color
  ctx.fill(path)
  ctx.globalCompositeOperation = 'source-over'
}
