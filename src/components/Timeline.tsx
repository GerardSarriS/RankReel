import { useEffect, useRef, useState } from 'react'
import { player } from '../engine/Player'
import type { Clip, PlacedSfx, Source, Voiceover } from '../types'
import { formatTime, transitionTimes, type Placed } from '../timeline'
import { sfxBuffer, type SfxDef } from '../sfx/library'
import { usePlayerPlaying, usePlayerTime } from '../usePlayer'
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
  onChangeSfx: (id: string, patch: Partial<PlacedSfx>) => void
  onTrimClip: (id: string, patch: Partial<Clip>) => void
}

const PAD = 16
const MIN_CLIP = 0.2
const MIN_SFX = 0.05

/** What a pointer drag on the timeline is doing. */
type Drag =
  | { kind: 'scrub' }
  | { kind: 'sfx-move' | 'sfx-start' | 'sfx-end'; id: string; x: number; sfx: PlacedSfx }
  | { kind: 'clip-start' | 'clip-end'; id: string; x: number; clip: Clip }

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
  onChangeSfx,
  onTrimClip,
}: Props) {
  const drag = useRef<Drag | null>(null)
  const defOf = (id: string) => sfxDefs.find((d) => d.id === id)
  const autoDef = transitionSfx ? defOf(transitionSfx) : undefined
  const [zoom, setZoom] = useState(60) // px per second
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const time = usePlayerTime()
  const playing = usePlayerPlaying()
  const scroller = useRef<HTMLDivElement>(null)

  // While playing, keep the playhead in view.
  useEffect(() => {
    const el = scroller.current
    if (!playing || !el) return
    const x = PAD + time * zoom
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = Math.max(0, x - 80)
  }, [time, zoom, playing])

  const width = Math.max(total, voice?.buffer.duration ?? 0, 1) * zoom + PAD * 2 + 200
  const tickStep = zoom >= 80 ? 1 : zoom >= 30 ? 2 : zoom >= 15 ? 5 : 10
  const ticks = Array.from({ length: Math.floor((Math.max(total, voice?.buffer.duration ?? 0) + 4) / tickStep) + 1 }, (_, i) => i * tickStep)

  const timeFromEvent = (e: { clientX: number }) => {
    const r = scroller.current!.getBoundingClientRect()
    return Math.max(0, (e.clientX - r.left + scroller.current!.scrollLeft - PAD) / zoom)
  }

  const startDrag = (e: React.PointerEvent, d: Drag) => {
    e.stopPropagation()
    e.preventDefault()
    // Capture on the timeline itself so the drag keeps working outside the item.
    scroller.current?.setPointerCapture(e.pointerId)
    drag.current = d
    if (d.kind === 'scrub') player.seek(timeFromEvent(e))
  }

  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (d.kind === 'scrub') return player.seek(timeFromEvent(e))
    const dt = (e.clientX - d.x) / zoom
    if ('sfx' in d) {
      const { sfx } = d
      if (d.kind === 'sfx-move') onChangeSfx(d.id, { time: Math.max(0, sfx.time + dt) })
      else if (d.kind === 'sfx-end')
        onChangeSfx(d.id, { length: Math.max(MIN_SFX, Math.min(sfx.length + dt, (sfxBuffer(sfx.sfxId)?.duration ?? 0) - sfx.offset)) })
      else {
        // Moving the left edge trims the start of the sound and keeps its end where it was.
        const shift = Math.max(-sfx.offset, -sfx.time, Math.min(dt, sfx.length - MIN_SFX))
        onChangeSfx(d.id, { time: sfx.time + shift, offset: sfx.offset + shift, length: sfx.length - shift })
      }
    } else {
      const { clip } = d
      const max = sources.find((s) => s.id === clip.sourceId)?.duration ?? clip.trimEnd
      if (d.kind === 'clip-start') onTrimClip(d.id, { trimStart: Math.max(0, Math.min(clip.trimStart + dt, clip.trimEnd - MIN_CLIP)) })
      else onTrimClip(d.id, { trimEnd: Math.min(max, Math.max(clip.trimEnd + dt, clip.trimStart + MIN_CLIP)) })
    }
  }

  const endDrag = () => (drag.current = null)

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
        <div className="timeline-scroll" ref={scroller} onPointerMove={onDragMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div
            className="timeline-inner"
            style={{ width }}
            onPointerDown={(e) => {
              // Empty space (not a clip, effect or voice block) moves the playhead.
              if (!(e.target as HTMLElement).closest('.clip, .sfx-item, .voice-seg')) startDrag(e, { kind: 'scrub' })
            }}
          >
            <div className="ruler" style={{ backgroundSize: `${(tickStep * zoom) / 4}px 6px`, backgroundPosition: `${PAD}px 100%` }}>
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
                  <span
                    className="edge left"
                    title="Arrastra para recortar el inicio"
                    onPointerDown={(e) => {
                      onSelect(p.clip.id)
                      startDrag(e, { kind: 'clip-start', id: p.clip.id, x: e.clientX, clip: p.clip })
                    }}
                  />
                  <span
                    className="edge right"
                    title="Arrastra para recortar el final"
                    onPointerDown={(e) => {
                      onSelect(p.clip.id)
                      startDrag(e, { kind: 'clip-end', id: p.clip.id, x: e.clientX, clip: p.clip })
                    }}
                  />
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
                const w = s.length * zoom
                const grab = (kind: 'sfx-move' | 'sfx-start' | 'sfx-end') => (e: React.PointerEvent) => {
                  onSelectSfx(s.id)
                  startDrag(e, { kind, id: s.id, x: e.clientX, sfx: s })
                }
                return (
                  <div
                    key={s.id}
                    className={['sfx-item', s.id === selectedSfxId ? 'selected' : '', w < 64 ? 'narrow' : ''].join(' ')}
                    style={{ left: PAD + s.time * zoom, width: Math.max(14, w) }}
                    title={def?.name}
                    onPointerDown={grab('sfx-move')}
                  >
                    <span className="edge left" title="Arrastra para recortar el inicio" onPointerDown={grab('sfx-start')} />
                    <SfxIcon id={s.sfxId} size={13} /> <span className="ellipsis">{def?.name}</span>
                    <span className="edge right" title="Arrastra para cambiar la duración" onPointerDown={grab('sfx-end')} />
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

            <div className="playhead" style={{ left: PAD + time * zoom }}>
              <span className="playhead-grip" title="Arrastra para moverte por el vídeo" onPointerDown={(e) => startDrag(e, { kind: 'scrub' })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
