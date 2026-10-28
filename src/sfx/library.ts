/**
 * Built-in sound effects, synthesized with Web Audio so there are no files or licenses involved.
 * Each effect renders once into an AudioBuffer and is cached.
 */

const RATE = 44100

export interface SfxDef {
  id: string
  name: string
  category: string
  emoji: string
}

interface LibSfx extends SfxDef {
  duration: number
  synth: (ctx: OfflineAudioContext, noise: AudioBuffer) => void
}

// ---- building blocks --------------------------------------------------------

/** Deterministic pseudo-random numbers, so every render sounds the same. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function makeNoise(ctx: OfflineAudioContext): AudioBuffer {
  const b = ctx.createBuffer(1, ctx.length, RATE)
  const d = b.getChannelData(0)
  const r = rng(7)
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1
  return b
}

function noiseAt(ctx: OfflineAudioContext, noise: AudioBuffer, at: number, dur: number) {
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.start(at, at, dur)
  return src
}

function osc(ctx: OfflineAudioContext, type: OscillatorType, freq: number, at: number, dur: number) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  o.start(at)
  o.stop(at + dur)
  return o
}

function filter(ctx: OfflineAudioContext, type: BiquadFilterType, freq: number, q = 1) {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

/** Gain with a quick attack and an exponential decay. */
function pluck(ctx: OfflineAudioContext, at: number, peak: number, decay: number, attack = 0.005) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.linearRampToValueAtTime(peak, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  return g
}

/** Gain that holds `peak` and then releases. */
function hold(ctx: OfflineAudioContext, at: number, peak: number, dur: number, release = 0.05) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(peak, at + 0.01)
  g.gain.setValueAtTime(peak, at + Math.max(0.01, dur - release))
  g.gain.linearRampToValueAtTime(0, at + dur)
  return g
}

function chain(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
  return nodes[nodes.length - 1]
}

const out = (ctx: OfflineAudioContext) => ctx.destination

// ---- the library ------------------------------------------------------------

const LIBRARY: LibSfx[] = [
  {
    id: 'whoosh',
    name: 'Whoosh',
    category: 'Transiciones',
    emoji: '💨',
    duration: 0.8,
    synth: (ctx, noise) => {
      const f = filter(ctx, 'bandpass', 300, 1.2)
      f.frequency.setValueAtTime(300, 0)
      f.frequency.exponentialRampToValueAtTime(3500, 0.35)
      f.frequency.exponentialRampToValueAtTime(400, 0.75)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, 0)
      g.gain.linearRampToValueAtTime(1, 0.32)
      g.gain.linearRampToValueAtTime(0, 0.75)
      chain(noiseAt(ctx, noise, 0, 0.8), f, g, out(ctx))
    },
  },
  {
    id: 'swoosh',
    name: 'Swoosh rápido',
    category: 'Transiciones',
    emoji: '🌬️',
    duration: 0.4,
    synth: (ctx, noise) => {
      const f = filter(ctx, 'highpass', 800, 0.8)
      f.frequency.exponentialRampToValueAtTime(7000, 0.3)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, 0)
      g.gain.linearRampToValueAtTime(0.9, 0.1)
      g.gain.linearRampToValueAtTime(0, 0.35)
      chain(noiseAt(ctx, noise, 0, 0.4), f, g, out(ctx))
    },
  },
  {
    id: 'riser',
    name: 'Subida de tensión',
    category: 'Transiciones',
    emoji: '📈',
    duration: 2.1,
    synth: (ctx, noise) => {
      const f = filter(ctx, 'bandpass', 200, 2)
      f.frequency.exponentialRampToValueAtTime(5000, 2)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, 0)
      g.gain.linearRampToValueAtTime(0.7, 1.9)
      g.gain.linearRampToValueAtTime(0, 2.05)
      chain(noiseAt(ctx, noise, 0, 2.1), f, g, out(ctx))
      const o = osc(ctx, 'sawtooth', 110, 0, 2.05)
      o.frequency.exponentialRampToValueAtTime(880, 2)
      const og = ctx.createGain()
      og.gain.setValueAtTime(0, 0)
      og.gain.linearRampToValueAtTime(0.12, 1.9)
      og.gain.linearRampToValueAtTime(0, 2.05)
      chain(o, filter(ctx, 'lowpass', 2000), og, out(ctx))
    },
  },
  {
    id: 'boom',
    name: 'Boom',
    category: 'Impactos',
    emoji: '💥',
    duration: 1.6,
    synth: (ctx, noise) => {
      const o = osc(ctx, 'sine', 150, 0, 1.6)
      o.frequency.exponentialRampToValueAtTime(35, 0.8)
      chain(o, pluck(ctx, 0, 1, 1.5), out(ctx))
      chain(noiseAt(ctx, noise, 0, 0.7), filter(ctx, 'lowpass', 500), pluck(ctx, 0, 0.9, 0.6), out(ctx))
    },
  },
  {
    id: 'punch',
    name: 'Golpe',
    category: 'Impactos',
    emoji: '👊',
    duration: 0.35,
    synth: (ctx, noise) => {
      chain(noiseAt(ctx, noise, 0, 0.2), filter(ctx, 'lowpass', 1800), pluck(ctx, 0, 1, 0.15, 0.002), out(ctx))
      const o = osc(ctx, 'sine', 180, 0, 0.35)
      o.frequency.exponentialRampToValueAtTime(50, 0.15)
      chain(o, pluck(ctx, 0, 1, 0.3, 0.002), out(ctx))
    },
  },
  {
    id: 'heartbeat',
    name: 'Latido',
    category: 'Impactos',
    emoji: '💓',
    duration: 1.1,
    synth: (ctx) => {
      for (const [at, peak] of [
        [0, 1],
        [0.28, 0.75],
      ]) {
        const o = osc(ctx, 'sine', 75, at, 0.3)
        o.frequency.exponentialRampToValueAtTime(42, at + 0.2)
        chain(o, pluck(ctx, at, peak, 0.25, 0.01), out(ctx))
      }
    },
  },
  {
    id: 'drumroll',
    name: 'Redoble',
    category: 'Ranking',
    emoji: '🥁',
    duration: 2.8,
    synth: (ctx, noise) => {
      const r = rng(3)
      for (let t = 0; t < 2; t += 1 / 26) {
        const level = 0.12 + (t / 2) * 0.55
        chain(noiseAt(ctx, noise, t, 0.06), filter(ctx, 'bandpass', 1600 + r() * 600, 0.8), pluck(ctx, t, level, 0.05, 0.002), out(ctx))
      }
      chain(noiseAt(ctx, noise, 2.05, 0.75), filter(ctx, 'highpass', 4500), pluck(ctx, 2.05, 0.8, 0.7, 0.003), out(ctx))
      const o = osc(ctx, 'sine', 110, 2.05, 0.5)
      o.frequency.exponentialRampToValueAtTime(50, 2.3)
      chain(o, pluck(ctx, 2.05, 0.9, 0.4), out(ctx))
    },
  },
  {
    id: 'tada',
    name: 'Tachán',
    category: 'Ranking',
    emoji: '🎉',
    duration: 1.7,
    synth: (ctx) => {
      const lp = filter(ctx, 'lowpass', 3200)
      lp.connect(out(ctx))
      for (const f of [523.25, 659.25, 783.99]) chain(osc(ctx, 'sawtooth', f, 0, 0.16), hold(ctx, 0, 0.1, 0.16, 0.04), lp)
      for (const f of [523.25, 659.25, 783.99, 1046.5]) chain(osc(ctx, 'sawtooth', f, 0.2, 1.45), hold(ctx, 0.2, 0.09, 1.45, 0.6), lp)
    },
  },
  {
    id: 'ding',
    name: 'Ding',
    category: 'Ranking',
    emoji: '🔔',
    duration: 1.8,
    synth: (ctx) => {
      for (const [f, g] of [
        [1318.5, 0.5],
        [2637, 0.2],
        [3955.5, 0.07],
      ])
        chain(osc(ctx, 'sine', f, 0, 1.8), pluck(ctx, 0, g, 1.75), out(ctx))
    },
  },
  {
    id: 'bell',
    name: 'Campana',
    category: 'Ranking',
    emoji: '🛎️',
    duration: 2.6,
    synth: (ctx) => {
      const partials: [number, number, number][] = [
        [1, 0.45, 2.5],
        [2.76, 0.25, 1.6],
        [5.4, 0.12, 0.9],
        [8.93, 0.06, 0.5],
      ]
      for (const [ratio, g, decay] of partials) chain(osc(ctx, 'sine', 660 * ratio, 0, decay + 0.05), pluck(ctx, 0, g, decay), out(ctx))
    },
  },
  {
    id: 'sparkle',
    name: 'Destello',
    category: 'Ranking',
    emoji: '✨',
    duration: 1.5,
    synth: (ctx) => {
      const r = rng(11)
      for (let i = 0; i < 10; i++) {
        const at = i * 0.08
        chain(osc(ctx, 'sine', 1800 + r() * 2600, at, 0.45), pluck(ctx, at, 0.14, 0.4), out(ctx))
      }
    },
  },
  {
    id: 'applause',
    name: 'Aplausos',
    category: 'Ranking',
    emoji: '👏',
    duration: 2.8,
    synth: (ctx, noise) => {
      const r = rng(5)
      for (let i = 0; i < 380; i++) {
        const at = r() * 2.4
        const fade = at > 1.8 ? 1 - (at - 1.8) / 0.7 : Math.min(1, at / 0.3 + 0.3)
        chain(noiseAt(ctx, noise, at, 0.03), filter(ctx, 'bandpass', 900 + r() * 1800, 1.5), pluck(ctx, at, 0.35 * fade, 0.02, 0.001), out(ctx))
      }
    },
  },
  {
    id: 'coin',
    name: 'Moneda',
    category: 'Juego y humor',
    emoji: '🪙',
    duration: 0.55,
    synth: (ctx) => {
      chain(osc(ctx, 'square', 987.77, 0, 0.08), hold(ctx, 0, 0.15, 0.08, 0.005), out(ctx))
      chain(osc(ctx, 'square', 1318.5, 0.08, 0.45), pluck(ctx, 0.08, 0.15, 0.42), out(ctx))
    },
  },
  {
    id: 'powerup',
    name: 'Subir de nivel',
    category: 'Juego y humor',
    emoji: '⬆️',
    duration: 0.75,
    synth: (ctx) => {
      ;[523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => {
        const at = i * 0.07
        chain(osc(ctx, 'square', f, at, 0.14), pluck(ctx, at, 0.12, 0.13, 0.003), out(ctx))
      })
    },
  },
  {
    id: 'boing',
    name: 'Boing',
    category: 'Juego y humor',
    emoji: '🤸',
    duration: 0.8,
    synth: (ctx) => {
      const o = osc(ctx, 'sine', 200, 0, 0.8)
      o.frequency.linearRampToValueAtTime(320, 0.7)
      const lfo = osc(ctx, 'sine', 16, 0, 0.8)
      const depth = ctx.createGain()
      depth.gain.setValueAtTime(110, 0)
      depth.gain.exponentialRampToValueAtTime(1, 0.75)
      chain(lfo, depth)
      depth.connect(o.frequency)
      chain(o, pluck(ctx, 0, 0.7, 0.75), out(ctx))
    },
  },
  {
    id: 'sad-trombone',
    name: 'Trombón triste',
    category: 'Juego y humor',
    emoji: '😢',
    duration: 2.5,
    synth: (ctx) => {
      const lp = filter(ctx, 'lowpass', 1100)
      lp.connect(out(ctx))
      const notes: [number, number, number][] = [
        [392, 0, 0.45],
        [370, 0.5, 0.45],
        [349.2, 1, 0.45],
        [329.6, 1.5, 0.95],
      ]
      for (const [f, at, dur] of notes) {
        const o = osc(ctx, 'sawtooth', f, at, dur)
        if (dur > 0.5) {
          const lfo = osc(ctx, 'sine', 6, at, dur)
          const depth = ctx.createGain()
          depth.gain.value = 8
          chain(lfo, depth)
          depth.connect(o.frequency)
        }
        chain(o, hold(ctx, at, 0.22, dur, 0.15), lp)
      }
    },
  },
  {
    id: 'buzzer',
    name: 'Error',
    category: 'Juego y humor',
    emoji: '❌',
    duration: 0.7,
    synth: (ctx) => {
      const lp = filter(ctx, 'lowpass', 1500)
      chain(lp, hold(ctx, 0, 0.3, 0.65, 0.08), out(ctx))
      osc(ctx, 'square', 110, 0, 0.7).connect(lp)
      osc(ctx, 'square', 116.5, 0, 0.7).connect(lp)
    },
  },
  {
    id: 'laser',
    name: 'Láser',
    category: 'Juego y humor',
    emoji: '🔫',
    duration: 0.4,
    synth: (ctx) => {
      const o = osc(ctx, 'square', 1600, 0, 0.35)
      o.frequency.exponentialRampToValueAtTime(180, 0.3)
      chain(o, pluck(ctx, 0, 0.18, 0.32, 0.002), out(ctx))
    },
  },
  {
    id: 'pop',
    name: 'Pop',
    category: 'Interfaz',
    emoji: '🫧',
    duration: 0.15,
    synth: (ctx) => {
      const o = osc(ctx, 'sine', 300, 0, 0.15)
      o.frequency.exponentialRampToValueAtTime(1000, 0.06)
      chain(o, pluck(ctx, 0, 0.8, 0.12, 0.002), out(ctx))
    },
  },
  {
    id: 'tick',
    name: 'Tic',
    category: 'Interfaz',
    emoji: '⏱️',
    duration: 0.08,
    synth: (ctx, noise) => chain(noiseAt(ctx, noise, 0, 0.05), filter(ctx, 'highpass', 3000), pluck(ctx, 0, 1, 0.03, 0.001), out(ctx)),
  },
  {
    id: 'shutter',
    name: 'Cámara',
    category: 'Interfaz',
    emoji: '📸',
    duration: 0.3,
    synth: (ctx, noise) => {
      for (const at of [0, 0.09]) chain(noiseAt(ctx, noise, at, 0.08), filter(ctx, 'bandpass', 2500, 1), pluck(ctx, at, 0.9, 0.06, 0.001), out(ctx))
    },
  },
]

export const BUILTIN_SFX: SfxDef[] = LIBRARY.map(({ id, name, category, emoji }) => ({ id, name, category, emoji }))

const buffers = new Map<string, AudioBuffer>()

async function render(s: LibSfx): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(s.duration * RATE), RATE)
  s.synth(ctx, makeNoise(ctx))
  return normalize(await ctx.startRendering())
}

/** Brings every effect to the same peak so none is much louder than the others. */
function normalize(b: AudioBuffer, peak = 0.8): AudioBuffer {
  const d = b.getChannelData(0)
  let max = 0
  for (let i = 0; i < d.length; i++) max = Math.max(max, Math.abs(d[i]))
  if (max > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / max
  return b
}

/** Renders every built-in effect. Takes a fraction of a second. */
export async function loadBuiltinSfx() {
  await Promise.all(LIBRARY.map(async (s) => buffers.set(s.id, await render(s))))
}

export const registerSfxBuffer = (id: string, buffer: AudioBuffer) => buffers.set(id, buffer)
export const sfxBuffer = (id: string) => buffers.get(id) ?? null
