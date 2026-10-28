import { useRef, useState } from 'react'
import { PRESET_COLORS, type Clip, type Script, type Settings, type Source, type Voiceover } from '../types'
import { clipDuration, formatTime, ranksOf } from '../timeline'
import { Field, Section, Swatches, Tabs } from './ui'
import { ScriptVoiceTab } from './ScriptVoiceTab'
import { SoundsTab } from './SoundsTab'
import type { SfxDef } from '../sfx/library'

interface Props {
  clips: Clip[]
  sources: Source[]
  settings: Settings
  selectedId: string | null
  onSettings: (patch: Partial<Settings>) => void
  onAddFiles: (files: FileList) => void
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

export function LeftPanel(props: Props) {
  const [tab, setTab] = useState<'voice' | 'media' | 'ranking' | 'sounds'>('media')
  return (
    <aside className="panel">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ['media', 'Media'],
          ['ranking', 'Ranking'],
          ['voice', 'Voz'],
          ['sounds', 'Sonidos'],
        ]}
      />
      <div className="panel-body">
        {tab === 'voice' && <ScriptVoiceTab {...props} />}
        {tab === 'media' && <MediaTab {...props} />}
        {tab === 'ranking' && <RankingTab {...props} />}
        {tab === 'sounds' && <SoundsTab {...props} />}
      </div>
    </aside>
  )
}

function MediaTab({ clips, sources, selectedId, onAddFiles, onSelect }: Props) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <Section title="Vídeos" description="Sube los vídeos del ranking. Los nombres del ranking, los puestos y el orden se ponen en la pestaña Ranking.">
        <button className="btn" onClick={() => input.current?.click()}>
          ＋ Añadir vídeos
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
      {sources.length > 0 && (
        <ul className="clip-list">
          {sources.map((src) => {
            const first = clips.find((c) => c.sourceId === src.id)
            return (
              <li key={src.id} className={first && first.id === selectedId ? 'selected' : ''} onClick={() => first && onSelect(first.id)}>
                <div className="clip-meta">
                  <strong className="ellipsis">{src.name}</strong>
                  <span className="mono dim">
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
            ⠿
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
            <span className="mono dim ellipsis">
              {sources.find((s) => s.id === c.sourceId)?.name} · {formatTime(clipDuration(c), false)}
            </span>
          </div>
          <div className="move">
            <button className="icon-btn" disabled={i === 0} onClick={(e) => (e.stopPropagation(), onReorder(c.id, i - 1))} aria-label="Subir">
              ▲
            </button>
            <button className="icon-btn" disabled={i === clips.length - 1} onClick={(e) => (e.stopPropagation(), onReorder(c.id, i + 2))} aria-label="Bajar">
              ▼
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
          <button className="btn small" disabled={clips.length < 2} onClick={onShuffle}>
            ⤮ Barajar
          </button>
          <button className="btn small" disabled={clips.length < 2} onClick={onSortCountdown}>
            ↓ Cuenta atrás
          </button>
        </div>
        {!clips.length && <p className="note mono">Añade vídeos en Media.</p>}
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
              <input type="range" min={0} max={1700} step={5} value={s.listY} onChange={(e) => onSettings({ listY: Number(e.target.value) })} />
            </Field>
            <Field label="Margen izquierdo" value={`${s.listX}px`}>
              <input type="range" min={0} max={600} step={5} value={s.listX} onChange={(e) => onSettings({ listX: Number(e.target.value) })} />
            </Field>
            <Field label="Tamaño" value={s.listSize}>
              <input type="range" min={24} max={120} value={s.listSize} onChange={(e) => onSettings({ listSize: Number(e.target.value) })} />
            </Field>
            <Field label="Interlineado" value={s.listSpacing.toFixed(2)}>
              <input type="range" min={1} max={2.5} step={0.05} value={s.listSpacing} onChange={(e) => onSettings({ listSpacing: Number(e.target.value) })} />
            </Field>
            <label className="check" style={{ marginTop: 12 }}>
              <input type="checkbox" checked={s.listHighlightActive} onChange={(e) => onSettings({ listHighlightActive: e.target.checked })} />
              Resaltar el número del puesto que suena
            </label>
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
