import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [rect, setRect] = useState(null)
  const fieldRef = useRef(null)
  const popRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    // The calendar is portalled to <body>, so it isn't clipped by a modal's
    // overflow; keep it anchored to the field.
    const place = () => setRect(fieldRef.current?.getBoundingClientRect() ?? null)
    const onDown = e => {
      if (!fieldRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) setOpen(false)
    }
    // Capture phase so this runs before (and stops) a modal's own Escape handler.
    const onKey = e => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const popover = rect && (placement === 'top'
    ? { bottom: window.innerHeight - rect.top + 6, boxShadow: '0 -8px 40px rgba(0,0,0,0.14)' }
    : { top: rect.bottom + 6, boxShadow: '0 8px 40px rgba(0,0,0,0.14)' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <button
        ref={fieldRef}
        type="button"
        onClick={() => {
          setRect(fieldRef.current.getBoundingClientRect())
          setOpen(o => !o)
        }}
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
      {open && popover && createPortal(
        // data-pos-overlay: POS screens treat clicks here as modal clicks (no barcode refocus).
        <div
          ref={popRef}
          data-pos-overlay
          style={{
            position: 'fixed', left: rect.left, width: rect.width, zIndex: 5000,
            borderRadius: 12, overflow: 'hidden', ...popover,
          }}
        >
          <Calendar value={value} onChange={d => { onChange?.(d); setOpen(false) }} />
        </div>,
        document.body,
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
