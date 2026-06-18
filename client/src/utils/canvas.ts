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

export function floodFill(canvas: HTMLCanvasElement, startX: number, startY: number, fillHex: string) {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const d = imageData.data

  const x0 = Math.round(startX)
  const y0 = Math.round(startY)
  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return

  const fillR = parseInt(fillHex.slice(1, 3), 16)
  const fillG = parseInt(fillHex.slice(3, 5), 16)
  const fillB = parseInt(fillHex.slice(5, 7), 16)

  const idx0 = (y0 * width + x0) * 4
  const targetR = d[idx0]!
  const targetG = d[idx0 + 1]!
  const targetB = d[idx0 + 2]!

  if (targetR === fillR && targetG === fillG && targetB === fillB) return

  const tolerance = 32
  const match = (i: number) =>
    Math.abs(d[i]! - targetR) <= tolerance &&
    Math.abs(d[i + 1]! - targetG) <= tolerance &&
    Math.abs(d[i + 2]! - targetB) <= tolerance

  const visited = new Uint8Array(width * height)
  const stack: Array<[number, number]> = [[x0, y0]]

  while (stack.length) {
    const [x, y] = stack.pop()!
    if (x! < 0 || x! >= width || y! < 0 || y! >= height) continue
    const vi = y! * width + x!
    if (visited[vi]) continue
    if (!match(vi * 4)) continue

    visited[vi] = 1
    const di = vi * 4
    d[di] = fillR
    d[di + 1] = fillG
    d[di + 2] = fillB
    d[di + 3] = 255

    stack.push([x! + 1, y!], [x! - 1, y!], [x!, y! + 1], [x!, y! - 1])
  }

  ctx.putImageData(imageData, 0, 0)
}
