import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import Calendar from './Calendar'

/*
 * DatePicker — a date field that opens the POS Calendar in a popover.
 *
 *   <DatePicker label="Bill Date" value={billDate} onChange={setBillDate} />
 *
 * Props:
 *   value     — 'YYYY-MM-DD'
 *   onChange  — (value: 'YYYY-MM-DD') => void
 *   label     — optional caption above the field
 *   placement — 'top' | 'bottom' (default 'top') — where the calendar opens
 *   fieldStyle— extra styles for the field button
 *
 * Escape closes an open calendar without closing the surrounding modal.
 */
export default function DatePicker({ value, onChange, label, placement = 'top', fieldStyle }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = e => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    // Capture phase so this runs before (and stops) a modal's own Escape handler.
    const onKey = e => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const popover = placement === 'top'
    ? { bottom: 'calc(100% + 6px)', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)' }
    : { top: 'calc(100% + 6px)', boxShadow: '0 8px 40px rgba(0,0,0,0.14)' }

  return (
    <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
      {label && (
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          height: 36, borderRadius: 8, width: '100%', boxSizing: 'border-box',
          border: `1.5px solid ${open ? 'var(--brand)' : 'var(--border)'}`,
          background: open ? 'var(--brand-bg)' : 'var(--surface)',
          padding: '0 12px',
          outline: 'none', cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s',
          touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          ...fieldStyle,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: value ? 'var(--text-1)' : 'var(--text-4)', fontFamily: 'inherit' }}>
          {value ? formatDisplayDate(value) : 'DD / MM / YYYY'}
        </span>
        <CalendarDays size={15} color={open ? 'var(--brand)' : 'var(--text-4)'} />
      </button>
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 200, borderRadius: 12, overflow: 'hidden', ...popover }}>
          <Calendar value={value} onChange={d => { onChange?.(d); setOpen(false) }} />
        </div>
      )}
    </div>
  )
}

/** 'YYYY-MM-DD' → 'DD / MM / YYYY' */
function formatDisplayDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d} / ${m} / ${y}`
}
