import type { Source } from './types'
import { uid } from './timeline'

/** Reads a video file's metadata and returns a Source pointing at an object URL. */
export function loadSource(file: File): Promise<Source> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      resolve({
        id: uid(),
        name: file.name,
        url,
        duration: v.duration,
        width: v.videoWidth,
        height: v.videoHeight,
      })
      v.removeAttribute('src')
      v.load()
    }
    v.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`No se puede leer ${file.name}`))
    }
    v.src = url
  })
}

/**
 * Downloads a TikTok video through /api/tiktok and returns it as an MP4 file.
 * `onProgress` gets 0..1 when the size is known, null otherwise.
 */
export async function downloadTikTok(link: string, onProgress: (p: number | null) => void): Promise<File> {
  const res = await fetch(`/api/tiktok?url=${encodeURIComponent(link)}`)
  if (!res.ok || !res.body) {
    const message = await res
      .json()
      .then((j: { error?: string }) => j.error)
      .catch(() => null)
    throw new Error(message ?? 'No se ha podido descargar el vídeo.')
  }
  const total = Number(res.headers.get('content-length')) || 0
  const name = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'tiktok.mp4'
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress(total ? loaded / total : null)
  }
  return new File(chunks as BlobPart[], name, { type: 'video/mp4' })
}
