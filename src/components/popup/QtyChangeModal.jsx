import { useEffect, useRef, useState } from 'react'
import { X, Hash } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { findCartItemByKey } from '../../lib/cartLine'
import Numpad from '../ui/Numpad'

export default function QtyChangeModal({ onClose }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const item           = findCartItemByKey(cartItems, selectedRowKey)

  const [newQty, setNewQty] = useState('')
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null

  const parsed = parseFloat(newQty) || 0

  const handleKey = k => {
    if (k === 'C')  { setNewQty(''); return }
    if (k === '⌫') { setNewQty(v => v.slice(0, -1)); return }
    if (k === '.' && newQty.includes('.')) return
    setNewQty(v => v + k)
  }

  const handleDone = () => {
    if (!parsed || parsed <= 0) return
    const signed = Number(item.qty) < 0 ? -Math.abs(parsed) : parsed
    updateLine(selectedRowKey, { qty: signed })
    onClose()
  }

  const fieldBox = (value, accent) => ({
    height: 36, borderRadius: 8,
    border: `1.5px solid ${accent ? 'var(--brand)' : 'var(--border)'}`,
    background: accent ? 'var(--brand-bg)' : '#fff',
    display: 'flex', alignItems: 'center', padding: '0 12px',
    fontSize: 15, fontWeight: 700,
    color: accent ? 'var(--text-1)' : 'var(--text-2)',
    fontFamily: "'JetBrains Mono', monospace",
    minWidth: 110,
  })

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.4)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'qc-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes qc-fade  { from{opacity:0} to{opacity:1} }
        @keyframes qc-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      <div style={{
        width: 500, maxWidth: '96vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'qc-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Hash size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>Quantity Change</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                {item.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', overflow: 'hidden' }}>

          {/* Left: fields */}
          <div style={{
            flex: 1, padding: '20px 20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14,
            borderRight: '1px solid var(--border)',
          }}>
            {/* Current Qty */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 90, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
                Current Qty
              </span>
              <div style={fieldBox(item.qty, false)}>{item.qty}</div>
            </div>

            {/* New Qty */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 90, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
                New Qty
              </span>
              <div style={{ ...fieldBox(newQty, true), color: newQty ? 'var(--text-1)' : 'var(--text-4)' }}>
                {newQty || <span style={{ fontWeight: 500, fontSize: 12 }}>Enter qty…</span>}
              </div>
            </div>
          </div>

          {/* Right: numpad */}
          <div style={{ width: 210, flexShrink: 0, padding: '16px 14px' }}>
            <Numpad
              onKey={handleKey}
              showDot={true}
              showClear={true}
              showBackspace={false}
              btnHeight={44}
              fontSize={16}
              gap={6}
              extraRows={[[
                {
                  label: 'Done',
                  flex: 2,
                  style: {
                    background: parsed > 0
                      ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                      : 'var(--border)',
                    color: parsed > 0 ? '#fff' : 'var(--text-4)',
                    border: 'none',
                    fontSize: 13,
                    boxShadow: parsed > 0 ? '0 4px 12px rgba(107,0,0,0.2)' : 'none',
                  },
                  onClick: handleDone,
                },
                {
                  label: 'Cancel',
                  flex: 1,
                  style: {
                    background: 'var(--red-bg)',
                    color: 'var(--red)',
                    borderColor: 'var(--red-border)',
                    fontSize: 13,
                  },
                  onClick: onClose,
                },
              ]]}
            />
          </div>

        </div>

      </div>
    </div>
  )
}
