import { useState } from 'react'
import type { Captions, Settings, Voiceover } from '../types'
import { transcribe, type TranscribeProgress } from '../voice/transcribe'
import { Field, Section } from './ui'

interface Props {
  settings: Settings
  voice: Voiceover | null
  voiceId: string
  captions: Captions | null
  onSettings: (patch: Partial<Settings>) => void
  onCaptions: (c: Captions | null) => void
  onError: (message: string) => void
}

const LANGUAGES: [string, string][] = [
  ['', 'Detectar idioma'],
  ['spanish', 'Español'],
  ['catalan', 'Català'],
  ['english', 'English'],
]

export function CaptionsTab({ settings: s, voice, voiceId, captions, onSettings, onCaptions, onError }: Props) {
  const [progress, setProgress] = useState<TranscribeProgress | null>(null)
  const [language, setLanguage] = useState(() => (voiceId.startsWith('en') ? 'english' : voiceId.startsWith('ca') ? 'catalan' : 'spanish'))

  const run = async () => {
    if (!voice) return
    setProgress({ status: 'Preparando…', value: null })
    try {
      const words = await transcribe(voice.buffer, language || null, setProgress)
      onCaptions({ words, origin: 'whisper' })
    } catch (e) {
      onError(`No se ha podido transcribir: ${(e as Error).message}`)
    } finally {
      setProgress(null)
    }
  }

  return (
    <>
      <Section
        title="Subtítulos"
        description="Frases cortas sincronizadas con la voz en off, con la palabra que suena resaltada."
        toggle={{ value: s.captionsOn, onChange: (v) => onSettings({ captionsOn: v }) }}
      >
        <p className="note mono">
          {!voice
            ? 'Sin voz en off: genera o sube una en «Guion y voz».'
            : !captions
              ? 'Esta voz aún no tiene subtítulos: transcríbela.'
              : captions.origin === 'script'
                ? `${captions.words.length} palabras, sincronizadas a partir del guion.`
                : `${captions.words.length} palabras, transcritas con IA.`}
        </p>
      </Section>

      <Section
        title="Transcripción automática"
        description="Escucha la voz con Whisper (en tu navegador) para sacar el tiempo exacto de cada palabra. La primera vez descarga el modelo (unos 100 MB)."
      >
        <select className="text-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn block" disabled={!voice || !!progress} onClick={run}>
          {progress ? `${progress.status}${progress.value !== null ? ` ${Math.round(progress.value * 100)}%` : ''}` : '✨ Transcribir voz'}
        </button>
      </Section>

      <Section title="Estilo">
        <Field label="Palabras a la vez" value={s.captionWords}>
          <input type="range" min={1} max={6} value={s.captionWords} onChange={(e) => onSettings({ captionWords: Number(e.target.value) })} />
        </Field>
        <Field label="Tamaño" value={s.captionSize}>
          <input type="range" min={48} max={140} value={s.captionSize} onChange={(e) => onSettings({ captionSize: Number(e.target.value) })} />
        </Field>
        <Field label="Posición vertical" value={`${Math.round(s.captionY * 100)}%`}>
          <input type="range" min={0.15} max={0.9} step={0.01} value={s.captionY} onChange={(e) => onSettings({ captionY: Number(e.target.value) })} />
        </Field>
        <label className="check" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={s.captionUpper} onChange={(e) => onSettings({ captionUpper: e.target.checked })} />
          En mayúsculas
        </label>
        <p className="note mono">La fuente y los colores salen de Lienzo y título.</p>
      </Section>
    </>
  )
}
