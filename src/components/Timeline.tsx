import { useRef, useState } from 'react'
import { player } from '../engine/Player'
import type { PlacedSfx, Source, Voiceover } from '../types'
import { formatTime, transitionTimes, type Placed } from '../timeline'
import { sfxBuffer, type SfxDef } from '../sfx/library'
import { usePlayerTime } from '../usePlayer'
import { AudioLines, Film, Mic, Music2, Scissors, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { SfxIcon } from '../sfx/SfxIcon'
import { Range } from './ui'

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
        <h2>Timeline</h2>
        <div className="tool-group">
          <button className="btn ghost" onClick={onSplit} disabled={!placed.length}>
            <Scissors size={15} />
            Dividir
          </button>
          <button className="btn ghost" onClick={onDelete} disabled={!selectedId && !selectedSfxId}>
            <Trash2 size={15} />
            Borrar
          </button>
          <button className="btn ghost" onClick={onFit} disabled={!voice || !placed.length}>
            <AudioLines size={15} />
            Ajustar a la voz
          </button>
        </div>
        <span className="spacer" />
        <span className="num dim">
          {placed.length} clips · {formatTime(total, false)}
        </span>
        <div className="zoom">
          <ZoomOut size={15} />
          <Range min={10} max={160} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
          <ZoomIn size={15} />
        </div>
      </div>

      <div className="timeline-body">
        <div className="track-heads" aria-hidden>
          <div className="track-head ruler-head" />
          <div className="track-head video">
            <Film size={14} />
            Vídeo
          </div>
          <div className="track-head sfx">
            <Music2 size={14} />
            Efectos
          </div>
          <div className="track-head voice">
            <Mic size={14} />
            Voz
          </div>
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
              style={{ backgroundSize: `${(tickStep * zoom) / 4}px 6px`, backgroundPosition: `${PAD}px 100%` }}
            >
              {ticks.map((t) => (
                <span key={t} className="tick" style={{ left: PAD + t * zoom }}>
                  {formatTime(t, false)}
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
                  <span className="num dim">{formatTime(p.end - p.start, false)}</span>
                </div>
              ))}
              {dropIndex === placed.length && placed.length > 0 && <span className="drop-marker end" style={{ left: PAD + total * zoom }} />}
            </div>

            <div className="sfx-lane">
              {autoDef &&
                transitionTimes(placed).map((t) => (
                  <div key={`auto-${t}`} className="sfx-item auto" style={{ left: PAD + t * zoom }} title={`${autoDef.name} (automático)`}>
                    <SfxIcon id={autoDef.id} size={13} />
                  </div>
                ))}
              {sfx.map((s) => {
                const def = defOf(s.sfxId)
                const len = sfxBuffer(s.sfxId)?.duration ?? 0.5
                return (
                  <div
                    key={s.id}
                    className={['sfx-item', s.id === selectedSfxId ? 'selected' : '', len * zoom < 64 ? 'narrow' : ''].join(' ')}
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
                    <SfxIcon id={s.sfxId} size={13} /> <span className="ellipsis">{def?.name}</span>
                  </div>
                )
              })}
            </div>

            <div className="voice-lane">
              {!voice && <span className="voice-empty">Sin voz en off · genera una en «Voz» y los clips tendrán algo contra lo que cortar</span>}
              {voice && !voice.segments && (
                <div className="voice-seg" style={{ left: PAD, width: voice.buffer.duration * zoom - 2 }}>
                  <span className="seg-tag">{voice.name}</span>
                </div>
              )}
              {voice?.segments?.map((seg, i) => (
                <div
                  key={i}
                  className="voice-seg"
                  style={{ left: PAD + seg.start * zoom, width: Math.max(2, (seg.end - seg.start) * zoom - 2) }}
                  title={seg.text}
                >
                  <span className="seg-tag">{seg.rank === null ? 'Intro' : `#${seg.rank}`}</span> {seg.text}
                </div>
              ))}
            </div>

            <div className="playhead" style={{ left: PAD + time * zoom }} />
          </div>
        </div>
      </div>
    </div>
  )
}
