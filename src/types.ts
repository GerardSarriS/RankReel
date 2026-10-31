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

export type WatermarkPosition = 'top-left' | 'top' | 'top-right' | 'bottom-left' | 'bottom' | 'bottom-right'

export interface Settings {
  rankingOn: boolean
  badgeOn: boolean
  segmentLabelOn: boolean
  countdownOn: boolean

  fit: 'fill' | 'fit'
  background: string
  /** Solid band across the top for the title; the video plays below it. */
  bandOn: boolean
  bandHeight: number
  bandColor: string

  listX: number
  listY: number
  listSize: number
  /** Line height as a multiple of listSize. */
  listSpacing: number
  /** Color per rank (number and label). Ranks without one use textColor. */
  rankColors: Record<number, string>
  /** Paint the number of the rank that is playing with highlightColor. */
  listHighlightActive: boolean

  hookOn: boolean
  hookText: string
  /** Color per word of hookText, by word index. Words without one use textColor. */
  hookWordColors: Record<number, string>
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

  watermarkOn: boolean
  watermarkType: 'text' | 'image'
  watermarkText: string
  /** Logo as a data URL, so it lives with the rest of the settings. */
  watermarkImage: string | null
  watermarkPosition: WatermarkPosition
  /** Text height, or image width, in px on the 1080×1920 canvas. */
  watermarkSize: number
  watermarkOpacity: number
  /** Jump between corners every few seconds, so it's harder to crop out. */
  watermarkMoving: boolean

  voiceVolume: number
  clipVolume: number

  sfxVolume: number
  /** Effect played automatically every time the ranking moves to another position. */
  transitionSfx: string | null
  transitionVolume: number
}

export const DEFAULT_SETTINGS: Settings = {
  rankingOn: true,
  badgeOn: false,
  segmentLabelOn: false,
  countdownOn: true,

  fit: 'fill',
  background: '#000000',
  bandOn: false,
  bandHeight: 420,
  bandColor: '#000000',

  listX: 60,
  listY: 330,
  listSize: 50,
  listSpacing: 1.4,
  rankColors: {},
  listHighlightActive: true,

  hookOn: true,
  hookText: 'Ranking de los mejores momentos',
  hookWordColors: { 3: '#ffe600', 4: '#ffe600' },
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

  watermarkOn: false,
  watermarkType: 'text',
  watermarkText: '@tuusuario',
  watermarkImage: null,
  watermarkPosition: 'bottom-right',
  watermarkSize: 44,
  watermarkOpacity: 0.7,
  watermarkMoving: false,

  voiceVolume: 1,
  clipVolume: 0.35,

  sfxVolume: 1,
  transitionSfx: null,
  transitionVolume: 0.8,
}

/** Quick picks offered next to every color picker. */
export const PRESET_COLORS = ['#ffffff', '#ffe600', '#ff3d6e', '#00e5ff', '#39ff14', '#ff8a00', '#ff1f1f', '#b388ff']

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

/** A sound effect placed on the timeline. */
export interface PlacedSfx {
  id: string
  sfxId: string
  time: number
  volume: number
  /** Seconds skipped at the start of the sound. */
  offset: number
  /** Seconds played from `offset` on. */
  length: number
}
