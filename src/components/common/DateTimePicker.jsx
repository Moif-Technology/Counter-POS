import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock } from 'lucide-react'
import Calendar from './Calendar'
import TimePicker from './TimePicker'
import './DateTimePicker.css'

/*
 * DateTimePicker — a date + time field that opens a calendar, a time picker
 * and quick picks in one popover (replaces the browser's datetime-local box).
 *
 *   <DateTimePicker label="Delivery Time" value={when} onChange={setWhen} />
 *
 * Props:
 *   value     — 'YYYY-MM-DDTHH:mm' (same format as <input type="datetime-local">)
 *   onChange  — (value) => void
 *   label     — optional caption above the field
 *   quick     — show the quick picks (default true)
 */
const pad = n => String(n).padStart(2, '0')
const toValue = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function display(v) {
  if (!v) return ''
  const [d, t = '00:00'] = v.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [h, min] = t.split(':').map(Number)
  return `${pad(day)} ${MONTHS[m - 1]} ${y} · ${pad(h % 12 || 12)}:${pad(min)} ${h < 12 ? 'AM' : 'PM'}`
}

const QUICK = [
  { label: 'In 30 min', at: () => new Date(Date.now() + 30 * 60e3) },
  { label: 'In 1 hr',   at: () => new Date(Date.now() + 60 * 60e3) },
  { label: 'In 2 hrs',  at: () => new Date(Date.now() + 120 * 60e3) },
  { label: 'Tomorrow 10 AM', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d } },
]

export default function DateTimePicker({ value, onChange, label, quick = true }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const [top, setTop] = useState(null)
  const fieldRef = useRef(null)
  const popRef = useRef(null)
  const [date, time = '12:00'] = (value || toValue(new Date())).split('T')

  useEffect(() => {
    if (!open) return undefined
    const place = () => setRect(fieldRef.current?.getBoundingClientRect() ?? null)
    const onDown = e => { if (!fieldRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) setOpen(false) }
    // Capture so Escape closes only this popover, not the modal around it.
    const onKey = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); setOpen(false) } }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  // Popover: below the field if it fits, else above it, else as high as needed to stay on screen.
  useLayoutEffect(() => {
    if (!open || !rect || !popRef.current) return
    const h = popRef.current.offsetHeight
    const below = rect.bottom + 6, above = rect.top - 6 - h
    setTop(below + h <= window.innerHeight - 12 ? below : above >= 12 ? above : Math.max(12, window.innerHeight - h - 12))
  }, [open, rect])
  const W = 560
  const pop = rect && {
    left: Math.min(Math.max(rect.left, 12), window.innerWidth - W - 12),
    top: top ?? rect.bottom + 6, width: W,
    visibility: top == null ? 'hidden' : 'visible',   // measured first, then shown in place
  }

  return (
    <div className="ui-dtp">
      {label && <label className="ui-dtp-label">{label}</label>}
      <button
        ref={fieldRef}
        type="button"
        className={`ui-dtp-field${open ? ' is-open' : ''}`}
        onClick={() => { setTop(null); setRect(fieldRef.current.getBoundingClientRect()); setOpen(o => !o) }}
      >
        <span className={value ? '' : 'is-empty'}>{value ? display(value) : 'Pick date & time'}</span>
        <CalendarClock size={16} />
      </button>

      {open && pop && createPortal(
        <div ref={popRef} className="ui-dtp-pop" data-pos-overlay style={pop}>
          <div className="ui-dtp-cal">
            <Calendar value={date} onChange={d => onChange?.(`${d}T${time}`)} />
          </div>
          <div className="ui-dtp-side">
            <span className="ui-dtp-cap">Time</span>
            <TimePicker value={time} onChange={t => onChange?.(`${date}T${t}`)} minuteStep={5} />
            {quick && (
              <>
                <span className="ui-dtp-cap">Quick pick</span>
                <div className="ui-dtp-quick">
                  {QUICK.map(q => (
                    <button key={q.label} type="button" onClick={() => onChange?.(toValue(q.at()))}>{q.label}</button>
                  ))}
                </div>
              </>
            )}
            <div className="ui-dtp-sel">{value ? display(value) : '—'}</div>
            <button type="button" className="ui-dtp-done" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
