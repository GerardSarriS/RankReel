import { useEffect, useRef, useState } from 'react'
import { player } from '../engine/Player'

type State = { kind: 'running'; progress: number } | { kind: 'done'; url: string; name: string; size: number } | { kind: 'error'; message: string }

export function RenderDialog({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<State>({ kind: 'running', progress: 0 })
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    controller.current = ac
    let url: string | null = null
    player
      .record((p) => setState({ kind: 'running', progress: p }), ac.signal)
      .then((result) => {
        if (!result || ac.signal.aborted) return
        url = URL.createObjectURL(result.blob)
        setState({ kind: 'done', url, name: `ranking.${result.ext}`, size: result.blob.size })
      })
      .catch((e: Error) => setState({ kind: 'error', message: e.message }))
    return () => {
      ac.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [])

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true">
        {state.kind === 'running' && (
          <>
            <h2>Renderizando…</h2>
            <p className="desc">El vídeo se graba en tiempo real. Deja esta pestaña abierta y visible hasta que termine.</p>
            <div className="progress">
              <div style={{ width: `${Math.round(state.progress * 100)}%` }} />
            </div>
            <p className="mono">{Math.round(state.progress * 100)}%</p>
            <button
              className="btn"
              onClick={() => {
                controller.current?.abort()
                onClose()
              }}
            >
              Cancelar
            </button>
          </>
        )}
        {state.kind === 'done' && (
          <>
            <h2>¡Listo!</h2>
            <p className="desc">
              {state.name} · {(state.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <div className="row">
              <a className="btn primary" href={state.url} download={state.name}>
                Descargar
              </a>
              <button className="btn" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <h2>No se ha podido renderizar</h2>
            <p className="desc">{state.message}</p>
            <button className="btn" onClick={onClose}>
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
