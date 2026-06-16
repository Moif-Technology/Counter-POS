import { useEffect, useMemo, useRef, useState } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { fmtMoney, roundMoney } from '../../lib/currencyFormat'

function num(v, d = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

export default function MultiPaymentModal({ onClose }) {
  const overlayRef = useRef()

  const netAmount = usePosStore(s => s.netAmount)
  const setPaymentMode = usePosStore(s => s.setPaymentMode)
  const setPayment = usePosStore(s => s.setPayment)
  const setPaymentSplits = usePosStore(s => s.setPaymentSplits)

  const [cash, setCash] = useState(0)
  const [card, setCard] = useState(0)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    // Default: all on card
    setCash(0)
    setCard(num(netAmount, 0))
  }, [netAmount])

  const sum = useMemo(() => roundMoney(num(cash, 0) + num(card, 0)), [cash, card])
  const diff = useMemo(() => roundMoney(sum - num(netAmount, 0)), [sum, netAmount])
  const ok = Math.abs(diff) <= 0.02 && sum > 0

  const apply = () => {
    const c = roundMoney(num(cash, 0))
    const k = roundMoney(num(card, 0))
    const splits = [
      ...(c > 0 ? [{ payMode: 'CASH', amount: c }] : []),
      ...(k > 0 ? [{ payMode: 'CARD', amount: k }] : []),
    ]
    setPaymentMode('MULTI')
    setPaymentSplits(splits.length ? splits : null)
    setPayment(sum)
    onClose?.()
  }

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.4)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 460, maxWidth: '96vw',
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Multi Payment</span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            padding: 10, border: '1.5px solid var(--border)', borderRadius: 12,
            background: 'var(--surface)',
          }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)' }}>Cash</label>
              <input
                value={cash}
                onChange={e => setCash(e.target.value)}
                inputMode="decimal"
                style={{
                  width: '100%', height: 38, marginTop: 4, boxSizing: 'border-box',
                  padding: '0 10px', borderRadius: 9, outline: 'none',
                  border: '1.5px solid var(--border)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14, fontWeight: 700,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)' }}>Card</label>
              <input
                value={card}
                onChange={e => setCard(e.target.value)}
                inputMode="decimal"
                style={{
                  width: '100%', height: 38, marginTop: 4, boxSizing: 'border-box',
                  padding: '0 10px', borderRadius: 9, outline: 'none',
                  border: '1.5px solid var(--border)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14, fontWeight: 700,
                }}
              />
            </div>
          </div>

          <div style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: `1.5px solid ${ok ? 'var(--green-border)' : 'var(--red-border)'}`,
            background: ok ? 'var(--green-bg)' : 'var(--red-bg)',
            color: ok ? 'var(--green)' : 'var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span style={{ fontSize: 12, fontWeight: 800 }}>
                Total {fmtMoney(sum)} / Net {fmtMoney(netAmount)}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>
              Diff {fmtMoney(diff)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={apply}
              disabled={!ok}
              style={{
                flex: 1, height: 38, borderRadius: 10,
                border: 'none',
                background: ok ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--border)',
                color: ok ? '#fff' : 'var(--text-4)',
                fontSize: 12, fontWeight: 800,
                cursor: ok ? 'pointer' : 'not-allowed',
              }}
            >
              Apply
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1, height: 38, borderRadius: 10,
                border: '1.5px solid var(--border)', background: '#fff',
                color: 'var(--text-2)', fontSize: 12, fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

