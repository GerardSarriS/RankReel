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
