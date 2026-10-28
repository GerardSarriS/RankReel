import type { ReactNode } from 'react'

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={v === value} className={v === value ? 'active' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
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
  return (
    <section className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {toggle && (
          <label className="check">
            <input type="checkbox" checked={toggle.value} onChange={(e) => toggle.onChange(e.target.checked)} />
            Activo
          </label>
        )}
      </div>
      {description && <p className="desc">{description}</p>}
      {children}
    </section>
  )
}

export function Field({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-head">
        <span>{label}</span>
        {value !== undefined && <span className="mono">{value}</span>}
      </div>
      {children}
    </div>
  )
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="color">
      <span className="mono">{value}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
