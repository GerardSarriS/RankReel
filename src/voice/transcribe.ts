import type { Word } from '../types'
import { toMono16k } from './audio'
import type { WorkerMessage, WorkerRequest } from './whisper.worker'

export interface TranscribeProgress {
  status: string
  /** 0..1 while downloading the model, null otherwise. */
  value: number | null
}

/** Word-level transcription with Whisper, in a worker. The model (~80 MB) is cached by the browser. */
export async function transcribe(buffer: AudioBuffer, language: string | null, onProgress: (p: TranscribeProgress) => void): Promise<Word[]> {
  const audio = await toMono16k(buffer)
  const worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' })
  try {
    return await new Promise<Word[]>((resolve, reject) => {
      let status = 'Preparando…'
      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const m = e.data
        if (m.type === 'status') onProgress({ status: (status = m.text), value: null })
        else if (m.type === 'progress') onProgress({ status, value: m.value })
        else if (m.type === 'done') resolve(m.words)
        else reject(new Error(m.message))
      }
      worker.onerror = (e) => reject(new Error(e.message))
      worker.postMessage({ audio, language } satisfies WorkerRequest, [audio.buffer])
    })
  } finally {
    worker.terminate()
  }
}
