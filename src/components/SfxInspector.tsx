import type { PlacedSfx } from '../types'
import type { SfxDef } from '../sfx/library'
import { formatTime } from '../timeline'
import { Range } from './ui'
import { SfxIcon } from '../sfx/SfxIcon'

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
          <SfxIcon id={sfx.sfxId} size={15} /> {def?.name ?? 'Efecto'}
        </strong>
        <span className="num dim">en {formatTime(sfx.time)}</span>
      </div>
      <div className="trim">
        <label>
          <span className="field-head">
            <span>Volumen</span>
            <span className="num">{Math.round(sfx.volume * 100)}%</span>
          </span>
          <Range min={0} max={1.5} step={0.05} value={sfx.volume} onChange={(e) => onChange({ volume: Number(e.target.value) })} />
        </label>
        <label>
          <span className="field-head">
            <span>Momento</span>
            <span className="num">{sfx.time.toFixed(2)}s</span>
          </span>
          <Range min={0} max={Math.max(total, sfx.time)} step={0.01} value={sfx.time} onChange={(e) => onChange({ time: Number(e.target.value) })} />
        </label>
      </div>
    </div>
  )
}
