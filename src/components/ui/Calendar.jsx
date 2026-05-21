import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS    = ['Su','Mo','Tu','We','Th','Fr','Sa']
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
const firstDay    = (y, m) => new Date(y, m, 1).getDay()
const isoDate     = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

export default function Calendar({ value, onChange }) {
  const base   = value ? new Date(value) : new Date()
  const [viewY, setViewY] = useState(base.getFullYear())
  const [viewM, setViewM] = useState(base.getMonth())
  const [mode,  setMode]  = useState('day') // 'day' | 'month' | 'year'
  const [yearPage, setYearPage] = useState(Math.floor(base.getFullYear() / 12) * 12)

  const todayStr = isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const prev = () => {
    if (mode === 'year')  { setYearPage(y => y - 12); return }
    if (mode === 'month') { setViewY(y => y - 1); return }
    viewM === 0 ? (setViewY(y => y - 1), setViewM(11)) : setViewM(m => m - 1)
  }
  const next = () => {
    if (mode === 'year')  { setYearPage(y => y + 12); return }
    if (mode === 'month') { setViewY(y => y + 1); return }
    viewM === 11 ? (setViewY(y => y + 1), setViewM(0)) : setViewM(m => m + 1)
  }

  const blanks = firstDay(viewY, viewM)
  const cells  = [...Array(blanks).fill(null), ...Array(daysInMonth(viewY, viewM)).fill(0).map((_,i) => i+1)]
  const years  = Array.from({ length: 12 }, (_, i) => yearPage + i)

  const headerLabel =
    mode === 'year'  ? `${yearPage} – ${yearPage + 11}` :
    mode === 'month' ? `${viewY}` :
    `${MONTHS_FULL[viewM]} ${viewY}`

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', width: '100%',
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <button onClick={prev} style={navBtn}><ChevronLeft size={13} /></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Month button */}
          <button
            onClick={() => setMode(m => m === 'month' ? 'day' : 'month')}
            style={{
              fontSize: 12, fontWeight: 700,
              color: mode === 'month' ? 'var(--brand)' : 'var(--text-1)',
              background: mode === 'month' ? 'var(--brand-bg)' : 'transparent',
              border: mode === 'month' ? '1px solid var(--brand-border)' : '1px solid transparent',
              borderRadius: 5, padding: '2px 6px', cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >{MONTHS[viewM]}</button>

          {/* Year button */}
          <button
            onClick={() => setMode(m => m === 'year' ? 'day' : 'year')}
            style={{
              fontSize: 12, fontWeight: 700,
              color: mode === 'year' ? 'var(--brand)' : 'var(--text-1)',
              background: mode === 'year' ? 'var(--brand-bg)' : 'transparent',
              border: mode === 'year' ? '1px solid var(--brand-border)' : '1px solid transparent',
              borderRadius: 5, padding: '2px 6px', cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >{viewY}</button>
        </div>

        <button onClick={next} style={navBtn}><ChevronRight size={13} /></button>
      </div>

      {/* ── Month picker ── */}
      {mode === 'month' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, padding: '10px' }}>
          {MONTHS.map((m, i) => {
            const isActive = i === viewM
            return (
              <button
                key={m}
                onClick={() => { setViewM(i); setMode('day') }}
                style={{
                  height: 32, borderRadius: 7, fontSize: 11, fontWeight: isActive ? 700 : 500,
                  border: isActive ? '1.5px solid var(--brand)' : '1px solid var(--border)',
                  background: isActive ? 'var(--brand)' : 'var(--surface)',
                  color: isActive ? '#fff' : 'var(--text-1)',
                  cursor: 'pointer', transition: 'all 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface)' }}
              >{m}</button>
            )
          })}
        </div>
      )}

      {/* ── Year picker ── */}
      {mode === 'year' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, padding: '10px' }}>
          {years.map(y => {
            const isActive = y === viewY
            return (
              <button
                key={y}
                onClick={() => { setViewY(y); setMode('day') }}
                style={{
                  height: 30, borderRadius: 7, fontSize: 11, fontWeight: isActive ? 700 : 500,
                  border: isActive ? '1.5px solid var(--brand)' : '1px solid var(--border)',
                  background: isActive ? 'var(--brand)' : 'var(--surface)',
                  color: isActive ? '#fff' : 'var(--text-1)',
                  cursor: 'pointer', transition: 'all 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface)' }}
              >{y}</button>
            )
          })}
        </div>
      )}

      {/* ── Day grid ── */}
      {mode === 'day' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '4px 0', fontSize: 9, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, padding: '6px' }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`b-${i}`} />
              const ds      = isoDate(viewY, viewM, d)
              const isSel   = ds === value
              const isToday = ds === todayStr
              const isSun   = (blanks + d - 1) % 7 === 0
              return (
                <button
                  key={d}
                  onClick={() => onChange?.(ds)}
                  style={{
                    height: 28, borderRadius: 6, border: 'none',
                    background: isSel ? 'var(--brand)' : isToday ? 'var(--brand-bg)' : 'transparent',
                    color: isSel ? '#fff' : isSun ? 'var(--red)' : isToday ? 'var(--brand)' : 'var(--text-1)',
                    fontSize: 11, fontWeight: isSel || isToday ? 700 : 400,
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isToday ? 'var(--brand-bg)' : 'transparent' }}
                >{d}</button>
              )
            })}
          </div>

          <div style={{ padding: '2px 6px 6px', textAlign: 'center' }}>
            <button
              onClick={() => { const n = new Date(); setViewY(n.getFullYear()); setViewM(n.getMonth()); onChange?.(todayStr) }}
              style={{ fontSize: 10, fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px' }}
            >Today</button>
          </div>
        </>
      )}
    </div>
  )
}

const navBtn = {
  width: 24, height: 24, borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--text-2)',
}
