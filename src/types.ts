export type FontId = 'Archivo' | 'Rubik' | 'Anton' | 'Bebas Neue'

export const FONTS: FontId[] = ['Archivo', 'Rubik', 'Anton', 'Bebas Neue']

/** An imported video file. Several clips can point to the same source (after a split). */
export interface Source {
  id: string
  name: string
  url: string
  duration: number
  width: number
  height: number
}

/** A segment of a source placed on the timeline. */
export interface Clip {
  id: string
  sourceId: string
  trimStart: number
  trimEnd: number
  /** Position in the ranking (1 = best). Stays with the clip when the order changes. */
  rank: number
  label: string
}

export interface Settings {
  rankingOn: boolean
  badgeOn: boolean
  segmentLabelOn: boolean
  countdownOn: boolean

  fit: 'fill' | 'fit'
  background: string

  hookOn: boolean
  hookText: string
  /** Indices of highlighted words in hookText. */
  hookHighlights: number[]
  /** How long the title stays on screen when the ranking is off. */
  hookSeconds: number

  font: FontId
  titleSize: number
  textColor: string
  highlightColor: string
  outlineColor: string

  captionsOn: boolean
  /** Max words on screen at once. */
  captionWords: number
  captionSize: number
  /** Vertical position of the captions, 0 (top) to 1 (bottom). */
  captionY: number
  captionUpper: boolean

  voiceVolume: number
  clipVolume: number
}

export const DEFAULT_SETTINGS: Settings = {
  rankingOn: true,
  badgeOn: false,
  segmentLabelOn: false,
  countdownOn: true,

  fit: 'fill',
  background: '#000000',

  hookOn: true,
  hookText: 'Ranking de los mejores momentos',
  hookHighlights: [3, 4],
  hookSeconds: 3,

  font: 'Rubik',
  titleSize: 80,
  textColor: '#ffffff',
  highlightColor: '#ffe600',
  outlineColor: '#000000',

  captionsOn: true,
  captionWords: 3,
  captionSize: 84,
  captionY: 0.7,
  captionUpper: true,

  voiceVolume: 1,
  clipVolume: 0.35,
}

export const CANVAS_W = 1080
export const CANVAS_H = 1920

/** Text the voiceover reads: an intro and one line per rank. Missing lines use a default. */
export interface Script {
  intro: string | null
  items: Record<number, string>
}

/** Where each part of a generated voiceover sits, so clips can be cut against it. */
export interface VoiceSegment {
  rank: number | null // null = intro
  text: string
  start: number
  end: number
}

export interface Voiceover {
  buffer: AudioBuffer
  origin: 'tts' | 'upload' | 'record'
  name: string
  /** Only known for generated voices. */
  segments: VoiceSegment[] | null
}

export interface Word {
  text: string
  start: number
  end: number
}

export interface Captions {
  words: Word[]
  origin: 'script' | 'whisper'
}
