/** Decodes any audio (or video) blob the browser understands. */
export async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const data = await blob.arrayBuffer()
  const ctx = new OfflineAudioContext(1, 1, 44100)
  return ctx.decodeAudioData(data)
}

/** Joins buffers one after another with `gap` seconds of silence between them. */
export function concatBuffers(buffers: AudioBuffer[], gap: number, lead = 0): { buffer: AudioBuffer; offsets: number[] } {
  const rate = buffers[0].sampleRate
  const gapLen = Math.round(gap * rate)
  const leadLen = Math.round(lead * rate)
  const length = leadLen + buffers.reduce((n, b) => n + b.length, 0) + gapLen * (buffers.length - 1) + gapLen
  const out = new AudioBuffer({ length, sampleRate: rate, numberOfChannels: 1 })
  const channel = out.getChannelData(0)
  const offsets: number[] = []
  let pos = leadLen
  for (const b of buffers) {
    offsets.push(pos / rate)
    channel.set(b.getChannelData(0), pos)
    pos += b.length + gapLen
  }
  return { buffer: out, offsets }
}

/** Mono, 16 kHz samples, as speech recognition models expect. */
export async function toMono16k(buffer: AudioBuffer): Promise<Float32Array> {
  const rate = 16000
  const ctx = new OfflineAudioContext(1, Math.ceil(buffer.duration * rate), rate)
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.connect(ctx.destination)
  src.start()
  const rendered = await ctx.startRendering()
  return rendered.getChannelData(0)
}

/** Records the microphone until stop() is called. */
export async function startMicRecording(): Promise<{ stop: () => Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  recorder.start()
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          resolve(new Blob(chunks, { type: recorder.mimeType }))
        }
        recorder.stop()
      }),
  }
}
