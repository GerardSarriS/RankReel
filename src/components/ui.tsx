import type { CSSProperties, ReactNode } from 'react'
import { X } from 'lucide-react'

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={v === value} className={v === value ? 'active' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} className={checked ? 'switch on' : 'switch'} onClick={() => onChange(!checked)}>
      <span />
    </button>
  )
}

/** A labelled switch on its own row. */
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

export function Section({
  title,
  description,
  toggle,
  children,
}: {
  title: string
  description?: ReactNode
  toggle?: { value: boolean; onChange: (v: boolean) => void }
  children?: ReactNode
}) {
  const off = toggle && !toggle.value
  return (
    <section className={off ? 'section off' : 'section'}>
      <div className="section-head">
        <h3>{title}</h3>
        {toggle && <Switch checked={toggle.value} onChange={toggle.onChange} label={title} />}
      </div>
      {description && <p className="desc">{description}</p>}
      {children && <div className="section-body">{children}</div>}
    </section>
  )
}

export function Field({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-head">
        <span>{label}</span>
        {value !== undefined && <span className="num">{value}</span>}
      </div>
      {children}
    </div>
  )
}

/** Range input whose filled part follows the value (styled through --p). */
export function Range({
  min,
  max,
  step,
  value,
  onChange,
  ...rest
}: {
  min: number
  max: number
  step?: number
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  'aria-label'?: string
}) {
  const p = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <input
      type="range"
      className="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      style={{ '--p': `${Math.min(100, Math.max(0, p))}%` } as CSSProperties}
      {...rest}
    />
  )
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="color">
      <span className="num">{value.toUpperCase()}</span>
      <span className="color-dot" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  )
}

/** Quick color picker: preset swatches, a custom color and an optional reset. */
export function Swatches({ value, presets, onChange, onClear }: { value: string; presets: string[]; onChange: (v: string) => void; onClear?: () => void }) {
  return (
    <div className="swatches">
      {[...new Set(presets.map((c) => c.toLowerCase()))].map((c) => (
        <button key={c} className={c === value.toLowerCase() ? 'swatch on' : 'swatch'} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
      ))}
      <label className="swatch custom" aria-label="Otro color">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
      {onClear && (
        <button className="icon-btn sm" onClick={onClear} aria-label="Quitar color" title="Quitar color">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
