import type { Clip } from './types'

export interface Placed {
  clip: Clip
  start: number
  end: number
}

export const clipDuration = (c: Clip) => Math.max(0, c.trimEnd - c.trimStart)

export function layout(clips: Clip[]): Placed[] {
  let t = 0
  return clips.map((clip) => {
    const start = t
    t += clipDuration(clip)
    return { clip, start, end: t }
  })
}

export const totalDuration = (placed: Placed[]) => (placed.length ? placed[placed.length - 1].end : 0)

/** Index of the clip playing at time t (the last clip if t is at or past the end). */
export function indexAt(placed: Placed[], t: number): number {
  if (!placed.length) return -1
  for (let i = 0; i < placed.length; i++) {
    if (t < placed[i].end) return i
  }
  return placed.length - 1
}

export function formatTime(t: number, withCents = true): string {
  const safe = Math.max(0, t)
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  const base = `${m}:${String(s).padStart(2, '0')}`
  if (!withCents) return base
  const cs = Math.floor((safe * 100) % 100)
  return `${base}.${String(cs).padStart(2, '0')}`
}

export const uid = () => Math.random().toString(36).slice(2, 10)

/** Distinct ranks in ascending order (1 first). */
export const ranksOf = (clips: Clip[]) => [...new Set(clips.map((c) => c.rank))].sort((a, b) => a - b)

/** Label for a rank: the first non-empty label among clips that share it. */
export function labelForRank(clips: Clip[], rank: number): string {
  return clips.find((c) => c.rank === rank && c.label.trim())?.label.trim() ?? ''
}
