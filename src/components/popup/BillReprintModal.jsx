import { useEffect, useRef, useState } from 'react'
import { X, Printer, FileText, CalendarDays } from 'lucide-react'
import Calendar from '../ui/Calendar'
import Numpad from '../ui/Numpad'

const today = new Date()
const isoDate = d => d.toISOString().split('T')[0]
const formatDisplay = iso => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d} / ${m} / ${y}`
}

export default function BillReprintModal({ onClose }) {
  const [billNo,      setBillNo]      = useState('')
  const [counterNo,   setCounterNo]   = useState('1')
  const [billDate,    setBillDate]    = useState(isoDate(today))
  const [calOpen,     setCalOpen]     = useState(false)
  const [focus,       setFocus]       = useState('billNo')
  const overlayRef   = useRef()
  const billRef      = useRef()
  const calWrapRef   = useRef()

  useEffect(() => {
    billRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') { if (calOpen) setCalOpen(false); else onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, calOpen])

  useEffect(() => {
    if (!calOpen) return
    const handler = e => {
      if (calWrapRef.current && !calWrapRef.current.contains(e.target)) setCalOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [calOpen])

  const handleKey = k => {
    if (focus !== 'billNo') return
    if (k === 'C' || k === '⌫' && billNo === '') { setBillNo(''); return }
    if (k === '⌫') { setBillNo(v => v.slice(0, -1)); return }
    setBillNo(v => v + k)
  }

  const handlePrint     = () => { onClose() }
  const handleOtherBill = () => { setBillNo(''); setFocus('billNo'); billRef.current?.focus() }

  const fieldStyle = active => ({
    height: 36, borderRadius: 8, width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand-bg)' : 'var(--surface)',
    padding: '0 12px', fontSize: 15, fontWeight: 700,
    color: 'var(--text-1)', fontFamily: "'JetBrains Mono', monospace",
    outline: 'none', cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s',
  })

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.42)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'br-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes br-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes br-slide { from { opacity:0; transform:scale(0.96) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
      `}</style>

      <div style={{
        width: 520, maxWidth: '95vw',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        animation: 'br-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px',
          borderRadius: '24px 24px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Printer size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Receipt</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Bill Reprint</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', gap: 0 }}>

          {/* LEFT — form fields */}
          <div style={{ flex: 1, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, borderRight: '1px solid var(--border)' }}>

            {/* Bill No */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
                Bill No
              </label>
              <input
                ref={billRef}
                value={billNo}
                onChange={e => setBillNo(e.target.value)}
                onFocus={() => setFocus('billNo')}
                placeholder="0"
                style={fieldStyle(focus === 'billNo')}
              />
            </div>

            {/* Counter No */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
                Counter No
              </label>
              <select
                value={counterNo}
                onChange={e => setCounterNo(e.target.value)}
                style={{
                  ...fieldStyle(false),
                  cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  paddingRight: 32,
                }}
              >
                {[1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={String(n)}>Counter {n}</option>
                ))}
              </select>
            </div>

            {/* Bill Date */}
            <div ref={calWrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
                Bill Date
              </label>

              {/* Trigger input */}
              <button
                onClick={() => setCalOpen(o => !o)}
                style={{
                  ...fieldStyle(calOpen),
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: billDate ? 'var(--text-1)' : 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {billDate ? formatDisplay(billDate) : 'DD / MM / YYYY'}
                </span>
                <CalendarDays size={15} color={calOpen ? 'var(--brand)' : 'var(--text-4)'} />
              </button>

              {/* Calendar dropdown — opens upward */}
              {calOpen && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
                  zIndex: 200,
                  boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  <Calendar
                    value={billDate}
                    onChange={d => { setBillDate(d); setCalOpen(false) }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* RIGHT — numpad */}
          <div style={{ width: 188, flexShrink: 0, padding: '20px 14px' }}>
            <Numpad
              onKey={handleKey}
              showDot={false}
              showClear={true}
              showBackspace={true}
              btnHeight={42}
              fontSize={17}
              gap={6}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', gap: 8, padding: '12px 18px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
          borderRadius: '0 0 24px 24px',
        }}>
          {/* Print */}
          <button
            onClick={handlePrint}
            style={{
              flex: 2, height: 40, borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 4px 14px rgba(107,0,0,0.22)',
              transition: 'box-shadow 0.12s, transform 0.08s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,0,0,0.32)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(107,0,0,0.22)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Printer size={14} /> Print
          </button>

          {/* Other Bill */}
          <button
            onClick={handleOtherBill}
            style={{
              flex: 1, height: 40, borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
          >
            <FileText size={13} /> Other Bill
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              flex: 1, height: 40, borderRadius: 10,
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
