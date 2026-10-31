import { CANVAS_H, CANVAS_W, type Settings, type WatermarkPosition } from '../types'
import { chunkAt, type CaptionChunk } from '../captions'
import { titleLines } from '../timeline'

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

/** Draws the hook title centered at the top (or in the middle of the band). Keeps the user's line breaks. */
function drawTitle(ctx: CanvasRenderingContext2D, s: Settings) {
  const paragraphs = titleLines(s.hookText)
  if (!paragraphs.length) return
  const size = s.titleSize
  ctx.font = fontString(s, size)
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const lineH = size * 1.12
  const space = ctx.measureText(' ').width
  const words: string[] = []
  paragraphs.flat().forEach((w) => (words[w.index] = w.text))
  // Each of the user's lines still wraps if it is too wide.
  const lines = paragraphs.flatMap((p) =>
    wrap(
      ctx,
      p.map((w) => w.text),
      CANVAS_W - 120,
    ).map((line) => line.map((k) => p[k].index)),
  )
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

const images = new Map<string, HTMLImageElement>()

/** Decoded logo for a data URL; null until it has loaded (the next frame picks it up). */
function imageFor(src: string): HTMLImageElement | null {
  let img = images.get(src)
  if (!img) {
    img = new Image()
    img.src = src
    images.clear()
    images.set(src, img)
  }
  return img.complete && img.naturalWidth ? img : null
}

const CORNERS: WatermarkPosition[] = ['top-left', 'bottom-right', 'top-right', 'bottom-left']

function drawWatermark(ctx: CanvasRenderingContext2D, s: Settings, time: number) {
  const pos = s.watermarkMoving ? CORNERS[Math.floor(time / 4) % CORNERS.length] : s.watermarkPosition
  const margin = 48
  let w: number
  let h: number
  let img: HTMLImageElement | null = null
  if (s.watermarkType === 'image') {
    if (!s.watermarkImage || !(img = imageFor(s.watermarkImage))) return
    w = s.watermarkSize * 4
    h = (w * img.naturalHeight) / img.naturalWidth
  } else {
    if (!s.watermarkText.trim()) return
    ctx.font = fontString(s, s.watermarkSize)
    w = ctx.measureText(s.watermarkText).width
    h = s.watermarkSize
  }
  const x = pos.endsWith('left') ? margin : pos.endsWith('right') ? CANVAS_W - margin - w : (CANVAS_W - w) / 2
  // Top: in the margin above the title. Bottom: clear of TikTok's own caption and buttons.
  const y = pos.startsWith('top') ? 36 : CANVAS_H - 260 - h

  ctx.save()
  ctx.globalAlpha = s.watermarkOpacity
  if (img) ctx.drawImage(img, x, y, w, h)
  else {
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = s.watermarkSize * 0.25
    outlined(ctx, s.watermarkText, x, y, s.watermarkSize * 0.6, s.textColor, s.outlineColor)
  }
  ctx.restore()
}

export function drawOverlays(ctx: CanvasRenderingContext2D, s: Settings, info: OverlayInfo) {
  drawContent(ctx, s, info)
  if (s.watermarkOn) drawWatermark(ctx, s, info.time)
}

function drawContent(ctx: CanvasRenderingContext2D, s: Settings, info: OverlayInfo) {
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
