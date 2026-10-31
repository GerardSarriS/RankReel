import { useRef } from 'react'

interface Props {
  /** 'x' resizes widths (vertical bar), 'y' resizes heights (horizontal bar). */
  axis: 'x' | 'y'
  label: string
  /** Size of the panel being resized when the drag starts. */
  getSize: () => number
  /** Moving the pointer by +1px changes the size by `direction` px. */
  direction: 1 | -1
  onResize: (size: number) => void
  onReset: () => void
}

/** Draggable divider between two blocks. Double-click restores the default size. */
export function Splitter({ axis, label, getSize, direction, onResize, onReset }: Props) {
  const drag = useRef<{ start: number; size: number } | null>(null)
  const pos = (e: { clientX: number; clientY: number }) => (axis === 'x' ? e.clientX : e.clientY)

  return (
    <div
      className={`splitter splitter-${axis}`}
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-label={label}
      title={`${label} · doble clic para restablecer`}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { start: pos(e), size: getSize() }
        document.body.classList.add(axis === 'x' ? 'resizing-x' : 'resizing-y')
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (d) onResize(d.size + (pos(e) - d.start) * direction)
      }}
      onPointerUp={() => {
        if (!drag.current) return
        drag.current = null
        document.body.classList.remove('resizing-x', 'resizing-y')
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const keys = axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
        const i = keys.indexOf(e.key)
        if (i < 0) return
        e.preventDefault()
        onResize(getSize() + (i === 0 ? -16 : 16) * direction)
      }}
    >
      <span />
    </div>
  )
}
