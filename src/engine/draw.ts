import { CANVAS_H, CANVAS_W, type Settings } from '../types'
import { chunkAt, type CaptionChunk } from '../captions'

export interface OverlayInfo {
  time: number
  /** Ranks in ascending order (1 first). */
  ranks: number[]
  labels: Map<number, string>
  /** Ranks whose clips have already started. */
  revealed: Set<number>
  activeRank: number | null
  captions: CaptionChunk[]
}

const fontString = (s: Settings, size: number) => `900 ${size}px "${s.font}", sans-serif`

/** Area the video occupies: the whole canvas, or what is left under the top band. */
export function videoArea(s: Settings) {
  const top = s.bandOn ? Math.min(s.bandHeight, CANVAS_H - 200) : 0
  return { x: 0, y: top, w: CANVAS_W, h: CANVAS_H - top }
}

export function drawVideo(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, s: Settings) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return
  const a = videoArea(s)
  const scale = s.fit === 'fill' ? Math.max(a.w / vw, a.h / vh) : Math.min(a.w / vw, a.h / vh)
  const w = vw * scale
  const h = vh * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(a.x, a.y, a.w, a.h)
  ctx.clip()
  ctx.drawImage(video, a.x + (a.w - w) / 2, a.y + (a.h - h) / 2, w, h)
  ctx.restore()
}

export function drawBand(ctx: CanvasRenderingContext2D, s: Settings) {
  if (!s.bandOn) return
  ctx.fillStyle = s.bandColor
  ctx.fillRect(0, 0, CANVAS_W, videoArea(s).y)
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

/** Draws the hook title centered at the top (or in the middle of the band). */
function drawTitle(ctx: CanvasRenderingContext2D, s: Settings) {
  const words = s.hookText.split(/\s+/).filter(Boolean)
  if (!words.length) return
  const size = s.titleSize
  ctx.font = fontString(s, size)
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const lineH = size * 1.12
  const space = ctx.measureText(' ').width
  const lines = wrap(ctx, words, CANVAS_W - 120)
  const top = s.bandOn ? Math.max(30, (videoArea(s).y - lines.length * lineH) / 2) : 110
  lines.forEach((line, li) => {
    const widths = line.map((i) => ctx.measureText(words[i]).width)
    const total = widths.reduce((a, b) => a + b, 0) + space * (line.length - 1)
    let x = (CANVAS_W - total) / 2
    const y = top + li * lineH
    line.forEach((i, k) => {
      outlined(ctx, words[i], x, y, size, s.hookWordColors[i] ?? s.textColor, s.outlineColor)
      x += widths[k] + space
    })
  })
}

function drawCountdown(ctx: CanvasRenderingContext2D, s: Settings, info: OverlayInfo) {
  const size = s.listSize
  const lineH = size * s.listSpacing
  ctx.font = fontString(s, size)
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const x = s.listX
  info.ranks.forEach((rank, i) => {
    const y = s.listY + i * lineH
    const revealed = info.revealed.has(rank)
    const color = s.rankColors[rank] ?? s.textColor
    const num = `${rank}.`
    ctx.globalAlpha = revealed ? 1 : 0.55
    outlined(ctx, num, x, y, size, s.listHighlightActive && rank === info.activeRank ? s.highlightColor : color, s.outlineColor)
    ctx.globalAlpha = 1
    const label = info.labels.get(rank)
    if (revealed && label) {
      const nx = x + ctx.measureText(num).width + size * 0.3
      outlined(ctx, label, nx, y, size, color, s.outlineColor)
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

function drawCaptions(ctx: CanvasRenderingContext2D, s: Settings, chunk: CaptionChunk, t: number) {
  const size = s.captionSize
  ctx.font = fontString(s, size)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const words = chunk.words.map((w) => (s.captionUpper ? w.text.toUpperCase() : w.text))
  // The word being spoken (or the last one already said) is highlighted.
  let current = -1
  chunk.words.forEach((w, i) => {
    if (t >= w.start) current = i
  })
  const space = ctx.measureText(' ').width
  const lines = wrap(ctx, words, CANVAS_W - 140)
  const lineH = size * 1.15
  const top = s.captionY * CANVAS_H - ((lines.length - 1) * lineH) / 2
  lines.forEach((line, li) => {
    const widths = line.map((i) => ctx.measureText(words[i]).width)
    let x = (CANVAS_W - (widths.reduce((a, b) => a + b, 0) + space * (line.length - 1))) / 2
    line.forEach((i, k) => {
      outlined(ctx, words[i], x, top + li * lineH, size, i === current ? s.highlightColor : s.textColor, s.outlineColor)
      x += widths[k] + space
    })
  })
}

export function drawOverlays(ctx: CanvasRenderingContext2D, s: Settings, info: OverlayInfo) {
  drawBand(ctx, s)
  if (s.hookOn && (s.rankingOn || info.time < s.hookSeconds)) drawTitle(ctx, s)

  if (s.captionsOn) {
    const chunk = chunkAt(info.captions, info.time)
    if (chunk) drawCaptions(ctx, s, chunk, info.time)
  }

  if (!s.rankingOn) return
  if (s.countdownOn && info.ranks.length) drawCountdown(ctx, s, info)
  if (info.activeRank == null) return
  if (s.segmentLabelOn) {
    const label = info.labels.get(info.activeRank)
    if (label) drawSegmentLabel(ctx, s, label)
  }
  if (s.badgeOn) drawBadge(ctx, s, info.activeRank)
}
