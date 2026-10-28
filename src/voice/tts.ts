import type { VoiceSegment } from '../types'
import { concatBuffers, decodeBlob } from './audio'

/** Piper voices offered in the UI (they run fully in the browser). */
export const VOICES: { id: string; label: string }[] = [
  { id: 'es_ES-davefx-medium', label: 'Español (España) · Dave' },
  { id: 'es_ES-sharvard-medium', label: 'Español (España) · Sharvard' },
  { id: 'es_MX-claude-high', label: 'Español (México) · Claude' },
  { id: 'es_MX-ald-medium', label: 'Español (México) · Ald' },
  { id: 'ca_ES-upc_ona-medium', label: 'Català · Ona' },
  { id: 'en_US-hfc_female-medium', label: 'English (US) · Female' },
  { id: 'en_US-ryan-high', label: 'English (US) · Ryan' },
  { id: 'en_GB-alan-medium', label: 'English (UK) · Alan' },
]

export interface TtsProgress {
  phase: 'download' | 'speak'
  /** 0..1 */
  value: number
}

const GAP = 0.35
const LEAD = 0.15

type Piper = typeof import('@mintplex-labs/piper-tts-web')
let session: { voiceId: string; tts: InstanceType<Piper['TtsSession']> } | null = null

/** One Piper session per voice. The library keeps a singleton, so it is reset when the voice changes. */
async function getSession(voiceId: string, onDownload: (value: number) => void) {
  const { TtsSession, INFERENCE_PROGRESS_URL } = await import('@mintplex-labs/piper-tts-web')
  if (session?.voiceId !== voiceId) {
    TtsSession._instance = null
    const tts = new TtsSession({
      voiceId,
      progress: (p) => p.url !== INFERENCE_PROGRESS_URL && p.total && onDownload(p.loaded / p.total),
      wasmPaths: { ...TtsSession.WASM_LOCATIONS, onnxWasm: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${__ORT_VERSION__}/dist/` },
    })
    session = { voiceId, tts }
    try {
      await tts.waitReady
    } catch (e) {
      session = null
      throw e
    }
  }
  return session.tts
}

/**
 * Speaks each part separately and joins them, so we know exactly where every rank's line
 * starts and ends. The first use of a voice downloads its model (cached afterwards).
 */
export async function generateVoice(
  parts: { rank: number | null; text: string }[],
  voiceId: string,
  onProgress: (p: TtsProgress) => void,
): Promise<{ buffer: AudioBuffer; segments: VoiceSegment[] }> {
  onProgress({ phase: 'download', value: 0 })
  const tts = await getSession(voiceId, (value) => onProgress({ phase: 'download', value }))
  const buffers: AudioBuffer[] = []
  for (let i = 0; i < parts.length; i++) {
    onProgress({ phase: 'speak', value: i / parts.length })
    // Let the progress paint before inference blocks the main thread.
    await new Promise((r) => setTimeout(r, 30))
    buffers.push(await decodeBlob(await tts.predict(parts[i].text)))
  }
  onProgress({ phase: 'speak', value: 1 })
  const { buffer, offsets } = concatBuffers(buffers, GAP, LEAD)
  const segments = parts.map((p, i) => ({ ...p, start: offsets[i], end: offsets[i] + buffers[i].duration }))
  return { buffer, segments }
}
