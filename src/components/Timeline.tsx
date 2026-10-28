import { useRef, useState } from 'react'
import { player } from '../engine/Player'
import type { Source, Voiceover } from '../types'
import { formatTime, type Placed } from '../timeline'
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
}

const PAD = 16

export function Timeline({ placed, sources, selectedId, total, onSelect, onReorder, onSplit, onDelete, voice, onFit }: Props) {
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
        <button className="btn small" onClick={onDelete} disabled={!selectedId}>
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
