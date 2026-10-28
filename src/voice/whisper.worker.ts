import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'

export type WorkerRequest = { audio: Float32Array; language: string | null }
export type WorkerMessage =
  | { type: 'progress'; value: number }
  | { type: 'status'; text: string }
  | { type: 'done'; words: { text: string; start: number; end: number }[] }
  | { type: 'error'; message: string }

const post = (m: WorkerMessage) => self.postMessage(m)

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null

function load() {
  const files = new Map<string, { loaded: number; total: number }>()
  asr ??= pipeline('automatic-speech-recognition', 'onnx-community/whisper-base_timestamped', {
    dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== 'progress' || !p.file || !p.total) return
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total })
      let loaded = 0
      let total = 0
      for (const f of files.values()) {
        loaded += f.loaded
        total += f.total
      }
      post({ type: 'progress', value: loaded / total })
    },
  }) as Promise<AutomaticSpeechRecognitionPipeline>
  return asr
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  try {
    post({ type: 'status', text: 'Descargando modelo…' })
    const model = await load()
    post({ type: 'status', text: 'Transcribiendo…' })
    const out = await model(e.data.audio, {
      return_timestamps: 'word',
      chunk_length_s: 30,
      ...(e.data.language ? { language: e.data.language, task: 'transcribe' } : {}),
    })
    const result = (Array.isArray(out) ? out[0] : out) as { chunks?: { text: string; timestamp: [number, number | null] }[] }
    const words = (result.chunks ?? [])
      .map((c) => ({ text: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 0.3 }))
      .filter((w) => w.text)
    post({ type: 'done', words })
  } catch (err) {
    post({ type: 'error', message: (err as Error).message })
  }
}
