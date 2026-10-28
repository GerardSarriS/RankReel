import { useRef, useState } from 'react'
import type { Clip, Settings, Source } from '../types'
import { clipDuration, formatTime } from '../timeline'
import { Section, Tabs } from './ui'

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
}

export function LeftPanel(props: Props) {
  const [tab, setTab] = useState<'media' | 'ranking'>('media')
  return (
    <aside className="panel">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ['media', 'Media'],
          ['ranking', 'Ranking'],
        ]}
      />
      <div className="panel-body">{tab === 'media' ? <MediaTab {...props} /> : <RankingTab {...props} />}</div>
    </aside>
  )
}

function MediaTab({ clips, sources, selectedId, onAddFiles, onUpdateClip, onSelect }: Props) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <Section title="Clips" description="Sube los vídeos del ranking. Cada clip recibe un puesto; puedes cambiarlo aquí o en el timeline.">
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
      {clips.length > 0 && (
        <ul className="clip-list">
          {clips.map((c) => (
            <li key={c.id} className={c.id === selectedId ? 'selected' : ''} onClick={() => onSelect(c.id)}>
              <select
                className="rank-select"
                value={c.rank}
                onChange={(e) => onUpdateClip(c.id, { rank: Number(e.target.value) })}
                onClick={(e) => e.stopPropagation()}
                aria-label="Puesto"
              >
                {Array.from({ length: Math.max(clips.length, c.rank) }, (_, i) => i + 1).map((r) => (
                  <option key={r} value={r}>
                    #{r}
                  </option>
                ))}
              </select>
              <div className="clip-meta">
                <input
                  value={c.label}
                  placeholder="Etiqueta"
                  onChange={(e) => onUpdateClip(c.id, { label: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="mono dim">
                  {sources.find((s) => s.id === c.sourceId)?.name} · {formatTime(clipDuration(c), false)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function RankingTab({ settings: s, onSettings, onShuffle, onSortCountdown, clips }: Props) {
  return (
    <>
      <Section
        title="Ranking"
        description="Elementos de cuenta atrás para vídeos tipo Top 5. Al activarlo, el título también se queda en pantalla todo el vídeo."
        toggle={{ value: s.rankingOn, onChange: (v) => onSettings({ rankingOn: v }) }}
      >
        <div className="row">
          <button className="btn" disabled={clips.length < 2} onClick={onShuffle}>
            ⤮ Barajar orden
          </button>
          <button className="btn" disabled={clips.length < 2} onClick={onSortCountdown}>
            ↓ Cuenta atrás
          </button>
        </div>
        <p className="note mono">Cambia el orden. Cada puesto se queda con su clip.</p>
      </Section>
      <Section
        title="Insignia de puesto"
        description="La píldora #N fija en el vídeo, que cambia con cada clip."
        toggle={{ value: s.badgeOn, onChange: (v) => onSettings({ badgeOn: v }) }}
      >
        <p className="note mono">{s.badgeOn ? 'Insignia visible.' : 'Insignia oculta.'}</p>
      </Section>
      <Section
        title="Etiqueta del clip"
        description="La etiqueta del clip actual, en grande. Fuente, colores y contorno salen de Lienzo y título."
        toggle={{ value: s.segmentLabelOn, onChange: (v) => onSettings({ segmentLabelOn: v }) }}
      >
        {!s.segmentLabelOn && <p className="note mono">Las etiquetas solo se ven en la lista.</p>}
      </Section>
      <Section
        title="Lista de cuenta atrás"
        description="Todos los números en pantalla desde el principio; los nombres aparecen cuando se reproduce su clip."
        toggle={{ value: s.countdownOn, onChange: (v) => onSettings({ countdownOn: v }) }}
      />
    </>
  )
}
