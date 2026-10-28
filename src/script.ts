import type { Clip, Script, Source, Voiceover } from './types'
import { clipDuration, labelForRank } from './timeline'

/** Ranks in the order they first appear on the timeline. */
export function ranksInPlayOrder(clips: Clip[]): number[] {
  const seen: number[] = []
  for (const c of clips) if (!seen.includes(c.rank)) seen.push(c.rank)
  return seen
}

const numberWord = (voiceId: string) => (voiceId.startsWith('en') ? 'Number' : 'Número')

export function defaultItemText(clips: Clip[], rank: number, voiceId: string): string {
  const label = labelForRank(clips, rank)
  return label ? `${numberWord(voiceId)} ${rank}: ${label}.` : `${numberWord(voiceId)} ${rank}.`
}

/** The lines the voice will read, in play order. Empty lines are skipped. */
export function scriptParts(script: Script, clips: Clip[], hookText: string, voiceId: string) {
  const parts: { rank: number | null; text: string }[] = []
  const intro = (script.intro ?? hookText).trim()
  if (intro) parts.push({ rank: null, text: intro })
  for (const rank of ranksInPlayOrder(clips)) {
    const text = (script.items[rank] ?? defaultItemText(clips, rank, voiceId)).trim()
    if (text) parts.push({ rank, text })
  }
  return parts
}

/** Re-trims a clip to last `d` seconds, moving its start back if the source runs out. */
function withDuration(c: Clip, src: Source | undefined, d: number): Clip {
  const max = src?.duration ?? c.trimEnd
  const dur = Math.max(0.2, Math.min(d, max))
  if (c.trimStart + dur <= max) return { ...c, trimEnd: c.trimStart + dur }
  return { ...c, trimStart: max - dur, trimEnd: max }
}

/** Scales a set of clips so together they last `target` seconds. */
function scaleGroup(group: Clip[], sources: Source[], target: number): Map<string, Clip> {
  const total = group.reduce((n, c) => n + clipDuration(c), 0) || 1
  return new Map(
    group.map((c) => [
      c.id,
      withDuration(
        c,
        sources.find((s) => s.id === c.sourceId),
        (clipDuration(c) * target) / total,
      ),
    ]),
  )
}

export type FitResult = { clips: Clip[]; warning: string | null }

/**
 * Cuts the clips against the voiceover. With a generated voice every rank lasts exactly as long
 * as its line (the intro rides on the first rank); otherwise the whole timeline is stretched or
 * shortened to the voice's length.
 */
export function fitToVoice(clips: Clip[], sources: Source[], voice: Voiceover): FitResult {
  const duration = voice.buffer.duration
  const order = ranksInPlayOrder(clips)
  const spoken = voice.segments?.filter((s) => s.rank !== null).map((s) => s.rank as number)

  if (!voice.segments || !spoken || spoken.join() !== order.join()) {
    const updated = scaleGroup(clips, sources, duration)
    const warning = voice.segments ? 'El orden de los clips ha cambiado desde que se generó la voz: se ha ajustado solo la duración total.' : null
    return { clips: clips.map((c) => updated.get(c.id)!), warning }
  }

  const starts = voice.segments.filter((s) => s.rank !== null).map((s) => s.start)
  const updated = new Map<string, Clip>()
  order.forEach((rank, i) => {
    const from = i === 0 ? 0 : starts[i]
    const to = i + 1 < order.length ? starts[i + 1] : duration
    for (const [id, c] of scaleGroup(
      clips.filter((c) => c.rank === rank),
      sources,
      to - from,
    ))
      updated.set(id, c)
  })
  const fitted = clips.map((c) => updated.get(c.id)!)
  const total = fitted.reduce((n, c) => n + clipDuration(c), 0)
  const warning = total < duration - 0.1 ? 'Algún vídeo es más corto que su frase: la voz y los clips pueden desajustarse.' : null
  return { clips: fitted, warning }
}
