import { useRef, useState } from 'react'
import { PRESET_COLORS, type Clip, type Script, type Settings, type Source, type Voiceover } from '../types'
import { clipDuration, formatTime, ranksOf } from '../timeline'
import { downloadTikTok } from '../media'
import { ArrowDownWideNarrow, ChevronDown, ChevronUp, Download, Film, GripVertical, Link2, ListOrdered, Mic, Music2, Plus, Shuffle, Upload } from 'lucide-react'
import { Field, Section, Swatches, Range, Toggle } from './ui'
import { ScriptVoiceTab } from './ScriptVoiceTab'
import { SoundsTab } from './SoundsTab'
import type { SfxDef } from '../sfx/library'

interface Props {
  clips: Clip[]
  sources: Source[]
  settings: Settings
  selectedId: string | null
  onSettings: (patch: Partial<Settings>) => void
  onAddFiles: (files: FileList | File[]) => void
  onUpdateClip: (id: string, patch: Partial<Clip>) => void
  onSelect: (id: string) => void
  onShuffle: () => void
  onSortCountdown: () => void
  onReorder: (id: string, toIndex: number) => void
  script: Script
  voiceId: string
  voice: Voiceover | null
  onScript: (s: Script) => void
  onVoiceId: (id: string) => void
  onVoice: (v: Voiceover | null) => void
  onFit: () => void
  onError: (message: string) => void
  customSfx: SfxDef[]
  onAddSfx: (sfxId: string) => void
  onUploadSfx: (files: FileList) => void
}

type Tab = 'media' | 'ranking' | 'voice' | 'sounds'

const TABS: { id: Tab; label: string; title: string; icon: typeof Film }[] = [
  { id: 'media', label: 'Media', title: 'Media', icon: Film },
  { id: 'ranking', label: 'Ranking', title: 'Ranking', icon: ListOrdered },
  { id: 'voice', label: 'Voz', title: 'Guion y voz', icon: Mic },
  { id: 'sounds', label: 'Sonidos', title: 'Sonidos', icon: Music2 },
]

export function LeftPanel(props: Props) {
  const [tab, setTab] = useState<Tab>('media')
  const current = TABS.find((t) => t.id === tab)!
  return (
    <aside className="sidebar">
      <nav className="rail" aria-label="Secciones">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={id === tab ? 'rail-item active' : 'rail-item'} onClick={() => setTab(id)} aria-current={id === tab}>
            <Icon size={18} strokeWidth={1.75} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="panel">
        <header className="panel-header">
          <h2>{current.title}</h2>
        </header>
        <div className="panel-body">
          {tab === 'voice' && <ScriptVoiceTab {...props} />}
          {tab === 'media' && <MediaTab {...props} />}
          {tab === 'ranking' && <RankingTab {...props} />}
          {tab === 'sounds' && <SoundsTab {...props} />}
        </div>
      </div>
    </aside>
  )
}

function TikTokImport({ onAddFiles, onError }: Props) {
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState<{ mode: 'import' | 'save'; progress: number | null } | null>(null)

  const run = async (mode: 'import' | 'save') => {
    if (!link.trim()) return
    setBusy({ mode, progress: null })
    try {
      const file = await downloadTikTok(link, (progress) => setBusy({ mode, progress }))
      if (mode === 'import') onAddFiles([file])
      else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
      setLink('')
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const label = (mode: 'import' | 'save', idle: string) =>
    busy?.mode === mode ? (busy.progress === null ? 'Descargando' : `${Math.round(busy.progress * 100)}%`) : idle

  return (
    <Section title="Desde TikTok" description="Pega el enlace de un TikTok y se convierte a MP4 sin marca de agua.">
      <div className="input-icon">
        <Link2 size={15} />
        <input
          className="text-input"
          type="url"
          placeholder="https://www.tiktok.com/@usuario/video/…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void run('import')}
          disabled={!!busy}
        />
      </div>
      <div className="button-pair">
        <button className="btn" disabled={!link.trim() || !!busy} onClick={() => run('import')}>
          <Plus size={15} />
          {label('import', 'Añadir clip')}
        </button>
        <button className="btn" disabled={!link.trim() || !!busy} onClick={() => run('save')}>
          <Download size={15} />
          {label('save', 'Descargar')}
        </button>
      </div>
      <p className="note">Usa solo vídeos que tengas permiso para reutilizar.</p>
    </Section>
  )
}

function MediaTab(props: Props) {
  const { clips, sources, selectedId, onAddFiles, onSelect } = props
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <Section title="Vídeos" description="Sube los vídeos del ranking. Los nombres del ranking, los puestos y el orden se ponen en la pestaña Ranking.">
        <button className="dropzone" onClick={() => input.current?.click()}>
          <Upload size={18} strokeWidth={1.75} />
          <strong>Añadir vídeos</strong>
          <span>o arrástralos a la vista previa</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) onAddFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </Section>
      <TikTokImport {...props} />
      {sources.length > 0 && (
        <ul className="clip-list">
          {sources.map((src) => {
            const first = clips.find((c) => c.sourceId === src.id)
            return (
              <li key={src.id} className={first && first.id === selectedId ? 'selected' : ''} onClick={() => first && onSelect(first.id)}>
                <span className="file-icon">
                  <Film size={15} strokeWidth={1.75} />
                </span>
                <div className="clip-meta">
                  <strong className="ellipsis">{src.name}</strong>
                  <span className="num dim">
                    {formatTime(src.duration, false)} · {src.width}×{src.height}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function ClipOrder({ clips, sources, selectedId, onUpdateClip, onSelect, onReorder }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const maxRank = Math.max(clips.length, ...clips.map((c) => c.rank))

  return (
    <ul className="clip-list">
      {clips.map((c, i) => (
        <li
          key={c.id}
          className={[c.id === selectedId ? 'selected' : '', overIndex === i && dragId !== c.id ? 'drop-before' : ''].join(' ')}
          onClick={() => onSelect(c.id)}
          draggable
          onDragStart={(e) => {
            setDragId(c.id)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', c.id)
          }}
          onDragOver={(e) => {
            if (!dragId) return
            e.preventDefault()
            const r = e.currentTarget.getBoundingClientRect()
            setOverIndex(e.clientY < r.top + r.height / 2 ? i : i + 1)
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (dragId && overIndex !== null) onReorder(dragId, overIndex)
            setDragId(null)
            setOverIndex(null)
          }}
          onDragEnd={() => {
            setDragId(null)
            setOverIndex(null)
          }}
        >
          <span className="handle" aria-hidden>
            <GripVertical size={15} />
          </span>
          <select
            className="rank-select"
            value={c.rank}
            onChange={(e) => onUpdateClip(c.id, { rank: Number(e.target.value) })}
            onClick={(e) => e.stopPropagation()}
            aria-label="Puesto"
          >
            {Array.from({ length: maxRank }, (_, k) => k + 1).map((r) => (
              <option key={r} value={r}>
                #{r}
              </option>
            ))}
          </select>
          <div className="clip-meta">
            <input
              value={c.label}
              placeholder="Nombre en el ranking…"
              onChange={(e) => onUpdateClip(c.id, { label: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="num dim ellipsis">
              {sources.find((s) => s.id === c.sourceId)?.name} · {formatTime(clipDuration(c), false)}
            </span>
          </div>
          <div className="move">
            <button className="icon-btn sm" disabled={i === 0} onClick={(e) => (e.stopPropagation(), onReorder(c.id, i - 1))} aria-label="Subir">
              <ChevronUp size={14} />
            </button>
            <button className="icon-btn sm" disabled={i === clips.length - 1} onClick={(e) => (e.stopPropagation(), onReorder(c.id, i + 2))} aria-label="Bajar">
              <ChevronDown size={14} />
            </button>
          </div>
        </li>
      ))}
      {overIndex === clips.length && <li className="drop-end" />}
    </ul>
  )
}

function RankingTab(props: Props) {
  const { settings: s, onSettings, onShuffle, onSortCountdown, clips } = props
  const ranks = ranksOf(clips)
  const setRankColor = (rank: number, color: string | null) => {
    const next = { ...s.rankColors }
    if (color) next[rank] = color
    else delete next[rank]
    onSettings({ rankColors: next })
  }

  return (
    <>
      <Section
        title="Ranking"
        description="Elementos de cuenta atrás para vídeos tipo Top 5. Al activarlo, el título también se queda en pantalla todo el vídeo."
        toggle={{ value: s.rankingOn, onChange: (v) => onSettings({ rankingOn: v }) }}
      />
      <Section
        title="Orden de los clips"
        description="Escribe el nombre que saldrá en el ranking y arrastra o usa las flechas para cambiar el orden. Cada puesto se queda con su clip."
      >
        <div className="row">
          <button className="btn" disabled={clips.length < 2} onClick={onShuffle}>
            <Shuffle size={15} />
            Barajar
          </button>
          <button className="btn" disabled={clips.length < 2} onClick={onSortCountdown}>
            <ArrowDownWideNarrow size={15} />
            Cuenta atrás
          </button>
        </div>
        {!clips.length && <p className="note">Añade vídeos en Media.</p>}
      </Section>
      {clips.length > 0 && <ClipOrder {...props} />}

      <Section
        title="Lista de cuenta atrás"
        description="Todos los números en pantalla desde el principio; los nombres aparecen cuando se reproduce su clip."
        toggle={{ value: s.countdownOn, onChange: (v) => onSettings({ countdownOn: v }) }}
      >
        {s.countdownOn && (
          <>
            <Field label="Altura" value={`${s.listY}px`}>
              <Range min={0} max={1700} step={5} value={s.listY} onChange={(e) => onSettings({ listY: Number(e.target.value) })} />
            </Field>
            <Field label="Margen izquierdo" value={`${s.listX}px`}>
              <Range min={0} max={600} step={5} value={s.listX} onChange={(e) => onSettings({ listX: Number(e.target.value) })} />
            </Field>
            <Field label="Tamaño" value={s.listSize}>
              <Range min={24} max={120} value={s.listSize} onChange={(e) => onSettings({ listSize: Number(e.target.value) })} />
            </Field>
            <Field label="Interlineado" value={s.listSpacing.toFixed(2)}>
              <Range min={1} max={2.5} step={0.05} value={s.listSpacing} onChange={(e) => onSettings({ listSpacing: Number(e.target.value) })} />
            </Field>
            <Toggle label="Resaltar el puesto que suena" checked={s.listHighlightActive} onChange={(v) => onSettings({ listHighlightActive: v })} />
            {ranks.length > 0 && (
              <Field label="Color de cada puesto">
                <div className="rank-colors">
                  {ranks.map((r) => (
                    <div key={r} className="rank-color">
                      <span className="rank-chip" style={{ color: s.rankColors[r] ?? s.textColor }}>
                        {r}.
                      </span>
                      <Swatches
                        value={s.rankColors[r] ?? s.textColor}
                        presets={[s.textColor, ...PRESET_COLORS.slice(1, 6)]}
                        onChange={(c) => setRankColor(r, c)}
                        onClear={s.rankColors[r] ? () => setRankColor(r, null) : undefined}
                      />
                    </div>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}
      </Section>

      <Section
        title="Insignia de puesto"
        description="La píldora #N fija en el vídeo, que cambia con cada clip."
        toggle={{ value: s.badgeOn, onChange: (v) => onSettings({ badgeOn: v }) }}
      />
      <Section
        title="Etiqueta del clip"
        description="La etiqueta del clip actual, en grande. Fuente, colores y contorno salen de Lienzo y título."
        toggle={{ value: s.segmentLabelOn, onChange: (v) => onSettings({ segmentLabelOn: v }) }}
      />
    </>
  )
}
