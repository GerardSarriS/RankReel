import { useCallback, useEffect, useState } from 'react'

/** Sizes of the resizable blocks, in px. `timeline: null` means "as tall as its content". */
export interface LayoutSizes {
  left: number
  right: number
  timeline: number | null
}

const DEFAULTS: LayoutSizes = { left: 300, right: 320, timeline: null }
const KEY = 'rankreel.layout'

export const LIMITS = {
  left: [220, 560],
  right: [260, 560],
  timeline: [120, Infinity],
} as const

const clamp = (v: number, [min, max]: readonly [number, number]) => Math.round(Math.min(max, Math.max(min, v)))

function load(): LayoutSizes {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<LayoutSizes> | null
    return { ...DEFAULTS, ...saved }
  } catch {
    return DEFAULTS
  }
}

/** Panel sizes, remembered in this browser only (a per-viewer convenience). */
export function useLayout() {
  const [sizes, setSizes] = useState<LayoutSizes>(load)

  const resize = useCallback((key: keyof LayoutSizes, value: number | null) => {
    setSizes((s) => {
      if (value === null) return { ...s, [key]: DEFAULTS[key] }
      // Leave the preview at least 240px tall above the timeline.
      const limits = key === 'timeline' ? ([LIMITS.timeline[0], Math.max(LIMITS.timeline[0], window.innerHeight - 56 - 240)] as const) : LIMITS[key]
      return { ...s, [key]: clamp(value, limits) }
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(sizes))
    } catch {
      // Storage unavailable: the sizes still work for this session.
    }
  }, [sizes])

  return { sizes, resize }
}
