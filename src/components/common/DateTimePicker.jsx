import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import Calendar from './Calendar'
import './DateTimePicker.css'

/*
 * DateTimePicker — a date + time field; tap it for a small popover with the
 * common Calendar and one compact time row (hour · minute · AM/PM), then Done.
 * Same look as DatePicker.
 *
 *   <DateTimePicker label="Delivery Time" value={when} onChange={setWhen} />
 *
 * Props:
 *   value      — 'YYYY-MM-DDTHH:mm' (same format as <input type="datetime-local">)
 *   onChange   — (value) => void
 *   label      — optional caption above the field
 *   minuteStep — minutes per tap (default 5)
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

const POP_MIN_W = 300

export default function DateTimePicker({ value, onChange, label, minuteStep = 5 }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const [top, setTop] = useState(null)
  const fieldRef = useRef(null)
  const popRef = useRef(null)
  const [date, time = '12:00'] = (value || toValue(new Date())).split('T')
  const [h, m] = time.split(':').map(Number)

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

  // Below the field if it fits, else above it, else as high as needed to stay on screen.
  useLayoutEffect(() => {
    if (!open || !rect || !popRef.current) return
    const ph = popRef.current.offsetHeight
    const below = rect.bottom + 6, above = rect.top - 6 - ph
    setTop(below + ph <= window.innerHeight - 12 ? below : above >= 12 ? above : Math.max(12, window.innerHeight - ph - 12))
  }, [open, rect])
  const width = rect ? Math.max(rect.width, POP_MIN_W) : POP_MIN_W
  const pop = rect && {
    left: Math.min(Math.max(rect.left, 12), window.innerWidth - width - 12),
    top: top ?? rect.bottom + 6, width,
    visibility: top == null ? 'hidden' : 'visible',   // measured first, then shown in place
  }

  const setTime = (hh, mm) => onChange?.(`${date}T${pad(hh)}:${pad(mm)}`)
  const stepHour = d => setTime((h + d + 24) % 24, m)
  const stepMin  = d => {
    const total = (h * 60 + Math.round(m / minuteStep) * minuteStep + d * minuteStep + 1440) % 1440
    setTime(Math.floor(total / 60), total % 60)
  }
  const pm = h >= 12
  const setPm = want => { if (want !== pm) setTime((h + 12) % 24, m) }

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
        // data-pos-overlay: POS screens treat clicks here as modal clicks (no barcode refocus).
        <div ref={popRef} className="ui-dtp-pop" data-pos-overlay style={pop}>
          <Calendar value={date} onChange={d => onChange?.(`${d}T${time}`)} />
          <div className="ui-dtp-time">
            <div className="ui-dtp-step">
              <button type="button" onClick={() => stepHour(-1)} aria-label="Hour down"><ChevronLeft size={16} /></button>
              <b>{pad(h % 12 || 12)}</b>
              <button type="button" onClick={() => stepHour(1)} aria-label="Hour up"><ChevronRight size={16} /></button>
            </div>
            <span className="ui-dtp-colon">:</span>
            <div className="ui-dtp-step">
              <button type="button" onClick={() => stepMin(-1)} aria-label="Minute down"><ChevronLeft size={16} /></button>
              <b>{pad(m)}</b>
              <button type="button" onClick={() => stepMin(1)} aria-label="Minute up"><ChevronRight size={16} /></button>
            </div>
            <div className="ui-dtp-ampm">
              <button type="button" className={!pm ? 'is-on' : ''} onClick={() => setPm(false)}>AM</button>
              <button type="button" className={pm ? 'is-on' : ''} onClick={() => setPm(true)}>PM</button>
            </div>
          </div>
          <button type="button" className="ui-dtp-done" onClick={() => setOpen(false)}>Done</button>
        </div>,
        document.body,
      )}
    </div>
  )
}
