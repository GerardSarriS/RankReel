import { useRef, useState } from 'react'
import { player } from '../engine/Player'
import type { PlacedSfx, Source, Voiceover } from '../types'
import { formatTime, transitionTimes, type Placed } from '../timeline'
import { sfxBuffer, type SfxDef } from '../sfx/library'
import { usePlayerTime } from '../usePlayer'

interface Props {
  placed: Placed[]
  sources: Source[]
  selectedId: string | null
  total: number
  onSelect: (id: string) => void
  onReorder: (id: string, toIndex: number) => void
  onSplit: () => void
  onDelete: () => void
  voice: Voiceover | null
  onFit: () => void
  sfx: PlacedSfx[]
  sfxDefs: SfxDef[]
  transitionSfx: string | null
  selectedSfxId: string | null
  onSelectSfx: (id: string) => void
  onMoveSfx: (id: string, time: number) => void
}

const PAD = 16

export function Timeline({
  placed,
  sources,
  selectedId,
  total,
  onSelect,
  onReorder,
  onSplit,
  onDelete,
  voice,
  onFit,
  sfx,
  sfxDefs,
  transitionSfx,
  selectedSfxId,
  onSelectSfx,
  onMoveSfx,
}: Props) {
  const drag = useRef<{ id: string; x: number; time: number } | null>(null)
  const defOf = (id: string) => sfxDefs.find((d) => d.id === id)
  const autoDef = transitionSfx ? defOf(transitionSfx) : undefined
  const [zoom, setZoom] = useState(60) // px per second
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const time = usePlayerTime()
  const scroller = useRef<HTMLDivElement>(null)

  const width = Math.max(total, voice?.buffer.duration ?? 0, 1) * zoom + PAD * 2 + 200
  const tickStep = zoom >= 80 ? 1 : zoom >= 30 ? 2 : zoom >= 15 ? 5 : 10
  const ticks = Array.from({ length: Math.floor((Math.max(total, voice?.buffer.duration ?? 0) + 4) / tickStep) + 1 }, (_, i) => i * tickStep)

  const timeFromEvent = (e: { clientX: number }) => {
    const r = scroller.current!.getBoundingClientRect()
    return (e.clientX - r.left + scroller.current!.scrollLeft - PAD) / zoom
  }

  return (
    <div className="timeline">
      <div className="timeline-bar">
        <strong>Timeline</strong>
        <button className="btn small" onClick={onSplit} disabled={!placed.length}>
          ✂ Dividir
        </button>
        <button className="btn small" onClick={onDelete} disabled={!selectedId && !selectedSfxId}>
          🗑 Borrar
        </button>
        <button className="btn small" onClick={onFit} disabled={!voice || !placed.length}>
          ⟳ Ajustar a la voz
        </button>
        <span className="spacer" />
        <span className="mono dim">
          {placed.length} clips · {formatTime(total, false)}
        </span>
        <label className="zoom mono">
          ZOOM
          <input type="range" min={10} max={160} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
      </div>

      <div className="timeline-scroll" ref={scroller}>
        <div className="timeline-inner" style={{ width }}>
          <div
            className="ruler"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              player.seek(timeFromEvent(e))
            }}
            onPointerMove={(e) => e.buttons && player.seek(timeFromEvent(e))}
          >
            {ticks.map((t) => (
              <span key={t} className="tick mono" style={{ left: PAD + t * zoom }}>
                {t}s
              </span>
            ))}
          </div>

          <div
            className="track"
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes('text/clip')) return
              e.preventDefault()
              const t = timeFromEvent(e)
              const i = placed.findIndex((p) => t < (p.start + p.end) / 2)
              setDropIndex(i < 0 ? placed.length : i)
            }}
            onDragLeave={() => setDropIndex(null)}
            onDrop={(e) => {
              const id = e.dataTransfer.getData('text/clip')
              if (id && dropIndex !== null) onReorder(id, dropIndex)
              setDropIndex(null)
            }}
          >
            {placed.map((p, i) => (
              <div
                key={p.clip.id}
                className={p.clip.id === selectedId ? 'clip selected' : 'clip'}
                style={{ left: PAD + p.start * zoom, width: Math.max(2, (p.end - p.start) * zoom - 4) }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/clip', p.clip.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onClick={(e) => {
                  onSelect(p.clip.id)
                  player.seek(timeFromEvent(e))
                }}
              >
                {dropIndex === i && <span className="drop-marker" />}
                <div className="clip-top">
                  <span className="clip-name">{p.clip.label || sources.find((s) => s.id === p.clip.sourceId)?.name}</span>
                  <span className="badge">#{p.clip.rank}</span>
                </div>
                <span className="mono dim">{formatTime(p.end - p.start, false)}</span>
              </div>
            ))}
            {dropIndex === placed.length && placed.length > 0 && <span className="drop-marker end" style={{ left: PAD + total * zoom }} />}
          </div>

          <div className="sfx-lane">
            {autoDef &&
              transitionTimes(placed).map((t) => (
                <div key={`auto-${t}`} className="sfx-item auto" style={{ left: PAD + t * zoom }} title={`${autoDef.name} (automático)`}>
                  {autoDef.emoji}
                </div>
              ))}
            {sfx.map((s) => {
              const def = defOf(s.sfxId)
              const len = sfxBuffer(s.sfxId)?.duration ?? 0.5
              return (
                <div
                  key={s.id}
                  className={s.id === selectedSfxId ? 'sfx-item selected' : 'sfx-item'}
                  style={{ left: PAD + s.time * zoom, width: Math.max(26, len * zoom) }}
                  title={def?.name}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    e.currentTarget.setPointerCapture(e.pointerId)
                    drag.current = { id: s.id, x: e.clientX, time: s.time }
                    onSelectSfx(s.id)
                  }}
                  onPointerMove={(e) => {
                    const d = drag.current
                    if (d?.id === s.id) onMoveSfx(s.id, Math.max(0, d.time + (e.clientX - d.x) / zoom))
                  }}
                  onPointerUp={() => (drag.current = null)}
                >
                  {def?.emoji} <span className="ellipsis">{def?.name}</span>
                </div>
              )
            })}
          </div>

          <div className="voice-lane">
            {!voice && <span className="voice-empty mono">SIN VOZ EN OFF: genera una en «Guion y voz» y los clips tendrán algo contra lo que cortar</span>}
            {voice && !voice.segments && (
              <div className="voice-seg" style={{ left: PAD, width: voice.buffer.duration * zoom - 2 }}>
                <span className="mono">{voice.name}</span>
              </div>
            )}
            {voice?.segments?.map((seg, i) => (
              <div
                key={i}
                className="voice-seg"
                style={{ left: PAD + seg.start * zoom, width: Math.max(2, (seg.end - seg.start) * zoom - 2) }}
                title={seg.text}
              >
                <span className="mono">{seg.rank === null ? 'Intro' : `#${seg.rank}`}</span> {seg.text}
              </div>
            ))}
          </div>

          <div className="playhead" style={{ left: PAD + time * zoom }} />
        </div>
      </div>
    </div>
  )
}
