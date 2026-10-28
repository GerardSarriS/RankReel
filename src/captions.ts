import type { VoiceSegment, Word } from './types'

const clean = (w: string) => w.replace(/^[.,;:]+|[.,;:]+$/g, '')

/**
 * Word timings estimated from a generated voice: each part's words are spread over its
 * segment in proportion to their length. Good enough for captions without a transcription.
 */
export function estimateWords(segments: VoiceSegment[]): Word[] {
  const out: Word[] = []
  for (const seg of segments) {
    const words = seg.text.split(/\s+/).filter(Boolean)
    const weights = words.map((w) => w.length + 2)
    const total = weights.reduce((a, b) => a + b, 0)
    let t = seg.start
    words.forEach((w, i) => {
      const d = ((seg.end - seg.start) * weights[i]) / total
      out.push({ text: w, start: t, end: t + d })
      t += d
    })
  }
  return out
}

export interface CaptionChunk {
  words: Word[]
  start: number
  end: number
}

/** Groups words into on-screen chunks of at most `max` words, breaking after punctuation. */
export function chunkWords(words: Word[], max: number): CaptionChunk[] {
  const chunks: CaptionChunk[] = []
  let current: Word[] = []
  const flush = () => {
    if (!current.length) return
    chunks.push({ words: current, start: current[0].start, end: current[current.length - 1].end })
    current = []
  }
  for (const w of words) {
    const text = clean(w.text)
    if (!text) continue
    // A long pause also starts a new chunk.
    if (current.length && w.start - current[current.length - 1].end > 0.6) flush()
    current.push({ ...w, text })
    if (current.length >= max || /[.,!?;:]$/.test(w.text)) flush()
  }
  flush()
  return chunks
}

/** The chunk on screen at time t, held until the next one starts (up to a short tail). */
export function chunkAt(chunks: CaptionChunk[], t: number): CaptionChunk | null {
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    const until = Math.min(chunks[i + 1]?.start ?? Infinity, c.end + 0.4)
    if (t >= c.start && t < until) return c
  }
  return null
}
