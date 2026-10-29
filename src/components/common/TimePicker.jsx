import { ChevronUp, ChevronDown } from 'lucide-react'

/*
 * TimePicker — touch-friendly hour/minute picker (12-hour display, AM/PM).
 *
 *   <TimePicker value="14:30" onChange={v => setTime(v)} />
 *
 * Props:
 *   value      — 'HH:mm' (24-hour). Empty → current time.
 *   onChange   — (value: 'HH:mm') => void
 *   minuteStep — minutes per up/down tap (default 1)
 */
export default function TimePicker({ value, onChange, minuteStep = 1 }) {
  const [h24, m] = parseTime(value)
  const isPm = h24 >= 12
  const h12 = h24 % 12 || 12

  const emit = (h, min) => onChange?.(`${pad((h + 24) % 24)}:${pad((min + 60) % 60)}`)
  const stepHour   = d => emit(h24 + d, m)
  const stepMinute = d => {
    const next = m + d * minuteStep
    // Roll into the next/previous hour when minutes wrap.
    emit(h24 + Math.floor(next / 60), next)
  }
  const setPeriod = pm => { if (pm !== isPm) emit(h24 + (pm ? 12 : -12), m) }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: 12, borderRadius: 14,
      background: '#fff', border: '1px solid var(--border)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      userSelect: 'none',
    }}>
      <Spinner value={pad(h12)} onUp={() => stepHour(1)} onDown={() => stepHour(-1)} label="Hour" />
      <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-3)' }}>:</span>
      <Spinner value={pad(m)} onUp={() => stepMinute(1)} onDown={() => stepMinute(-1)} label="Minute" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 4 }}>
        {['AM', 'PM'].map(p => {
          const active = (p === 'PM') === isPm
          return (
            <button
              key={p}
              onClick={() => setPeriod(p === 'PM')}
              style={{
                width: 52, height: 34, borderRadius: 8,
                border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                background: active ? 'var(--brand)' : '#fff',
                color: active ? '#fff' : 'var(--text-2)',
                fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {p}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Spinner({ value, onUp, onDown, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <StepBtn onClick={onUp} aria-label={`${label} up`}><ChevronUp size={18} /></StepBtn>
      <div style={{
        width: 60, height: 48, borderRadius: 10,
        background: 'var(--brand-bg)', border: '1.5px solid var(--brand-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 800, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <StepBtn onClick={onDown} aria-label={`${label} down`}><ChevronDown size={18} /></StepBtn>
    </div>
  )
}

function StepBtn({ children, ...props }) {
  return (
    <button
      {...props}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      style={{
        width: 60, height: 32, borderRadius: 8,
        border: '1.5px solid var(--border)', background: 'var(--surface-2)',
        color: 'var(--text-2)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.07s',
      }}
    >
      {children}
    </button>
  )
}

const pad = n => String(n).padStart(2, '0')

function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '')
  if (match) return [Number(match[1]) % 24, Number(match[2]) % 60]
  const now = new Date()
  return [now.getHours(), now.getMinutes()]
}
