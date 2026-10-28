import { useCallback, useEffect, useState } from 'react'
import { player } from './engine/Player'
import { DEFAULT_SETTINGS, type Captions, type Clip, type Script, type Settings, type Source, type Voiceover } from './types'
import { formatTime, layout, totalDuration, uid } from './timeline'
import { labelFromName, loadSource } from './media'
import { fitToVoice } from './script'
import { estimateWords } from './captions'
import { VOICES } from './voice/tts'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import { Preview } from './components/Preview'
import { Timeline } from './components/Timeline'
import { ClipInspector } from './components/ClipInspector'
import { RenderDialog } from './components/RenderDialog'

export default function App() {
  const [sources, setSources] = useState<Source[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [script, setScript] = useState<Script>({ intro: null, items: {} })
  const [voiceId, setVoiceId] = useState(VOICES[0].id)
  const [voice, setVoiceState] = useState<Voiceover | null>(null)
  const [captions, setCaptions] = useState<Captions | null>(null)

  useEffect(() => player.setData(sources, clips, settings), [sources, clips, settings])
  useEffect(() => player.setVoice(voice?.buffer ?? null), [voice])
  useEffect(() => player.setCaptions(captions?.words ?? []), [captions])

  /** A new voice brings its own captions when we know what it says. */
  const setVoice = (v: Voiceover | null) => {
    setVoiceState(v)
    setCaptions(v?.segments ? { words: estimateWords(v.segments), origin: 'script' } : null)
  }

  const fit = () => {
    if (!voice) return
    const result = fitToVoice(clips, sources, voice)
    setClips(result.clips)
    if (result.warning) setError(result.warning)
  }

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [])

  const addFiles = async (files: FileList | File[]) => {
    const videos = [...files].filter((f) => f.type.startsWith('video/'))
    if (!videos.length) {
      setError('Solo se pueden añadir archivos de vídeo.')
      return
    }
    const loaded: Source[] = []
    for (const f of videos) {
      try {
        loaded.push(await loadSource(f))
      } catch (e) {
        setError((e as Error).message)
      }
    }
    setSources((s) => [...s, ...loaded])
    setClips((cs) => {
      let maxRank = cs.reduce((m, c) => Math.max(m, c.rank), 0)
      const added = loaded.map<Clip>((src) => ({
        id: uid(),
        sourceId: src.id,
        trimStart: 0,
        trimEnd: src.duration,
        rank: ++maxRank,
        label: labelFromName(src.name),
      }))
      return [...cs, ...added]
    })
  }

  const updateClip = (id: string, patch: Partial<Clip>) =>
    setClips((cs) => {
      const target = cs.find((c) => c.id === id)
      if (!target) return cs
      return cs.map((c) => {
        if (c.id === id) return { ...c, ...patch }
        // A label belongs to the rank, so keep every clip of that rank in sync.
        if (patch.label !== undefined && c.rank === target.rank) return { ...c, label: patch.label }
        return c
      })
    })

  const deleteClip = (id: string) => {
    const next = clips.filter((c) => c.id !== id)
    const unused = sources.filter((s) => !next.some((c) => c.sourceId === s.id))
    unused.forEach((s) => URL.revokeObjectURL(s.url))
    setClips(next)
    setSources(sources.filter((s) => !unused.includes(s)))
    if (selectedId === id) setSelectedId(null)
  }

  const splitAtPlayhead = () => {
    const time = player.getTime()
    const p = layout(clips).find((x) => time > x.start + 0.1 && time < x.end - 0.1)
    if (!p) return
    const cut = p.clip.trimStart + (time - p.start)
    const second: Clip = { ...p.clip, id: uid(), trimStart: cut }
    setClips(clips.flatMap((c) => (c.id === p.clip.id ? [{ ...c, trimEnd: cut }, second] : [c])))
    setSelectedId(second.id)
  }

  const reorder = (id: string, toIndex: number) => {
    const from = clips.findIndex((c) => c.id === id)
    if (from < 0) return
    const next = [...clips]
    const [moved] = next.splice(from, 1)
    next.splice(toIndex > from ? toIndex - 1 : toIndex, 0, moved)
    setClips(next)
  }

  const shuffle = () => {
    const next = [...clips]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    setClips(next)
  }

  /** Classic countdown: highest rank first, #1 last. Stable, so split clips stay in order. */
  const sortCountdown = () => setClips([...clips].sort((a, b) => b.rank - a.rank))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
      if (e.code === 'Space') {
        e.preventDefault()
        player.toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const placed = layout(clips)
  const total = totalDuration(placed)
  const selectedPlaced = placed.find((p) => p.clip.id === selectedId) ?? null
  const selectedSource = selectedPlaced ? (sources.find((s) => s.id === selectedPlaced.clip.sourceId) ?? null) : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">R</span>
          <span className="brand-name">RankReel</span>
          <span className="tag">STUDIO</span>
        </div>
        <div className="summary mono">
          {clips.length} clips · {formatTime(total, false)} · 1080×1920 · se renderiza en tu navegador
        </div>
        <button className="btn primary" disabled={!clips.length} onClick={() => setRendering(true)}>
          ⇪ Renderizar
        </button>
      </header>

      <main className="workspace">
        <LeftPanel
          clips={clips}
          sources={sources}
          settings={settings}
          selectedId={selectedId}
          onSettings={updateSettings}
          onAddFiles={addFiles}
          onUpdateClip={updateClip}
          onSelect={setSelectedId}
          onShuffle={shuffle}
          onSortCountdown={sortCountdown}
          script={script}
          voiceId={voiceId}
          voice={voice}
          onScript={setScript}
          onVoiceId={setVoiceId}
          onVoice={setVoice}
          onFit={fit}
          onError={setError}
        />
        <Preview onAddFiles={addFiles} hasClips={clips.length > 0} />
        <RightPanel
          settings={settings}
          voice={voice}
          voiceId={voiceId}
          captions={captions}
          onSettings={updateSettings}
          onCaptions={setCaptions}
          onError={setError}
        />
      </main>

      <section className="timeline-area">
        <Timeline
          placed={placed}
          sources={sources}
          selectedId={selectedId}
          total={total}
          onSelect={setSelectedId}
          onReorder={reorder}
          onSplit={splitAtPlayhead}
          onDelete={() => selectedId && deleteClip(selectedId)}
          voice={voice}
          onFit={fit}
        />
        {selectedPlaced && selectedSource && (
          <ClipInspector placed={selectedPlaced} source={selectedSource} onChange={(patch) => updateClip(selectedPlaced.clip.id, patch)} />
        )}
      </section>

      {rendering && <RenderDialog onClose={() => setRendering(false)} />}
      {error && (
        <div className="toast" role="alert" onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  )
}
