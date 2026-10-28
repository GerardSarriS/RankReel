import type { Clip, Source } from '../types'
import { formatTime, type Placed } from '../timeline'
import { Range } from './ui'

const MIN_LENGTH = 0.2

interface Props {
  placed: Placed
  source: Source
  onChange: (patch: Partial<Clip>) => void
}

export function ClipInspector({ placed, source, onChange }: Props) {
  const { clip, start, end } = placed
  return (
    <div className="inspector">
      <div className="inspector-head">
        <strong>{source.name}</strong>
        <span className="num dim">
          {formatTime(start)} → {formatTime(end)} · {formatTime(end - start, false)}
        </span>
      </div>
      <div className="trim">
        <label>
          <span className="field-head">
            <span>Inicio del recorte</span>
            <span className="num">{clip.trimStart.toFixed(2)}s</span>
          </span>
          <Range
            min={0}
            max={source.duration}
            step={0.01}
            value={clip.trimStart}
            onChange={(e) => onChange({ trimStart: Math.min(Number(e.target.value), clip.trimEnd - MIN_LENGTH) })}
          />
        </label>
        <label>
          <span className="field-head">
            <span>Fin del recorte</span>
            <span className="num">{clip.trimEnd.toFixed(2)}s</span>
          </span>
          <Range
            min={0}
            max={source.duration}
            step={0.01}
            value={clip.trimEnd}
            onChange={(e) => onChange({ trimEnd: Math.max(Number(e.target.value), clip.trimStart + MIN_LENGTH) })}
          />
        </label>
      </div>
    </div>
  )
}
