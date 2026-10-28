import { useState } from 'react'
import { FONTS, type Captions, type Settings, type Voiceover } from '../types'
import { CaptionsTab } from './CaptionsTab'
import { ColorInput, Field, Section, Tabs } from './ui'

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
    <aside className="panel">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ['captions', 'Subtítulos'],
          ['canvas', 'Lienzo y título'],
        ]}
      />
      <div className="panel-body">{tab === 'captions' ? <CaptionsTab {...props} /> : <CanvasTab {...props} />}</div>
    </aside>
  )
}

function CanvasTab({ settings: s, onSettings }: Props) {
  const words = s.hookText.split(/\s+/).filter(Boolean)

  const toggleWord = (i: number) =>
    onSettings({
      hookHighlights: s.hookHighlights.includes(i) ? s.hookHighlights.filter((w) => w !== i) : [...s.hookHighlights, i],
    })

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
        title="Título gancho"
        description={s.rankingOn ? 'Con el ranking activo se queda en pantalla todo el vídeo.' : 'Texto que aparece al principio del vídeo.'}
        toggle={{ value: s.hookOn, onChange: (v) => onSettings({ hookOn: v }) }}
      >
        <input
          className="text-input"
          value={s.hookText}
          onChange={(e) => {
            const count = e.target.value.split(/\s+/).filter(Boolean).length
            onSettings({ hookText: e.target.value, hookHighlights: s.hookHighlights.filter((i) => i < count) })
          }}
        />
        <Field label="Toca una palabra para resaltarla">
          <div className="chips">
            {words.map((w, i) => (
              <button key={i} className={s.hookHighlights.includes(i) ? 'chip on' : 'chip'} onClick={() => toggleWord(i)}>
                {w}
              </button>
            ))}
          </div>
        </Field>
        {!s.rankingOn && (
          <Field label="Duración" value={`${s.hookSeconds.toFixed(1)} s`}>
            <input type="range" min={1} max={10} step={0.5} value={s.hookSeconds} onChange={(e) => onSettings({ hookSeconds: Number(e.target.value) })} />
          </Field>
        )}
      </Section>

      <Section title="Texto">
        <Field label="Fuente">
          <Tabs value={s.font} onChange={(font) => onSettings({ font })} options={FONTS.map((f) => [f, f.split(' ')[0]])} />
        </Field>
        <Field label="Tamaño" value={s.titleSize}>
          <input type="range" min={48} max={120} value={s.titleSize} onChange={(e) => onSettings({ titleSize: Number(e.target.value) })} />
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
