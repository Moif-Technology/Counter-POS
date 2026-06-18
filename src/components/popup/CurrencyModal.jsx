import { useEffect, useRef, useState } from 'react'
import { X, Coins } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import Numpad from '../ui/Numpad'
import { fmtMoney } from '../../lib/currencyFormat'

const CURRENCIES = [
  { sl: 1, name: 'DIRHAM',       rate: 1 },
  { sl: 2, name: 'SAUDI RIYAL',  rate: 1 },
  { sl: 3, name: 'QATAR RIYAL',  rate: 1 },
  { sl: 4, name: 'US DOLLAR',    rate: 4 },
  { sl: 5, name: 'EURO',         rate: 5 },
  { sl: 6, name: 'OMAN RIYAL',   rate: 9 },
]

export default function CurrencyModal({ onClose }) {
  const billTotal  = usePosStore(s => s.total ?? 0)
  const [selected,   setSelected]   = useState(CURRENCIES[0])
  const [paidAmount, setPaidAmount] = useState('')
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleKey = k => {
    if (k === 'C')  { setPaidAmount(''); return }
    if (k === '⌫') { setPaidAmount(v => v.slice(0, -1)); return }
    if (k === '.' && paidAmount.includes('.')) return
    setPaidAmount(v => v + k)
  }

  const convertedBill = fmtMoney(billTotal * selected.rate)
  const paid          = parseFloat(paidAmount) || 0
  const balance       = fmtMoney(paid - parseFloat(convertedBill))
  const hasBalance    = paid > 0

  const handleEnter = () => {
    if (!paid) return
    onClose()
  }

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.44)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'cu-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes cu-fade  { from{opacity:0} to{opacity:1} }
        @keyframes cu-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .cu-row:hover { background: var(--brand-bg) !important; cursor: pointer; }
        @media (max-width: 640px) {
          .cu-body { flex-direction: column !important; }
          .cu-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; max-height: 220px; }
          .cu-right { width: 100% !important; border-top: none !important; padding: 12px !important; }
        }
      `}</style>

      <div style={{
        width: 780, maxWidth: '97vw', maxHeight: '92vh',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 28px 72px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'cu-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Coins size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Exchange</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Currency Selection</p>
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
        <div className="cu-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* LEFT — currency table */}
          <div className="cu-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>

            {/* Table heading */}
            <div style={{
              display: 'grid', gridTemplateColumns: '48px 1fr 80px',
              padding: '10px 16px',
              background: 'var(--brand-bg)', borderBottom: '1px solid rgba(0,0,0,0.12)',
              flexShrink: 0,
            }}>
              {['SL #', 'Currency Name', 'Rate'].map((h, i) => (
                <span key={h} style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--brand)',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  textAlign: i === 2 ? 'right' : 'left',
                }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {CURRENCIES.map((cur, i) => {
                const isSelected = selected.sl === cur.sl
                return (
                  <div
                    key={cur.sl}
                    className="cu-row"
                    onClick={() => { setSelected(cur); setPaidAmount('') }}
                    style={{
                      display: 'grid', gridTemplateColumns: '48px 1fr 80px',
                      padding: '11px 16px', alignItems: 'center',
                      borderBottom: i < CURRENCIES.length - 1 ? '1px solid var(--border)' : 'none',
                      borderLeft: `3px solid ${isSelected ? 'var(--brand)' : 'transparent'}`,
                      background: isSelected ? 'rgba(107,0,0,0.07)' : '#fff',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--brand)' : 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {cur.sl}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--brand)' : 'var(--text-1)' }}>
                      {cur.name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--brand)' : 'var(--text-2)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                      {cur.rate}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT — fields + numpad */}
          <div className="cu-right" style={{ width: 260, flexShrink: 0, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Selected currency badge */}
            <div style={{
              height: 40, borderRadius: 10,
              background: 'var(--brand-bg)', border: '1.5px solid var(--brand-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, color: 'var(--brand)', letterSpacing: 0.5,
            }}>
              {selected.name}
            </div>

            {/* Bill Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={labelStyle}>Bill Amount</span>
              <div style={{ ...fieldBox, background: 'var(--surface)', color: 'var(--text-2)', border: '1.5px solid var(--border)' }}>
                {convertedBill}
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', marginLeft: 4 }}>{selected.name.split(' ')[0]}</span>
              </div>
            </div>

            {/* Paid Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={labelStyle}>Paid Amount</span>
              <div style={{
                ...fieldBox,
                border: `1.5px solid ${paidAmount ? 'var(--brand)' : 'var(--border)'}`,
                background: paidAmount ? 'var(--brand-bg)' : '#fff',
                color: paidAmount ? 'var(--brand)' : 'var(--text-4)',
                fontSize: paidAmount ? 18 : 13,
              }}>
                {paidAmount || <span style={{ fontSize: 12, fontWeight: 500 }}>Enter amount…</span>}
              </div>
            </div>

            {/* Balance */}
            {hasBalance && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>Balance</span>
                <div style={{
                  ...fieldBox,
                  border: `1.5px solid ${parseFloat(balance) >= 0 ? 'var(--green-border)' : 'var(--red-border)'}`,
                  background: parseFloat(balance) >= 0 ? 'var(--green-bg)' : 'var(--red-bg)',
                  color: parseFloat(balance) >= 0 ? 'var(--green)' : 'var(--red)',
                }}>
                  {balance}
                </div>
              </div>
            )}

            {/* Numpad */}
            <div style={{ flex: 1 }}>
              <Numpad
                onKey={handleKey}
                showDot={true}
                showClear={true}
                showBackspace={false}
                btnHeight={40}
                fontSize={15}
                gap={5}
                extraRows={[[{
                  label: 'Enter',
                  flex: 1,
                  style: {
                    background: paid > 0
                      ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                      : 'var(--border)',
                    color: paid > 0 ? '#fff' : 'var(--text-4)',
                    border: 'none', fontSize: 13, fontWeight: 800,
                    boxShadow: paid > 0 ? '0 4px 12px rgba(107,0,0,0.2)' : 'none',
                  },
                  onClick: handleEnter,
                }]]}
              />
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '10px 16px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              height: 38, paddingInline: 28, borderRadius: 10,
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
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

const labelStyle = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
  letterSpacing: 0.7, textTransform: 'uppercase',
}

const fieldBox = {
  height: 42, borderRadius: 9,
  display: 'flex', alignItems: 'center', padding: '0 12px',
  fontSize: 18, fontWeight: 800,
  fontFamily: "'JetBrains Mono', monospace",
  transition: 'border-color 0.14s, background 0.14s',
}
