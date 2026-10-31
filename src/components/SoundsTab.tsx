import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'
import { BUILTIN_SFX, sfxBuffer, type SfxDef } from '../sfx/library'
import { player } from '../engine/Player'
import { Play, Plus, Square, Upload } from 'lucide-react'
import { usePreviewId } from '../usePlayer'
import { SfxIcon } from '../sfx/SfxIcon'
import { Field, Section, Range } from './ui'

interface Props {
  settings: Settings
  customSfx: SfxDef[]
  onSettings: (patch: Partial<Settings>) => void
  onAddSfx: (sfxId: string) => void
  onUploadSfx: (files: FileList) => void
}

export function SoundsTab({ settings: s, customSfx, onSettings, onAddSfx, onUploadSfx }: Props) {
  const all = [...BUILTIN_SFX, ...customSfx]
  const categories = [...new Set(all.map((x) => x.category))]
  const [category, setCategory] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const shown = category ? all.filter((x) => x.category === category) : all

  const previewing = usePreviewId()
  // Leaving the tab stops whatever is being previewed.
  useEffect(() => () => player.stopPreview(), [])
  const preview = (id: string) => {
    const b = sfxBuffer(id)
    if (b) player.togglePreview(id, b)
  }

  return (
    <>
      <Section title="Biblioteca" description="Escucha un efecto y añádelo donde está el cabezal. En el timeline lo puedes arrastrar.">
        <div className="chips">
          <button className={category === null ? 'chip selected' : 'chip'} onClick={() => setCategory(null)}>
            Todos
          </button>
          {categories.map((c) => (
            <button key={c} className={c === category ? 'chip selected' : 'chip'} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </Section>
      <ul className="sfx-list">
        {shown.map((x) => (
          <li key={x.id} className={previewing === x.id ? 'playing' : ''}>
            <span className="sfx-icon">
              <SfxIcon id={x.id} />
            </span>
            <span className="ellipsis">{x.name}</span>
            <button className="icon-btn" onClick={() => preview(x.id)} aria-label={previewing === x.id ? `Parar ${x.name}` : `Escuchar ${x.name}`}>
              {previewing === x.id ? <Square size={12} fill="currentColor" /> : <Play size={14} />}
            </button>
            <button className="icon-btn" onClick={() => onAddSfx(x.id)} aria-label={`Añadir ${x.name}`}>
              <Plus size={15} />
            </button>
          </li>
        ))}
      </ul>

      <Section title="Mis sonidos" description="Sube tus propios efectos (MP3, WAV…) y aparecerán en la biblioteca.">
        <button className="btn" onClick={() => input.current?.click()}>
          <Upload size={15} />
          Subir sonidos
        </button>
        <input
          ref={input}
          type="file"
          accept="audio/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) onUploadSfx(e.target.files)
            e.target.value = ''
          }}
        />
      </Section>

      <Section
        title="En cada cambio de puesto"
        description="Suena automáticamente cada vez que el ranking pasa al siguiente puesto, aunque cambies el orden o la duración."
      >
        <select className="text-input" value={s.transitionSfx ?? ''} onChange={(e) => onSettings({ transitionSfx: e.target.value || null })}>
          <option value="">Ninguno</option>
          {all.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        {s.transitionSfx && (
          <Field label="Volumen" value={`${Math.round(s.transitionVolume * 100)}%`}>
            <Range min={0} max={1.5} step={0.05} value={s.transitionVolume} onChange={(e) => onSettings({ transitionVolume: Number(e.target.value) })} />
          </Field>
        )}
      </Section>

      <Section title="Volumen de los efectos">
        <Field label="General" value={`${Math.round(s.sfxVolume * 100)}%`}>
          <Range min={0} max={1.5} step={0.05} value={s.sfxVolume} onChange={(e) => onSettings({ sfxVolume: Number(e.target.value) })} />
        </Field>
      </Section>
    </>
  )
}
