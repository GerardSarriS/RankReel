import { useEffect, useRef, useState } from 'react'
import { player } from '../engine/Player'
import { formatTime } from '../timeline'
import { usePlayerMuted, usePlayerPlaying, usePlayerTime } from '../usePlayer'

export function Preview({ hasClips, onAddFiles }: { hasClips: boolean; onAddFiles: (files: FileList) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const time = usePlayerTime()
  const playing = usePlayerPlaying()
  const muted = usePlayerMuted()
  const duration = player.getDuration()
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    player.attach(canvas.current)
    return () => player.attach(null)
  }, [])

  const seekFromBar = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    player.seek(((e.clientX - r.left) / r.width) * duration)
  }

  return (
    <section
      className={dragOver ? 'stage drag' : 'stage'}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDragOver(false)
        onAddFiles(e.dataTransfer.files)
      }}
    >
      <div className="canvas-wrap">
        <canvas ref={canvas} width={1080} height={1920} onClick={() => player.toggle()} />
        {!hasClips && (
          <div className="empty">
            <strong>Arrastra aquí tus vídeos</strong>
            <span>o usa «Añadir vídeos» en Media</span>
          </div>
        )}
      </div>
      <div
        className="scrub"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          seekFromBar(e)
        }}
        onPointerMove={(e) => e.buttons && seekFromBar(e)}
      >
        <div className="scrub-fill" style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
      </div>
      <div className="transport">
        <span className="mono">{formatTime(time)}</span>
        <div className="transport-buttons">
          <button className="icon-btn" onClick={() => player.jump(-1)} aria-label="Clip anterior">
            ⏮
          </button>
          <button className="play-btn" onClick={() => player.toggle()} aria-label={playing ? 'Pausa' : 'Reproducir'} disabled={!hasClips}>
            {playing ? '❚❚' : '▶'}
          </button>
          <button className="icon-btn" onClick={() => player.jump(1)} aria-label="Clip siguiente">
            ⏭
          </button>
        </div>
        <span className="transport-right">
          <button className="icon-btn" onClick={() => player.setMuted(!muted)} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
            {muted ? '🔇' : '🔊'}
          </button>
          <span className="mono">{formatTime(duration)}</span>
        </span>
      </div>
    </section>
  )
}
