import { CANVAS_H, CANVAS_W, DEFAULT_SETTINGS, type Clip, type Settings, type Source } from '../types'
import { indexAt, labelForRank, layout, ranksOf, totalDuration, type Placed } from '../timeline'
import { drawOverlays, drawVideo } from './draw'

/**
 * Plays the timeline into a canvas. Lives outside React: the UI pushes data in with
 * setData() and reads the playhead with subscribe()/getTime().
 */
export class Player {
  private canvas: HTMLCanvasElement | null = null
  private clips: Clip[] = []
  private settings: Settings = DEFAULT_SETTINGS
  private placed: Placed[] = []

  private videos = new Map<string, HTMLVideoElement>()
  private container: HTMLDivElement

  private time = 0
  private playing = false
  private activeIndex = -1
  private activeClipId: string | null = null
  private preparedNext: string | null = null

  private audioCtx: AudioContext | null = null
  private mix: GainNode | null = null
  private monitor: GainNode | null = null
  private audioNodes = new Map<string, MediaElementAudioSourceNode>()
  private muted = false

  private listeners = new Set<() => void>()
  private onEnded: (() => void) | null = null

  constructor() {
    this.container = document.createElement('div')
    this.container.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-10px;top:-10px'
    document.body.appendChild(this.container)
    const loop = () => {
      requestAnimationFrame(loop)
      if (this.playing) this.step()
      this.draw()
    }
    requestAnimationFrame(loop)
  }

  // ---- public API -------------------------------------------------------

  attach(canvas: HTMLCanvasElement | null) {
    this.canvas = canvas
  }

  setData(sources: Source[], clips: Clip[], settings: Settings) {
    this.clips = clips
    this.settings = settings
    this.placed = layout(clips)
    for (const s of sources) this.ensureVideo(s)
    for (const [id, v] of this.videos) {
      if (!sources.some((s) => s.id === id)) {
        v.pause()
        v.remove()
        this.videos.delete(id)
        this.audioNodes.get(id)?.disconnect()
        this.audioNodes.delete(id)
      }
    }
    const total = totalDuration(this.placed)
    if (this.time > total) this.time = total
    if (this.playing) {
      // Clip list changed under us: re-resolve the active clip on the next frame.
      if (this.placed[this.activeIndex]?.clip.id !== this.activeClipId) this.activeIndex = -1
    } else {
      this.syncPaused()
    }
    this.emit()
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getTime = () => this.time
  isPlaying = () => this.playing
  isMuted = () => this.muted
  getDuration = () => totalDuration(this.placed)

  play() {
    if (!this.placed.length) return
    if (this.time >= this.getDuration() - 0.02) this.time = 0
    this.ensureAudio()
    this.playing = true
    this.activeIndex = -1
    this.emit()
  }

  pause() {
    this.playing = false
    for (const v of this.videos.values()) v.pause()
    this.syncPaused()
    this.emit()
  }

  toggle() {
    if (this.playing) this.pause()
    else this.play()
  }

  seek(t: number) {
    this.time = Math.min(Math.max(0, t), this.getDuration())
    if (this.playing) {
      for (const v of this.videos.values()) v.pause()
      this.activeIndex = -1
    } else {
      this.syncPaused()
    }
    this.emit()
  }

  /** Jump to the start of the previous (-1) or next (+1) clip. */
  jump(dir: -1 | 1) {
    const i = indexAt(this.placed, this.time)
    if (i < 0) return
    const p = this.placed[i]
    if (dir === -1) {
      const back = this.time - p.start > 0.5 ? i : Math.max(0, i - 1)
      this.seek(this.placed[back].start)
    } else if (i + 1 < this.placed.length) {
      this.seek(this.placed[i + 1].start)
    } else {
      this.seek(this.getDuration())
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.monitor) this.monitor.gain.value = muted ? 0 : 1
    this.emit()
  }

  /**
   * Plays the whole timeline from the start in real time while recording the canvas and the
   * audio. Resolves with the encoded video, or null if cancelled.
   */
  async record(onProgress: (p: number) => void, signal: AbortSignal): Promise<{ blob: Blob; ext: string } | null> {
    if (!this.canvas || !this.placed.length) return null
    this.pause()
    this.ensureAudio()
    await this.audioCtx!.resume()
    this.seek(0)
    await this.waitForFrame(this.placed[0].clip.sourceId)
    if (signal.aborted) return null

    const stream = this.canvas.captureStream(30)
    const audioDest = this.audioCtx!.createMediaStreamDestination()
    this.mix!.connect(audioDest)
    for (const track of audioDest.stream.getAudioTracks()) stream.addTrack(track)

    const { mimeType, ext } = pickMimeType()
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 10_000_000, audioBitsPerSecond: 192_000 })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    const stopped = new Promise<void>((res) => (recorder.onstop = () => res()))

    const unsubscribe = this.subscribe(() => onProgress(this.time / Math.max(0.001, this.getDuration())))
    const ended = new Promise<void>((res) => (this.onEnded = res))
    const abort = () => this.finish()
    signal.addEventListener('abort', abort)

    recorder.start(250)
    this.play()
    await ended

    recorder.stop()
    await stopped
    signal.removeEventListener('abort', abort)
    unsubscribe()
    this.mix!.disconnect(audioDest)
    stream.getTracks().forEach((t) => t.stop())

    if (signal.aborted) return null
    return { blob: new Blob(chunks, { type: mimeType }), ext }
  }

  // ---- internals --------------------------------------------------------

  private emit() {
    for (const fn of this.listeners) fn()
  }

  private ensureVideo(source: Source) {
    if (this.videos.has(source.id)) return
    const v = document.createElement('video')
    v.src = source.url
    v.preload = 'auto'
    v.playsInline = true
    v.addEventListener('seeked', () => this.emit())
    this.container.appendChild(v)
    this.videos.set(source.id, v)
    if (this.audioCtx) this.connectAudio(source.id, v)
  }

  /** Audio must be routed through Web Audio so it can be recorded. Needs a user gesture. */
  private ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext()
      this.mix = this.audioCtx.createGain()
      this.monitor = this.audioCtx.createGain()
      this.monitor.gain.value = this.muted ? 0 : 1
      this.mix.connect(this.monitor)
      this.monitor.connect(this.audioCtx.destination)
    }
    void this.audioCtx.resume()
    for (const [id, v] of this.videos) this.connectAudio(id, v)
  }

  private connectAudio(id: string, v: HTMLVideoElement) {
    if (this.audioNodes.has(id) || !this.audioCtx || !this.mix) return
    const node = this.audioCtx.createMediaElementSource(v)
    node.connect(this.mix)
    this.audioNodes.set(id, node)
  }

  private waitForFrame(sourceId: string) {
    const v = this.videos.get(sourceId)
    if (!v || (v.readyState >= 2 && !v.seeking)) return Promise.resolve()
    return new Promise<void>((res) => {
      const done = () => {
        v.removeEventListener('seeked', done)
        v.removeEventListener('loadeddata', done)
        res()
      }
      v.addEventListener('seeked', done)
      v.addEventListener('loadeddata', done)
      setTimeout(done, 3000)
    })
  }

  /** While paused, make the current clip's video show the frame under the playhead. */
  private syncPaused() {
    const i = indexAt(this.placed, this.time)
    if (i < 0) return
    const { clip, start } = this.placed[i]
    const v = this.videos.get(clip.sourceId)
    if (!v) return
    const target = Math.min(clip.trimEnd, clip.trimStart + (this.time - start))
    if (Math.abs(v.currentTime - target) > 0.02) v.currentTime = target
  }

  private startClip(i: number, fromStart: boolean) {
    const p = this.placed[i]
    if (fromStart) this.time = p.start
    const v = this.videos.get(p.clip.sourceId)
    for (const other of this.videos.values()) if (other !== v) other.pause()
    this.activeIndex = i
    this.activeClipId = p.clip.id
    this.preparedNext = null
    if (!v) return
    const target = p.clip.trimStart + (this.time - p.start)
    if (Math.abs(v.currentTime - target) > 0.05) v.currentTime = target
    v.play().catch(() => {
      // Autoplay refused or source broken: stop rather than spin.
      if (this.activeClipId === p.clip.id) this.pause()
    })
  }

  private step() {
    if (!this.placed.length) return this.finish()
    if (this.activeIndex < 0 || this.placed[this.activeIndex]?.clip.id !== this.activeClipId) {
      this.startClip(indexAt(this.placed, this.time), false)
      return
    }
    const i = this.activeIndex
    const { clip, start } = this.placed[i]
    const v = this.videos.get(clip.sourceId)
    if (!v) return this.finish()

    if (v.currentTime >= clip.trimEnd - 0.03 || v.ended) {
      if (i + 1 >= this.placed.length) {
        this.time = this.getDuration()
        return this.finish()
      }
      this.startClip(i + 1, true)
      return
    }

    this.time = start + Math.max(0, v.currentTime - clip.trimStart)

    // Pre-seek the next clip's video so the cut doesn't stall.
    const next = this.placed[i + 1]
    if (next && next.clip.sourceId !== clip.sourceId && this.preparedNext !== next.clip.id && clip.trimEnd - v.currentTime < 0.6) {
      const nv = this.videos.get(next.clip.sourceId)
      if (nv) nv.currentTime = next.clip.trimStart
      this.preparedNext = next.clip.id
    }
    this.emit()
  }

  private finish() {
    this.playing = false
    for (const v of this.videos.values()) v.pause()
    this.activeIndex = -1
    this.emit()
    const cb = this.onEnded
    this.onEnded = null
    cb?.()
  }

  private draw() {
    const canvas = this.canvas
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (canvas.width !== CANVAS_W) canvas.width = CANVAS_W
    if (canvas.height !== CANVAS_H) canvas.height = CANVAS_H

    const s = this.settings
    ctx.fillStyle = s.background
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    const i = this.playing && this.activeIndex >= 0 ? this.activeIndex : indexAt(this.placed, this.time)
    const active = i >= 0 ? this.placed[i] : null
    if (active) {
      const v = this.videos.get(active.clip.sourceId)
      if (v && v.readyState >= 2) drawVideo(ctx, v, s.fit)
    }

    const ranks = ranksOf(this.clips)
    const labels = new Map(ranks.map((r) => [r, labelForRank(this.clips, r)]))
    const revealed = new Set<number>()
    if (active) for (let k = 0; k <= i; k++) revealed.add(this.placed[k].clip.rank)
    drawOverlays(ctx, s, { time: this.time, ranks, labels, revealed, activeRank: active?.clip.rank ?? null })
  }
}

function pickMimeType(): { mimeType: string; ext: string } {
  const candidates: [string, string][] = [
    ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'],
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm;codecs=vp8,opus', 'webm'],
    ['video/webm', 'webm'],
  ]
  for (const [type, ext] of candidates) if (MediaRecorder.isTypeSupported(type)) return { mimeType: type, ext }
  return { mimeType: '', ext: 'webm' }
}

export const player = new Player()
