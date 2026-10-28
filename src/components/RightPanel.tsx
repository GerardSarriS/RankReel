import { useState } from 'react'
import { FONTS, PRESET_COLORS, type Captions, type Settings, type Voiceover } from '../types'
import { CaptionsTab } from './CaptionsTab'
import { titleLines } from '../timeline'
import { ColorInput, Field, Section, Swatches, Tabs, Range } from './ui'

interface Props {
  settings: Settings
  voice: Voiceover | null
  voiceId: string
  captions: Captions | null
  onSettings: (patch: Partial<Settings>) => void
  onCaptions: (c: Captions | null) => void
  onError: (message: string) => void
}

export function RightPanel(props: Props) {
  const [tab, setTab] = useState<'captions' | 'canvas'>('canvas')
  return (
    <aside className="panel inspector-panel">
      <header className="panel-header">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            ['canvas', 'Lienzo y título'],
            ['captions', 'Subtítulos'],
          ]}
        />
      </header>
      <div className="panel-body">{tab === 'captions' ? <CaptionsTab {...props} /> : <CanvasTab {...props} />}</div>
    </aside>
  )
}

function CanvasTab({ settings: s, onSettings }: Props) {
  const lines = titleLines(s.hookText)
  const words = lines.flat()
  const [word, setWord] = useState<number | null>(null)
  const selected = word !== null && word < words.length ? word : null

  const setWordColor = (color: string | null) => {
    if (selected === null) return
    const next = { ...s.hookWordColors }
    if (color) next[selected] = color
    else delete next[selected]
    onSettings({ hookWordColors: next })
  }

  return (
    <>
      <Section title="Lienzo" description="Salida vertical 1080×1920.">
        <Field label="Encaje del clip">
          <Tabs
            value={s.fit}
            onChange={(fit) => onSettings({ fit })}
            options={[
              ['fill', 'Rellenar'],
              ['fit', 'Ajustar'],
            ]}
          />
        </Field>
        <p className="desc">Rellenar recorta los vídeos horizontales a 9:16; Ajustar los encaja con bandas sobre el fondo.</p>
        <Field label="Fondo">
          <ColorInput value={s.background} onChange={(background) => onSettings({ background })} />
        </Field>
      </Section>

      <Section
        title="Franja superior"
        description="Una franja lisa arriba para el título; el vídeo se ve debajo, sin que el texto lo tape."
        toggle={{ value: s.bandOn, onChange: (v) => onSettings({ bandOn: v }) }}
      >
        {s.bandOn && (
          <>
            <Field label="Altura" value={`${s.bandHeight}px`}>
              <Range min={150} max={900} step={10} value={s.bandHeight} onChange={(e) => onSettings({ bandHeight: Number(e.target.value) })} />
            </Field>
            <Field label="Color">
              <ColorInput value={s.bandColor} onChange={(bandColor) => onSettings({ bandColor })} />
            </Field>
          </>
        )}
      </Section>

      <Section
        title="Título gancho"
        description={s.rankingOn ? 'Con el ranking activo se queda en pantalla todo el vídeo.' : 'Texto que aparece al principio del vídeo.'}
        toggle={{ value: s.hookOn, onChange: (v) => onSettings({ hookOn: v }) }}
      >
        <textarea
          className="text-input"
          rows={Math.max(2, s.hookText.split('\n').length)}
          value={s.hookText}
          onChange={(e) => {
            const count = e.target.value.split(/\s+/).filter(Boolean).length
            const kept = Object.entries(s.hookWordColors).filter(([i]) => Number(i) < count)
            onSettings({ hookText: e.target.value, hookWordColors: Object.fromEntries(kept) })
          }}
        />
        <p className="note">Pulsa Intro para hacer un salto de línea.</p>
        <Field label="Toca una palabra para darle color">
          {lines.map((line, li) => (
            <div className="chips" key={li}>
              {line.map(({ text, index: i }) => (
                <button
                  key={i}
                  className={i === selected ? 'chip selected' : 'chip'}
                  style={{ color: s.hookWordColors[i] ?? undefined }}
                  onClick={() => setWord(i === selected ? null : i)}
                >
                  {text}
                </button>
              ))}
            </div>
          ))}
        </Field>
        {selected !== null && (
          <Swatches
            value={s.hookWordColors[selected] ?? s.textColor}
            presets={[s.textColor, s.highlightColor, ...PRESET_COLORS]}
            onChange={setWordColor}
            onClear={() => setWordColor(null)}
          />
        )}
        <Field label="Tamaño" value={s.titleSize}>
          <Range min={40} max={140} value={s.titleSize} onChange={(e) => onSettings({ titleSize: Number(e.target.value) })} />
        </Field>
        {!s.rankingOn && (
          <Field label="Duración" value={`${s.hookSeconds.toFixed(1)} s`}>
            <Range min={1} max={10} step={0.5} value={s.hookSeconds} onChange={(e) => onSettings({ hookSeconds: Number(e.target.value) })} />
          </Field>
        )}
      </Section>

      <Section title="Texto">
        <Field label="Fuente">
          <Tabs value={s.font} onChange={(font) => onSettings({ font })} options={FONTS.map((f) => [f, f.split(' ')[0]])} />
        </Field>
        <Field label="Color del texto">
          <ColorInput value={s.textColor} onChange={(textColor) => onSettings({ textColor })} />
        </Field>
        <Field label="Color de resaltado">
          <ColorInput value={s.highlightColor} onChange={(highlightColor) => onSettings({ highlightColor })} />
        </Field>
        <Field label="Contorno">
          <ColorInput value={s.outlineColor} onChange={(outlineColor) => onSettings({ outlineColor })} />
        </Field>
      </Section>
    </>
  )
}
