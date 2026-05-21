import { useEffect, useRef, useState } from 'react'
import { X, Minus, Plus, Trash2, Save, Edit3, Percent, RotateCcw } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { fmt3 } from '../../lib/utils'

export default function ItemDetailModal({ item, onClose }) {
  const removeItem     = usePosStore(s => s.removeItem)
  const [qty, setQty]  = useState(item.qty)
  const overlayRef     = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const changeQty = delta => setQty(q => Math.max(1, +(q + delta).toFixed(3)))

  const subTotal  = qty * item.unitPrice
  const vatAmt    = subTotal * ((item.vatPer || 0) / 100)
  const lineTotal = subTotal + vatAmt

  const handleSave = () => {
    const state    = usePosStore.getState()
    const newItems = state.cartItems.map(i =>
      i.barcode === item.barcode
        ? { ...i, qty, lineTotal: +lineTotal.toFixed(3), vatAmt: +vatAmt.toFixed(3) }
        : i
    )
    usePosStore.setState({ cartItems: newItems })
    state.recalc(newItems)
    onClose()
  }

  const handleRemove = () => { removeItem(item.barcode); onClose() }

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'mi-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes mi-fade   { from { opacity:0 } to { opacity:1 } }
        @keyframes mi-slide  { from { opacity:0; transform:scale(0.96) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
      `}</style>

      <div style={{
        width: 440, maxWidth: '92vw',
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        animation: 'mi-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '18px 18px 16px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>
              {item.barcode}
            </p>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.description}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'Unit Price', value: fmt3(item.unitPrice) },
            { label: 'VAT %',      value: (item.vatPer || 0) + '%' },
            { label: 'Sub Total',  value: fmt3(subTotal) },
            { label: 'Total',      value: fmt3(lineTotal), accent: true },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center',
              padding: '8px 6px', borderRadius: 8,
              border: `1px solid ${s.accent ? 'var(--blue-border, #c3d9f0)' : 'var(--border)'}`,
              background: s.accent ? 'var(--blue-bg, #f0f6fd)' : 'var(--surface-2)',
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: s.accent ? 'var(--blue)' : 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 4 }}>
                {s.label}
              </p>
              <p style={{
                fontSize: 14, fontWeight: 800,
                color: s.accent ? 'var(--blue)' : 'var(--text-1)',
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: 'tabular-nums',
              }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Qty stepper ── */}
        <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>Quantity</p>
            <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>Tap − / + or type</p>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden',
            background: 'var(--surface-2)',
          }}>
            <button
              onClick={() => changeQty(-1)}
              style={{
                width: 44, height: 44, border: 'none', borderRight: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background 0.1s, color 0.1s', fontSize: 18,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              value={qty}
              onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setQty(+v.toFixed(3)) }}
              min="0.001"
              style={{
                width: 68, height: 44, border: 'none', background: '#fff',
                textAlign: 'center', fontSize: 20, fontWeight: 800,
                color: 'var(--text-1)', outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            <button
              onClick={() => changeQty(1)}
              style={{
                width: 44, height: 44, border: 'none', borderLeft: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-bg)'; e.currentTarget.style.color = 'var(--green)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 18px' }}>
          {[
            { icon: Edit3,    label: 'Price Change', color: 'var(--amber)', bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
            { icon: Percent,  label: 'Discount',     color: 'var(--blue)',  bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
            { icon: RotateCcw,label: 'Return',       color: 'var(--purple)',bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
            { icon: Trash2,   label: 'Remove',       color: 'var(--red)',   bg: 'var(--red-bg)',    border: 'var(--red-border)',   onClick: handleRemove },
          ].map(({ icon: Icon, label, color, bg, border, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                flex: 1, padding: '10px 4px', borderRadius: 10,
                border: `1.5px solid ${border}`, background: bg,
                color, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                transition: 'filter 0.1s, transform 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.94)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', gap: 8, padding: '14px 20px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, height: 42, borderRadius: 10,
              border: '1.5px solid var(--border)', background: '#fff',
              color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, height: 42, borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 4px 14px rgba(107,0,0,0.25)',
              transition: 'box-shadow 0.12s, transform 0.08s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,0,0,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(107,0,0,0.25)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Save size={14} /> Save Changes
          </button>
        </div>

      </div>
    </div>
  )
}
