import { CANVAS_H, CANVAS_W, type Settings } from '../types'

export interface OverlayInfo {
  time: number
  /** Ranks in ascending order (1 first). */
  ranks: number[]
  labels: Map<number, string>
  /** Ranks whose clips have already started. */
  revealed: Set<number>
  activeRank: number | null
}

const fontString = (s: Settings, size: number) => `900 ${size}px "${s.font}", sans-serif`

export function drawVideo(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, fit: Settings['fit']) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return
  const scale = fit === 'fill' ? Math.max(CANVAS_W / vw, CANVAS_H / vh) : Math.min(CANVAS_W / vw, CANVAS_H / vh)
  const w = vw * scale
  const h = vh * scale
  ctx.drawImage(video, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h)
}

function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string, outline: string) {
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.lineWidth = size * 0.18
  ctx.strokeStyle = outline
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}

/** Greedy word wrap. Returns lines as arrays of word indices. */
function wrap(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number): number[][] {
  const lines: number[][] = []
  let line: number[] = []
  for (let i = 0; i < words.length; i++) {
    const candidate = [...line, i].map((j) => words[j]).join(' ')
    if (line.length && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = [i]
    } else {
      line.push(i)
    }
  }
  if (line.length) lines.push(line)
  return lines
}

/** Draws the hook title centered at the top. Returns the y where it ends. */
function drawTitle(ctx: CanvasRenderingContext2D, s: Settings, top: number): number {
  const words = s.hookText.split(/\s+/).filter(Boolean)
  if (!words.length) return top
  const size = s.titleSize
  ctx.font = fontString(s, size)
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const lineH = size * 1.12
  const space = ctx.measureText(' ').width
  const lines = wrap(ctx, words, CANVAS_W - 120)
  lines.forEach((line, li) => {
    const widths = line.map((i) => ctx.measureText(words[i]).width)
    const total = widths.reduce((a, b) => a + b, 0) + space * (line.length - 1)
    let x = (CANVAS_W - total) / 2
    const y = top + li * lineH
    line.forEach((i, k) => {
      const color = s.hookHighlights.includes(i) ? s.highlightColor : s.textColor
      outlined(ctx, words[i], x, y, size, color, s.outlineColor)
      x += widths[k] + space
    })
  })
  return top + lines.length * lineH
}

function drawCountdown(ctx: CanvasRenderingContext2D, s: Settings, info: OverlayInfo, top: number) {
  const size = Math.round(s.titleSize * 0.62)
  const lineH = size * 1.4
  ctx.font = fontString(s, size)
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const x = 60
  info.ranks.forEach((rank, i) => {
    const y = top + i * lineH
    const revealed = info.revealed.has(rank)
    const active = rank === info.activeRank
    const num = `${rank}.`
    ctx.globalAlpha = revealed ? 1 : 0.55
    outlined(ctx, num, x, y, size, active ? s.highlightColor : s.textColor, s.outlineColor)
    ctx.globalAlpha = 1
    const label = info.labels.get(rank)
    if (revealed && label) {
      const nx = x + ctx.measureText(num).width + size * 0.3
      outlined(ctx, label, nx, y, size, s.textColor, s.outlineColor)
    }
  })
}

function drawBadge(ctx: CanvasRenderingContext2D, s: Settings, rank: number) {
  const size = 96
  ctx.font = fontString(s, size)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  const text = `#${rank}`
  const padX = 44
  const w = ctx.measureText(text).width + padX * 2
  const h = size * 1.35
  const x = 60
  const y = CANVAS_H - 340
  ctx.fillStyle = s.highlightColor
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = s.outlineColor
  ctx.stroke()
  ctx.fillStyle = s.outlineColor
  ctx.fillText(text, x + w / 2, y + h / 2 + 4)
}

function drawSegmentLabel(ctx: CanvasRenderingContext2D, s: Settings, label: string) {
  const size = Math.round(s.titleSize * 1.4)
  ctx.font = fontString(s, size)
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  const words = label.split(/\s+/).filter(Boolean)
  const lines = wrap(ctx, words, CANVAS_W - 120)
  const lineH = size * 1.08
  const top = CANVAS_H * 0.72 - (lines.length * lineH) / 2
  lines.forEach((line, i) => {
    outlined(ctx, line.map((j) => words[j]).join(' '), CANVAS_W / 2, top + i * lineH, size, s.highlightColor, s.outlineColor)
  })
}

export function drawOverlays(ctx: CanvasRenderingContext2D, s: Settings, info: OverlayInfo) {
  const showTitle = s.hookOn && (s.rankingOn || info.time < s.hookSeconds)
  let y = 110
  if (showTitle) y = drawTitle(ctx, s, y) + 40

  if (!s.rankingOn) return
  if (s.countdownOn && info.ranks.length) drawCountdown(ctx, s, info, Math.max(y, 160))
  if (info.activeRank == null) return
  if (s.segmentLabelOn) {
    const label = info.labels.get(info.activeRank)
    if (label) drawSegmentLabel(ctx, s, label)
  }
  if (s.badgeOn) drawBadge(ctx, s, info.activeRank)
}
