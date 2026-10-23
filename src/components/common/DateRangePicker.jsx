import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import './DateRangePicker.css'

/*
 * DateRangePicker — one "From → To" field that opens a range calendar.
 *
 *   <DateRangePicker from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />
 *
 * Props:
 *   from, to  — 'YYYY-MM-DD'
 *   onChange  — (from, to) => void, called once a full range is picked
 *   label     — caption above the field (default 'Date range')
 *   style     — extra styles for the wrapper (e.g. gridColumn: 'span 2')
 *
 * Tap a start day, then an end day (an earlier end day swaps them), or pick a
 * preset. Escape closes the calendar without closing the surrounding modal.
 */

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = n => String(n).padStart(2, '0')
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
/** '2026-10-23' → '23 Oct 2026' */
const pretty = s => { if (!s) return '—'; const d = parse(s); return `${pad(d.getDate())} ${SHORT[d.getMonth()]} ${d.getFullYear()}` }

function presets() {
  const t = new Date()
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  return [
    { label: 'Today',        from: today,              to: today },
    { label: 'Yesterday',    from: addDays(today, -1), to: addDays(today, -1) },
    { label: 'Last 7 days',  from: addDays(today, -6), to: today },
    { label: 'Last 30 days', from: addDays(today, -29), to: today },
    { label: 'This month',   from: monthStart,         to: today },
    { label: 'Last month',   from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: addDays(monthStart, -1) },
  ].map(p => ({ label: p.label, from: iso(p.from), to: iso(p.to) }))
}

const GAP = 6
const EDGE = 10

export default function DateRangePicker({ from, to, onChange, label = 'Date range', style }) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState(null)   // first day tapped, while picking the end day
  const [hover, setHover] = useState(null)
  const [view, setView] = useState(() => parse(to || from || iso(new Date())))
  const [pos, setPos] = useState(null)
  const fieldRef = useRef(null)
  const popRef = useRef(null)

  const openPicker = () => {
    setStart(null)
    setView(parse(to || from || iso(new Date())))
    setOpen(true)
  }

  // Anchor the popover under the field (above when there is no room), kept on screen.
  useLayoutEffect(() => {
    if (!open) return undefined
    const place = () => {
      const f = fieldRef.current?.getBoundingClientRect(); const p = popRef.current?.getBoundingClientRect()
      if (!f || !p) return
      const left = Math.min(Math.max(f.left, EDGE), window.innerWidth - p.width - EDGE)
      const below = f.bottom + GAP
      const top = below + p.height <= window.innerHeight - EDGE ? below : Math.max(f.top - GAP - p.height, EDGE)
      setPos({ left, top })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onDown = e => {
      if (!fieldRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) setOpen(false)
    }
    // Capture phase so this runs before (and stops) a modal's own Escape handler.
    const onKey = e => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey, true) }
  }, [open])

  const commit = (f, t) => { onChange?.(f, t); setOpen(false); setStart(null) }

  const pickDay = (day) => {
    if (!start) { setStart(day); return }
    commit(day < start ? day : start, day < start ? start : day)
  }

  // Range to highlight: the saved one, or the one being picked (start → hovered day).
  const lo = start ? (hover && hover < start ? hover : start) : from
  const hi = start ? (hover && hover > start ? hover : start) : to

  const y = view.getFullYear(), m = view.getMonth()
  const blanks = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const todayIso = iso(new Date())

  return (
    <div className="ui-drp" style={style}>
      <span className="ui-drp-label"><CalendarDays size={11} /> {label}</span>
      <button
        ref={fieldRef}
        type="button"
        className={`ui-drp-field${open ? ' is-open' : ''}`}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="ui-drp-date">{pretty(from)}</span>
        <ArrowRight size={14} className="ui-drp-arrow" />
        <span className="ui-drp-date">{pretty(to)}</span>
        <CalendarDays size={15} className="ui-drp-icon" />
      </button>

      {open && createPortal(
        // data-pos-overlay: POS screens treat taps here as popup taps (no barcode refocus).
        <div
          ref={popRef}
          className="ui-drp-pop"
          data-pos-overlay
          role="dialog"
          aria-label="Choose a date range"
          style={pos ?? { visibility: 'hidden', top: 0, left: 0 }}
        >
          <div className="ui-drp-presets">
            {presets().map(p => (
              <button
                key={p.label}
                type="button"
                className={`ui-drp-preset${!start && p.from === from && p.to === to ? ' is-on' : ''}`}
                onClick={() => commit(p.from, p.to)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="ui-drp-cal">
            <div className="ui-drp-head">
              <button type="button" className="ui-drp-nav" onClick={() => setView(new Date(y, m - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
              <b>{MONTHS[m]} {y}</b>
              <button type="button" className="ui-drp-nav" onClick={() => setView(new Date(y, m + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
            </div>

            <div className="ui-drp-grid">
              {DAYS.map(d => <span key={d} className="ui-drp-dow">{d}</span>)}
              {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: days }, (_, i) => {
                const day = iso(new Date(y, m, i + 1))
                const isEdge = day === lo || day === hi
                const inside = lo && hi && day > lo && day < hi
                const cls = [
                  'ui-drp-day',
                  inside && 'is-in',
                  isEdge && 'is-edge',
                  day === lo && hi && lo !== hi && 'is-lo',
                  day === hi && lo && lo !== hi && 'is-hi',
                  day === todayIso && 'is-today',
                ].filter(Boolean).join(' ')
                return (
                  <button
                    key={day}
                    type="button"
                    className={cls}
                    onClick={() => pickDay(day)}
                    onPointerEnter={() => setHover(day)}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>

            <p className="ui-drp-hint">
              {start ? <>From <b>{pretty(start)}</b> — now tap the end date</> : 'Tap a start date, then an end date'}
            </p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
