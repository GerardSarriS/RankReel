import { useRef, useState } from 'react'
import type { Clip, Script, Settings, Voiceover } from '../types'
import { formatTime } from '../timeline'
import { defaultItemText, ranksInPlayOrder, scriptParts } from '../script'
import { VOICES, generateVoice, type TtsProgress } from '../voice/tts'
import { decodeBlob, startMicRecording } from '../voice/audio'
import { Field, Section, Tabs } from './ui'

interface Props {
  clips: Clip[]
  settings: Settings
  script: Script
  voiceId: string
  voice: Voiceover | null
  onScript: (s: Script) => void
  onVoiceId: (id: string) => void
  onVoice: (v: Voiceover | null) => void
  onSettings: (patch: Partial<Settings>) => void
  onFit: () => void
  onError: (message: string) => void
}

type Mode = 'tts' | 'upload' | 'record'

export function ScriptVoiceTab({ clips, settings, script, voiceId, voice, onScript, onVoiceId, onVoice, onSettings, onFit, onError }: Props) {
  const [mode, setMode] = useState<Mode>('tts')
  const [progress, setProgress] = useState<TtsProgress | null>(null)
  const [recording, setRecording] = useState<{ stop: () => Promise<Blob> } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const ranks = ranksInPlayOrder(clips)

  const generate = async () => {
    const parts = scriptParts(script, clips, settings.hookText, voiceId)
    if (!parts.length) return onError('El guion está vacío.')
    setProgress({ phase: 'speak', value: 0 })
    try {
      const { buffer, segments } = await generateVoice(parts, voiceId, setProgress)
      onVoice({ buffer, segments, origin: 'tts', name: VOICES.find((v) => v.id === voiceId)?.label ?? voiceId })
    } catch (e) {
      onError(`No se ha podido generar la voz: ${(e as Error).message}`)
    } finally {
      setProgress(null)
    }
  }

  const applyBlob = async (blob: Blob, origin: 'upload' | 'record', name: string) => {
    try {
      onVoice({ buffer: await decodeBlob(blob), segments: null, origin, name })
    } catch {
      onError('No se puede leer ese audio.')
    }
  }

  const toggleRecording = async () => {
    if (recording) {
      setRecording(null)
      void applyBlob(await recording.stop(), 'record', 'Grabación')
      return
    }
    try {
      setRecording(await startMicRecording())
    } catch {
      onError('No se ha podido acceder al micrófono.')
    }
  }

  return (
    <>
      <Section title="Guion" description="Lo que dirá la voz: una intro y una frase por puesto, en el orden del timeline.">
        <Field label="Intro">
          <textarea
            className="text-input"
            rows={2}
            value={script.intro ?? settings.hookText}
            onChange={(e) => onScript({ ...script, intro: e.target.value })}
          />
        </Field>
        {ranks.map((rank) => (
          <Field key={rank} label={`Puesto #${rank}`}>
            <textarea
              className="text-input"
              rows={2}
              value={script.items[rank] ?? defaultItemText(clips, rank, voiceId)}
              onChange={(e) => onScript({ ...script, items: { ...script.items, [rank]: e.target.value } })}
            />
          </Field>
        ))}
        {!ranks.length && <p className="note mono">Añade clips para escribir una frase por puesto.</p>}
        {ranks.length > 0 && (
          <button className="btn small" style={{ marginTop: 10 }} onClick={() => onScript({ intro: null, items: {} })}>
            ↺ Rehacer desde las etiquetas
          </button>
        )}
      </Section>

      <Section title="Voz en off">
        <Tabs
          value={mode}
          onChange={setMode}
          options={[
            ['tts', 'Generar'],
            ['upload', 'Subir'],
            ['record', 'Grabar'],
          ]}
        />
        {mode === 'tts' && (
          <>
            <p className="desc">Voz sintética que se genera en tu navegador. La primera vez descarga la voz (unos 60 MB).</p>
            <select className="text-input" value={voiceId} onChange={(e) => onVoiceId(e.target.value)}>
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button className="btn primary block" disabled={!!progress || !clips.length} onClick={generate}>
              {progress
                ? progress.phase === 'download'
                  ? `Descargando voz… ${Math.round(progress.value * 100)}%`
                  : `Generando… ${Math.round(progress.value * 100)}%`
                : '🎙 Generar voz'}
            </button>
          </>
        )}
        {mode === 'upload' && (
          <>
            <p className="desc">Sube tu propia locución (MP3, WAV, M4A…).</p>
            <button className="btn block" onClick={() => fileInput.current?.click()}>
              ⇪ Subir audio
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="audio/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void applyBlob(f, 'upload', f.name)
                e.target.value = ''
              }}
            />
          </>
        )}
        {mode === 'record' && (
          <>
            <p className="desc">Lee el guion en voz alta. Al parar, la grabación pasa a ser la voz en off.</p>
            <button className={recording ? 'btn primary block' : 'btn block'} onClick={toggleRecording}>
              {recording ? '■ Parar grabación' : '● Empezar a grabar'}
            </button>
          </>
        )}
      </Section>

      {voice && (
        <Section title="Voz actual">
          <div className="voice-card">
            <div>
              <strong>{voice.name}</strong>
              <span className="mono dim"> · {formatTime(voice.buffer.duration)}</span>
            </div>
            <button className="icon-btn" onClick={() => onVoice(null)} aria-label="Quitar voz">
              ✕
            </button>
          </div>
          <button className="btn block" onClick={onFit} disabled={!clips.length}>
            ⟳ Ajustar clips a la voz
          </button>
          <p className="note mono">
            {voice.segments ? 'Cada puesto durará lo mismo que su frase.' : 'Los clips se alargan o acortan para durar lo mismo que la voz.'}
          </p>
          <Field label="Volumen de la voz" value={`${Math.round(settings.voiceVolume * 100)}%`}>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={settings.voiceVolume}
              onChange={(e) => onSettings({ voiceVolume: Number(e.target.value) })}
            />
          </Field>
          <Field label="Volumen de los clips" value={`${Math.round(settings.clipVolume * 100)}%`}>
            <input type="range" min={0} max={1} step={0.05} value={settings.clipVolume} onChange={(e) => onSettings({ clipVolume: Number(e.target.value) })} />
          </Field>
        </Section>
      )}
    </>
  )
}
