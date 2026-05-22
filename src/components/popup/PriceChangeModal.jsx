import { useEffect, useRef, useState } from 'react'
import { X, Tag, Delete } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

const fmt4 = n => Number(n).toFixed(4)
const fmt2 = n => Number(n).toFixed(2)
const NUM_KEYS = [['7','8','9'],['4','5','6'],['1','2','3']]

export default function PriceChangeModal({ onClose }) {
  const cartItems = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const item = cartItems.find(i => i.barcode === selectedRowKey)

  const [newPrice, setNewPrice] = useState('')
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null

  const currentPrice  = item.unitPrice || 0
  const vatPer        = item.vatPer || 0
  const parsedNew     = parseFloat(newPrice) || 0
  const vatAmount     = parsedNew * (vatPer / 100)
  const priceWithVat  = parsedNew + vatAmount

  const pressKey = k => {
    if (k === 'C')  { setNewPrice(''); return }
    if (k === '⌫') { setNewPrice(v => v.slice(0, -1)); return }
    if (k === '.' && newPrice.includes('.')) return
    setNewPrice(v => v + k)
  }

  const handleDone = () => {
    if (!parsedNew || parsedNew <= 0) return
    const state    = usePosStore.getState()
    const newItems = state.cartItems.map(i => {
      if (i.barcode !== item.barcode) return i
      const qty      = i.qty
      const subTotal = qty * parsedNew
      const vat      = subTotal * (vatPer / 100)
      return { ...i, unitPrice: parsedNew, lineTotal: +(subTotal + vat).toFixed(3), vatAmt: +vat.toFixed(3) }
    })
    usePosStore.setState({ cartItems: newItems })
    state.recalc(newItems)
    onClose()
  }

  const numBtn = (label, onClick, style = {}) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        flex: 1, height: 46, borderRadius: 8,
        border: '1.5px solid var(--border)', background: '#fff',
        fontSize: 15, fontWeight: 700, color: 'var(--text-1)',
        cursor: 'pointer', transition: 'all 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...style,
      }}
      onMouseEnter={e => {
        if (style.background) { e.currentTarget.style.filter = 'brightness(0.93)'; return }
        e.currentTarget.style.background  = 'var(--brand-bg)'
        e.currentTarget.style.borderColor = 'var(--brand-border)'
        e.currentTarget.style.color       = 'var(--brand)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter     = 'brightness(1)'
        e.currentTarget.style.background = style.background || '#fff'
        e.currentTarget.style.borderColor= style.borderColor || 'var(--border)'
        e.currentTarget.style.color      = style.color || 'var(--text-1)'
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {label === '⌫' ? <Delete size={15} /> : label}
    </button>
  )

  const fieldRow = (label, value, accent) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
      <span style={{
        width: 110, flexShrink: 0, textAlign: 'right',
        fontSize: 11, fontWeight: 700,
        color: accent ? 'var(--brand)' : 'var(--text-2)',
      }}>{label}</span>
      <div style={{
        flex: 1, height: 34, borderRadius: 7,
        border: `1.5px solid ${accent ? 'var(--brand-border)' : 'var(--border)'}`,
        background: accent ? 'var(--brand-bg)' : '#fff',
        display: 'flex', alignItems: 'center', padding: '0 10px',
        fontSize: 13, fontWeight: 700,
        color: accent ? 'var(--brand)' : 'var(--text-1)',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {value}
      </div>
    </div>
  )

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.4)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pc-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes pc-fade  { from{opacity:0} to{opacity:1} }
        @keyframes pc-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      <div style={{
        width: 560, maxWidth: '96vw',
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'pc-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
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
              <Tag size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>Price Change</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{item.description}</p>
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
          <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 2, borderRight: '1px solid var(--border)' }}>

            {fieldRow('BarCode', item.barcode)}

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

            {fieldRow('Current Price', fmt4(currentPrice))}

            {/* New Price — active editable */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
              <span style={{ width: 110, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>New Price</span>
              <div style={{
                flex: 1, height: 34, borderRadius: 7,
                border: '1.5px solid var(--brand)',
                background: 'var(--brand-bg)',
                display: 'flex', alignItems: 'center', padding: '0 10px',
                fontSize: 14, fontWeight: 800,
                color: 'var(--text-1)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {newPrice || <span style={{ color: 'var(--text-4)', fontWeight: 500, fontSize: 12 }}>Enter new price…</span>}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

            {/* VAT % and VAT Amount side by side */}
            <div style={{ display: 'flex', gap: 10, padding: '6px 0', marginLeft: 122 }}>
              {[
                { label: 'VAT %',      value: vatPer },
                { label: 'VAT Amount', value: fmt2(vatAmount) },
              ].map(f => (
                <div key={f.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{f.label}</span>
                  <div style={{
                    height: 34, borderRadius: 7,
                    border: '1px solid var(--border)', background: 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--text-1)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{f.value}</div>
                </div>
              ))}
            </div>

            {/* Price with VAT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
              <span style={{ width: 110, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--brand)' }}>Price With VAT</span>
              <div style={{
                flex: 1, height: 36, borderRadius: 7,
                border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
                display: 'flex', alignItems: 'center', padding: '0 12px',
                fontSize: 16, fontWeight: 900,
                color: 'var(--brand)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>{fmt2(priceWithVat)}</div>
            </div>

          </div>

          {/* Right: numpad */}
          <div style={{ width: 220, padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>

            {NUM_KEYS.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 6 }}>
                {row.map(k => numBtn(k, () => pressKey(k)))}
              </div>
            ))}

            {/* 0 . C */}
            <div style={{ display: 'flex', gap: 6 }}>
              {numBtn('0', () => pressKey('0'))}
              {numBtn('.', () => pressKey('.'))}
              {numBtn('C', () => pressKey('C'), {
                background: 'var(--red-bg)', borderColor: 'var(--red-border)', color: 'var(--red)', fontSize: 12,
              })}
            </div>

            {/* Done / Cancel */}
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <button
                onClick={handleDone}
                disabled={!parsedNew || parsedNew <= 0}
                style={{
                  flex: 1, height: 46, borderRadius: 8, border: 'none',
                  background: parsedNew > 0 ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--border)',
                  color: parsedNew > 0 ? '#fff' : 'var(--text-4)',
                  fontSize: 13, fontWeight: 800,
                  cursor: parsedNew > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.1s',
                  boxShadow: parsedNew > 0 ? '0 4px 12px rgba(107,0,0,0.22)' : 'none',
                }}
                onMouseEnter={e => { if (parsedNew > 0) e.currentTarget.style.filter = 'brightness(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
                onMouseDown={e => { if (parsedNew > 0) e.currentTarget.style.transform = 'scale(0.97)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >Done</button>
              <button
                onClick={onClose}
                style={{
                  flex: 1, height: 46, borderRadius: 8,
                  border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                  color: 'var(--red)', fontSize: 13, fontWeight: 800,
                  cursor: 'pointer', transition: 'filter 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.93)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >Cancel</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
