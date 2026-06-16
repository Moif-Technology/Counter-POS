import { useEffect, useRef, useState } from 'react'
import { X, Tag, Delete } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import {
  calcLineTotals,
  findCartItemByKey,
  resolveUnitPriceGross,
  resolveUnitPricesFromInput,
  unitPricePatchFromInput,
} from '../../lib/cartLine'
import { fmtMoney } from '../../lib/currencyFormat'
import { getGvTax } from '../../lib/gvtax'

const NUM_KEYS = [['7','8','9'],['4','5','6'],['1','2','3']]

export default function PriceChangeModal({ onClose }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const item           = findCartItemByKey(cartItems, selectedRowKey)

  const [editMode, setEditMode] = useState('net')
  const [newPrice, setNewPrice] = useState('')
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null

  const vatPer = Number(item.vatPer) || getGvTax()
  const parsedInput = parseFloat(newPrice) || 0

  const currentGross = resolveUnitPriceGross(item)
  const currentNet = vatPer > 0
    ? fmtMoney(currentGross / (1 + vatPer / 100))
    : fmtMoney(currentGross)
  const currentLine = calcLineTotals(item)

  const preview = parsedInput > 0
    ? resolveUnitPricesFromInput(editMode, parsedInput, vatPer)
    : null

  const previewLine = preview
    ? calcLineTotals({
      ...item,
      unitPrice: preview.unitPrice,
      unitPriceGross: preview.unitPriceGross,
      vatPer,
    })
    : null

  const pressKey = k => {
    if (k === 'C')  { setNewPrice(''); return }
    if (k === '⌫') { setNewPrice(v => v.slice(0, -1)); return }
    if (k === '.' && newPrice.includes('.')) return
    setNewPrice(v => v + k)
  }

  const handleDone = () => {
    const patch = unitPricePatchFromInput(editMode, parsedInput, vatPer)
    if (!patch) return
    updateLine(selectedRowKey, patch)
    onClose()
  }

  const switchMode = mode => {
    if (mode === editMode) return
    if (parsedInput > 0) {
      const cur = resolveUnitPricesFromInput(editMode, parsedInput, vatPer)
      setNewPrice(mode === 'net' ? String(cur.unitNet) : fmtMoney(cur.unitPriceGross))
    }
    setEditMode(mode)
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

  const modeBtn = (mode, label) => (
    <button
      type="button"
      onClick={() => switchMode(mode)}
      style={{
        flex: 1, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
        fontSize: 10, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase',
        background: editMode === mode ? 'var(--brand)' : 'var(--surface-2)',
        color: editMode === mode ? '#fff' : 'var(--text-3)',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      ref={overlayRef} data-pos-overlay
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

        <div style={{ display: 'flex', overflow: 'hidden' }}>

          <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 2, borderRight: '1px solid var(--border)' }}>

            {fieldRow('BarCode', item.barcode)}
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
            {fieldRow('Current Price', currentNet)}
            {fieldRow('Current With VAT', fmtMoney(currentGross))}
            {fieldRow(`Line Total (×${item.qty})`, fmtMoney(currentLine.lineTotal))}

            <div style={{ display: 'flex', gap: 6, margin: '8px 0 4px 122px' }}>
              {modeBtn('net', 'Unit Price')}
              {modeBtn('gross', 'Price With VAT')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
              <span style={{ width: 110, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
                {editMode === 'gross' ? 'New Price (VAT)' : 'New Price'}
              </span>
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

            {preview ? (
              <>
                <div style={{ display: 'flex', gap: 10, padding: '6px 0', marginLeft: 122 }}>
                  {[
                    { label: 'VAT %',      value: vatPer },
                    { label: 'VAT Amount', value: fmtMoney(preview.unitVat) },
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

                {fieldRow(
                  editMode === 'net' ? 'Price With VAT' : 'Unit Price',
                  editMode === 'net' ? fmtMoney(preview.unitPriceGross) : fmtMoney(preview.unitNet),
                  true,
                )}
                {fieldRow(
                  `New Line Total (×${item.qty})`,
                  fmtMoney(previewLine.lineTotal),
                  true,
                )}
              </>
            ) : (
              <div style={{ padding: '8px 0 8px 122px', fontSize: 11, color: 'var(--text-4)' }}>
                Enter a price to preview VAT and line total
              </div>
            )}

          </div>

          <div style={{ width: 220, padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>

            {NUM_KEYS.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 6 }}>
                {row.map(k => numBtn(k, () => pressKey(k)))}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 6 }}>
              {numBtn('0', () => pressKey('0'))}
              {numBtn('.', () => pressKey('.'))}
              {numBtn('C', () => pressKey('C'), {
                background: 'var(--red-bg)', borderColor: 'var(--red-border)', color: 'var(--red)', fontSize: 12,
              })}
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <button
                onClick={handleDone}
                disabled={!parsedInput || parsedInput <= 0}
                style={{
                  flex: 1, height: 46, borderRadius: 8, border: 'none',
                  background: parsedInput > 0 ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--border)',
                  color: parsedInput > 0 ? '#fff' : 'var(--text-4)',
                  fontSize: 13, fontWeight: 800,
                  cursor: parsedInput > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.1s',
                  boxShadow: parsedInput > 0 ? '0 4px 12px rgba(107,0,0,0.22)' : 'none',
                }}
                onMouseEnter={e => { if (parsedInput > 0) e.currentTarget.style.filter = 'brightness(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
                onMouseDown={e => { if (parsedInput > 0) e.currentTarget.style.transform = 'scale(0.97)' }}
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
