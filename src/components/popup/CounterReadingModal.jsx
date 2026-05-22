import { useEffect, useRef, useState } from 'react'
import { X, ClipboardList, Printer, XCircle } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

const DENOMS = [
  { label: '1000', value: 1000  },
  { label: '500',  value: 500   },
  { label: '200',  value: 200   },
  { label: '100',  value: 100   },
  { label: '50',   value: 50    },
  { label: '20',   value: 20    },
  { label: '10',   value: 10    },
  { label: '5',    value: 5     },
  { label: '1',    value: 1     },
  { label: '.50',  value: 0.50  },
  { label: '.25',  value: 0.25  },
  { label: '.10',  value: 0.10  },
]

const initCounts = () => Object.fromEntries(DENOMS.map(d => [d.label, '']))

export default function CounterReadingModal({ onClose }) {
  const storeTotal = usePosStore(s => s.total ?? 0)

  const SUMMARY = [
    { label: 'Total Cash',                  value: (945.735).toFixed(3), accent: false },
    { label: 'Credits Received',            value: (0).toFixed(3),       accent: false },
    { label: 'Refund Amt',                  value: (0).toFixed(3),       accent: false },
    { label: 'Petty Cash',                  value: (0).toFixed(3),       accent: false },
    { label: 'Total Cash IN',               value: '0',                  accent: false },
    { label: 'Total Cash Out',              value: '0',                  accent: false },
    { label: 'Cash To Be Collected',        value: (945.735).toFixed(3), accent: 'blue', large: true },
    { label: 'Credit Amt',                  value: (0).toFixed(3),       accent: false },
    { label: 'Credit Card Amt',             value: (624.61).toFixed(3),  accent: false },
    { label: 'Credit Received - C.Card',    value: (0).toFixed(3),       accent: false },
    { label: 'Voucher Amt',                 value: (0).toFixed(3),       accent: false },
    { label: 'Total Sales',                 value: (1570.345).toFixed(3),accent: 'brand', large: true },
    { label: 'Tax Amount',                  value: (0).toFixed(3),       accent: false },
  ]

  const cashToCollect = 945.735

  const [counts,      setCounts]      = useState(initCounts)
  const [activeDenom, setActiveDenom] = useState('1000')
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const collectedAmount = DENOMS.reduce((sum, d) => {
    return sum + d.value * (parseFloat(counts[d.label]) || 0)
  }, 0)
  const cashDifference = collectedAmount - cashToCollect

  const handleKey = k => {
    if (k === 'C') { setCounts(c => ({ ...c, [activeDenom]: '' })); return }
    if (k === '⌫') { setCounts(c => ({ ...c, [activeDenom]: c[activeDenom].slice(0, -1) })); return }
    if (k === '.') return
    setCounts(c => ({ ...c, [activeDenom]: c[activeDenom] + k }))
  }

  const press   = e => { e.currentTarget.style.transform = 'scale(0.91)' }
  const release = e => { e.currentTarget.style.transform = 'scale(1)' }

  const NumBtn = ({ label, keyVal, flex = 1, style = {}, onClick }) => (
    <button
      onClick={onClick ?? (() => handleKey(keyVal ?? label))}
      onMouseDown={press} onMouseUp={release}
      style={{
        flex, height: 50, borderRadius: 10,
        border: '1.5px solid var(--border)', background: '#fff',
        color: 'var(--text-1)', fontSize: 18, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        ...style,
      }}
      onMouseEnter={e => {
        if (style.background) { e.currentTarget.style.filter = 'brightness(0.92)'; return }
        e.currentTarget.style.background  = 'var(--brand-bg)'
        e.currentTarget.style.borderColor = 'var(--brand-border)'
        e.currentTarget.style.color       = 'var(--brand)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = 'brightness(1)'
        if (!style.background) {
          e.currentTarget.style.background  = '#fff'
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color       = 'var(--text-1)'
        }
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,8,6,0.5)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'cr-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes cr-fade  { from{opacity:0} to{opacity:1} }
        @keyframes cr-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .denom-row:hover { background: var(--brand-bg) !important; }
        @media (max-width: 900px) {
          .cr-left { width: 200px !important; }
          .cr-right { width: 200px !important; }
        }
        @media (max-width: 768px) {
          .cr-left { display: none !important; }
          .cr-right { width: 220px !important; }
        }
        @media (max-width: 640px) {
          .cr-body { flex-direction: column !important; overflow-y: auto !important; }
          .cr-mid { border-right: none !important; min-height: 260px; }
          .cr-right { width: 100% !important; border-top: 1px solid var(--border) !important; max-height: 300px; overflow-y: auto; }
          .cr-footer { flex-wrap: wrap !important; }
          .cr-footer button { flex: 1 1 40% !important; }
        }
      `}</style>

      <div style={{
        width: 1080, maxWidth: '99vw', maxHeight: '95vh',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column',
        animation: 'cr-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ClipboardList size={17} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Reports</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Counter Reading</p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}><X size={14} /></button>
        </div>

        {/* ── Body ── */}
        <div className="cr-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT: summary ── */}
          <div className="cr-left" style={{
            width: 280, flexShrink: 0, borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SUMMARY.map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: row.large ? '8px 10px' : '5px 10px',
                  borderRadius: 8,
                  background: row.accent === 'brand'
                    ? 'var(--brand-bg)'
                    : row.accent === 'blue'
                    ? 'rgba(59,130,246,0.08)'
                    : 'transparent',
                  border: row.accent === 'brand'
                    ? '1px solid var(--brand-border)'
                    : row.accent === 'blue'
                    ? '1px solid rgba(59,130,246,0.2)'
                    : '1px solid transparent',
                  marginBlock: row.large ? 4 : 0,
                }}>
                  <span style={{
                    fontSize: row.large ? 11 : 10, fontWeight: 700,
                    color: row.accent === 'brand' ? 'var(--brand)' : row.accent === 'blue' ? '#2563eb' : 'var(--text-2)',
                  }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontSize: row.large ? 14 : 12, fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: row.accent === 'brand' ? 'var(--brand)' : row.accent === 'blue' ? '#2563eb' : 'var(--text-1)',
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {/* Bill counts */}
              <div style={{ marginTop: 8, padding: '10px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bill Count Summary</p>
                {[
                  ['Bill Count', '206'],
                  ['Cash Bill', '127'],
                  ['Credit Bill', '0'],
                  ['Credit Card Bill', '79'],
                  ['Multi Payment', '0'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{l}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-1)', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MIDDLE: denomination entry ── */}
          <div className="cr-mid" style={{ flex: 1, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* heading */}
            <div style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 100px',
              padding: '8px 16px', background: 'var(--brand-bg)',
              borderBottom: '1px solid rgba(0,0,0,0.1)', flexShrink: 0,
            }}>
              {['Denom', 'Count', 'Amount'].map((h, i) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: i === 2 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {DENOMS.map((d, i) => {
                const isActive = activeDenom === d.label
                const cnt      = parseFloat(counts[d.label]) || 0
                const amt      = (d.value * cnt).toFixed(3)
                return (
                  <div
                    key={d.label}
                    className="denom-row"
                    onClick={() => setActiveDenom(d.label)}
                    style={{
                      display: 'grid', gridTemplateColumns: '80px 1fr 100px',
                      padding: '8px 16px', alignItems: 'center',
                      borderBottom: i < DENOMS.length - 1 ? '1px solid var(--border)' : 'none',
                      borderLeft: `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
                      background: isActive ? 'rgba(107,0,0,0.06)' : '#fff',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 800, color: isActive ? 'var(--brand)' : 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {d.label} ×
                    </span>
                    <div style={{
                      height: 34, borderRadius: 7, marginRight: 12,
                      border: `1.5px solid ${isActive ? 'var(--brand)' : 'var(--border)'}`,
                      background: isActive ? 'var(--brand-bg)' : 'var(--surface)',
                      display: 'flex', alignItems: 'center', padding: '0 10px',
                      fontSize: 14, fontWeight: 700,
                      color: counts[d.label] ? 'var(--text-1)' : 'var(--text-4)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {counts[d.label] || '0'}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cnt > 0 ? 'var(--green)' : 'var(--text-4)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                      {cnt > 0 ? amt : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT: totals + numpad ── */}
          <div className="cr-right" style={{ width: 240, flexShrink: 0, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Collected Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={labelSt}>Collected Amount</span>
              <div style={{
                height: 46, borderRadius: 9,
                border: `1.5px solid ${collectedAmount > 0 ? 'var(--green-border)' : 'var(--border)'}`,
                background: collectedAmount > 0 ? 'var(--green-bg)' : 'var(--surface)',
                display: 'flex', alignItems: 'center', padding: '0 12px',
                fontSize: 18, fontWeight: 900,
                color: collectedAmount > 0 ? 'var(--green)' : 'var(--text-4)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {collectedAmount > 0 ? collectedAmount.toFixed(3) : '0.000'}
              </div>
            </div>

            {/* Cash Difference */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={labelSt}>Cash Difference</span>
              <div style={{
                height: 46, borderRadius: 9,
                border: `1.5px solid ${cashDifference >= 0 ? 'var(--blue-border)' : 'var(--red-border)'}`,
                background: cashDifference >= 0 ? 'rgba(59,130,246,0.07)' : 'var(--red-bg)',
                display: 'flex', alignItems: 'center', padding: '0 12px',
                fontSize: 18, fontWeight: 900,
                color: cashDifference >= 0 ? '#2563eb' : 'var(--red)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {cashDifference >= 0 ? '+' : ''}{cashDifference.toFixed(3)}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Numpad */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['7','8','9'], ['4','5','6'], ['1','2','3']].map(row => (
                <div key={row[0]} style={{ display: 'flex', gap: 6 }}>
                  {row.map(d => <NumBtn key={d} label={d} />)}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6 }}>
                <NumBtn label="0" />
                <NumBtn label="." />
                <NumBtn
                  label={<XCircle size={18} />}
                  onClick={() => handleKey('C')}
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-3)' }}
                />
              </div>
              {/* Enter — move to next denom */}
              <button
                onClick={() => {
                  const idx = DENOMS.findIndex(d => d.label === activeDenom)
                  if (idx < DENOMS.length - 1) setActiveDenom(DENOMS[idx + 1].label)
                }}
                onMouseDown={press} onMouseUp={release}
                style={{
                  height: 50, borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
                  color: '#fff', fontSize: 15, fontWeight: 800,
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(107,0,0,0.2)',
                  transition: 'filter 0.1s, transform 0.07s',
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
              >
                Enter ↓
              </button>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="cr-footer" style={{
          display: 'flex', gap: 8, padding: '12px 18px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
        }}>
          {[
            { label: 'X-Report',      color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
            { label: 'Z-Report',      color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
            { label: 'Re-Print Last', color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
            { label: 'Re-Print Other',color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
          ].map(btn => (
            <button
              key={btn.label}
              style={{
                flex: 1, height: 40, borderRadius: 10,
                border: `1.5px solid ${btn.border}`,
                background: btn.bg, color: btn.color,
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.93)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <Printer size={13} /> {btn.label}
            </button>
          ))}
          <button
            onClick={onClose}
            style={{
              height: 40, paddingInline: 20, borderRadius: 10,
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}

const closeBtn = {
  width: 32, height: 32, borderRadius: 9,
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
}

const labelSt = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
  letterSpacing: 0.7, textTransform: 'uppercase',
}
