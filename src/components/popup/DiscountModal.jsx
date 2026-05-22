import { useEffect, useRef, useState } from 'react'
import { X, Percent, XCircle } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

export default function DiscountModal({ onClose }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const item           = cartItems.find(i => i.barcode === selectedRowKey)

  const [discPct, setDiscPct] = useState('')
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null

  const totalAmount  = +(item.qty * item.unitPrice).toFixed(3)
  const pct          = parseFloat(discPct) || 0
  const discountAmt  = +(totalAmount * pct / 100).toFixed(3)
  const netAmount    = +(totalAmount - discountAmt).toFixed(3)

  const handleKey = k => {
    if (k === 'C')  { setDiscPct(''); return }
    if (k === '⌫') { setDiscPct(v => v.slice(0, -1)); return }
    if (k === '.' && discPct.includes('.')) return
    // cap at 100%
    const next = discPct + k
    if (parseFloat(next) > 100) return
    setDiscPct(next)
  }

  const applyPreset = p => setDiscPct(String(p))

  const handleDone = () => {
    if (pct < 0 || pct > 100) return
    const state    = usePosStore.getState()
    const newItems = state.cartItems.map(i => {
      if (i.barcode !== item.barcode) return i
      const vatPer  = i.vatPer || 0
      const base    = i.qty * i.unitPrice
      const discAmt = +(base * pct / 100).toFixed(3)
      const subTotal= +(base - discAmt).toFixed(3)
      const vatAmt  = +(subTotal * (vatPer / 100)).toFixed(3)
      return { ...i, discount: pct, discountAmt: discAmt, lineTotal: +(subTotal + vatAmt).toFixed(3), vatAmt }
    })
    usePosStore.setState({ cartItems: newItems })
    state.recalc(newItems)
    onClose()
  }

  const press   = e => { e.currentTarget.style.transform = 'scale(0.91)' }
  const release = e => { e.currentTarget.style.transform = 'scale(1)' }

  const NumBtn = ({ label, keyVal, flex = 1, style = {}, onClick }) => (
    <button
      onClick={onClick ?? (() => handleKey(keyVal ?? label))}
      onMouseDown={press} onMouseUp={release}
      style={{
        flex, height: 52, borderRadius: 10,
        border: '1.5px solid var(--border)', background: '#fff',
        color: 'var(--text-1)', fontSize: 17, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit', ...style,
      }}
      onMouseEnter={e => { if (!style.background) { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' } else { e.currentTarget.style.filter = 'brightness(0.92)' } }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; if (!style.background) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' } }}
    >
      {label}
    </button>
  )

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.44)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'dc-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes dc-fade  { from{opacity:0} to{opacity:1} }
        @keyframes dc-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @media (max-width: 600px) {
          .dc-body { flex-direction: column !important; }
          .dc-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; padding: 16px !important; }
          .dc-right { width: 100% !important; padding: 12px 16px !important; }
        }
      `}</style>

      <div style={{
        width: 620, maxWidth: '96vw',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 28px 72px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'dc-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
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
              <Percent size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Product</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Discount Entry</p>
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
        <div className="dc-body" style={{ display: 'flex', overflow: 'hidden' }}>

          {/* LEFT — info fields */}
          <div className="dc-left" style={{
            flex: 1, padding: '24px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18,
            borderRight: '1px solid var(--border)',
          }}>

            {/* Product name */}
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--brand-bg)', border: '1.5px solid var(--brand-border)',
              fontSize: 13, fontWeight: 800, color: 'var(--brand)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item.description}
            </div>

            {/* Fields */}
            {[
              { label: 'Total Amount',    value: totalAmount.toFixed(3),   accent: false },
              { label: 'Discount Amount', value: discountAmt.toFixed(3),   accent: false },
              { label: 'Net Amount',      value: netAmount.toFixed(3),     accent: true  },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 130, flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }}>
                  {f.label}
                </span>
                <div style={{
                  flex: 1, height: 38, borderRadius: 8,
                  border: `1.5px solid ${f.accent ? 'var(--brand)' : 'var(--border)'}`,
                  background: f.accent ? 'var(--brand-bg)' : 'var(--surface)',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  fontSize: 15, fontWeight: 800,
                  color: f.accent ? 'var(--brand)' : 'var(--text-1)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {f.value}
                </div>
              </div>
            ))}

            {/* Discount Percent input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 130, flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--amber)', textAlign: 'right' }}>
                Discount %
              </span>
              <div style={{
                flex: 1, height: 42, borderRadius: 8,
                border: `1.5px solid ${discPct ? 'var(--amber-border)' : 'var(--border)'}`,
                background: discPct ? 'var(--amber-bg)' : '#fff',
                display: 'flex', alignItems: 'center', padding: '0 12px',
                fontSize: 18, fontWeight: 900,
                color: discPct ? 'var(--amber)' : 'var(--text-4)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {discPct || <span style={{ fontSize: 13, fontWeight: 500 }}>0.00</span>}
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--amber)' }}>%</span>
            </div>

          </div>

          {/* RIGHT — numpad with presets */}
          <div className="dc-right" style={{ width: 260, flexShrink: 0, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Rows 7-9 / 4-6 / 1-3 with preset % buttons */}
            {[
              { digits: ['7','8','9'], preset: 5  },
              { digits: ['4','5','6'], preset: 10 },
              { digits: ['1','2','3'], preset: 25 },
            ].map(({ digits, preset }) => (
              <div key={preset} style={{ display: 'flex', gap: 6 }}>
                {digits.map(d => <NumBtn key={d} label={d} />)}
                <NumBtn
                  label={`${preset}%`}
                  onClick={() => applyPreset(preset)}
                  style={{
                    background: 'var(--amber-bg)', borderColor: 'var(--amber-border)',
                    color: 'var(--amber)', fontSize: 13, fontWeight: 800,
                  }}
                />
              </div>
            ))}

            {/* 0  .  C  Cancel */}
            <div style={{ display: 'flex', gap: 6 }}>
              <NumBtn label="0" />
              <NumBtn label="." />
              <NumBtn
                label={<XCircle size={18} />}
                onClick={() => setDiscPct('')}
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-3)' }}
              />
              <NumBtn
                label="Cancel"
                onClick={onClose}
                style={{ background: 'var(--red-bg)', borderColor: 'var(--red-border)', color: 'var(--red)', fontSize: 11, fontWeight: 800 }}
              />
            </div>

            {/* Done */}
            <button
              onClick={handleDone}
              onMouseDown={press} onMouseUp={release}
              style={{
                height: 52, borderRadius: 10, border: 'none',
                background: pct > 0
                  ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                  : 'var(--border)',
                color: pct > 0 ? '#fff' : 'var(--text-4)',
                fontSize: 15, fontWeight: 900,
                cursor: pct > 0 ? 'pointer' : 'default',
                boxShadow: pct > 0 ? '0 4px 14px rgba(107,0,0,0.22)' : 'none',
                transition: 'filter 0.12s, transform 0.08s',
              }}
              onMouseEnter={e => { if (pct > 0) e.currentTarget.style.filter = 'brightness(1.08)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
            >
              Done
            </button>

          </div>
        </div>

      </div>
    </div>
  )
}
