import { useEffect, useRef } from 'react'
import './WheelPicker.css'

/**
 * WheelPicker — a vertical scroll wheel (iOS-style) that snaps to one value.
 *
 *   <WheelPicker values={[1, 2, 3]} value={qty} onChange={setQty} />
 *
 * Props:
 *   values    — array of selectable values (numbers or strings)
 *   value     — the selected value; the wheel scrolls to it when it changes from outside
 *   onChange  — (value) => void, called as the wheel settles on a new value
 *   format    — (value) => node, how each value is shown (default String)
 *   itemHeight— row height in px (default 48)
 *   visible   — rows shown, odd number (default 5)
 */
export default function WheelPicker({ values, value, onChange, format = String, itemHeight = 48, visible = 5 }) {
  const ref = useRef(null)
  const emitted = useRef(value)   // last value this wheel reported, so outside changes can be told apart
  const frame = useRef(0)
  const pad = itemHeight * Math.floor(visible / 2)

  // Scroll to `value` when it is set from outside (typed, +/-), not by the wheel itself.
  useEffect(() => {
    const el = ref.current
    const idx = values.indexOf(value)
    if (!el || idx < 0 || value === emitted.current && el.dataset.ready) return
    el.scrollTo({ top: idx * itemHeight, behavior: el.dataset.ready ? 'smooth' : 'auto' })
    el.dataset.ready = '1'
    emitted.current = value
  }, [value, values, itemHeight])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const handleScroll = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      const idx = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / itemHeight)))
      const next = values[idx]
      if (next !== emitted.current) {
        emitted.current = next
        onChange(next)
      }
    })
  }

  const pick = (idx) => ref.current?.scrollTo({ top: idx * itemHeight, behavior: 'smooth' })

  return (
    <div className="ui-wheel" style={{ height: itemHeight * visible, '--wheel-item-h': `${itemHeight}px` }}>
      <div className="ui-wheel-band" style={{ top: pad, height: itemHeight }} />
      <div className="ui-wheel-scroll" ref={ref} onScroll={handleScroll} style={{ paddingBlock: pad, scrollPaddingTop: pad }}>
        {values.map((v, i) => (
          <button
            key={v}
            type="button"
            className={`ui-wheel-item${v === value ? ' is-selected' : ''}`}
            onClick={() => pick(i)}
          >
            {format(v)}
          </button>
        ))}
      </div>
    </div>
  )
}
