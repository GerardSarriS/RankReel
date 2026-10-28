import type { PlacedSfx } from '../types'
import type { SfxDef } from '../sfx/library'
import { formatTime } from '../timeline'

interface Props {
  sfx: PlacedSfx
  def: SfxDef | undefined
  total: number
  onChange: (patch: Partial<PlacedSfx>) => void
}

export function SfxInspector({ sfx, def, total, onChange }: Props) {
  return (
    <div className="inspector">
      <div className="inspector-head">
        <strong>
          {def?.emoji} {def?.name ?? 'Efecto'}
        </strong>
        <span className="mono dim">en {formatTime(sfx.time)}</span>
      </div>
      <div className="trim">
        <label>
          <span className="field-head">
            <span>Volumen</span>
            <span className="mono">{Math.round(sfx.volume * 100)}%</span>
          </span>
          <input type="range" min={0} max={1.5} step={0.05} value={sfx.volume} onChange={(e) => onChange({ volume: Number(e.target.value) })} />
        </label>
        <label>
          <span className="field-head">
            <span>Momento</span>
            <span className="mono">{sfx.time.toFixed(2)}s</span>
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(total, sfx.time)}
            step={0.01}
            value={sfx.time}
            onChange={(e) => onChange({ time: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  )
}
