import { useEffect, useRef, useState } from 'react'
import { X, Tag } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import {
  calcLineTotals,
  findCartItemByKey,
  resolveUnitPriceGross,
  resolveUnitPricesFromInput,
  unitPricePatchFromInput,
} from '../../../lib/cartLine'
import { fmtMoney } from '../../../lib/currencyFormat'
import { getGvTax } from '../../../lib/gvtax'
import Numpad from './common/NeumorphicNumpad'

export default function LitePriceChangeModal({ onClose, rowKey: rowKeyProp, zIndex = 1000 }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const activeKey      = rowKeyProp ?? selectedRowKey
  const item           = findCartItemByKey(cartItems, activeKey)

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
  const currentDisc = currentLine.discountAmt

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
    updateLine(activeKey, {
      ...patch,
      discount: item.discount ?? 0,
      discountMode: item.discountMode ?? 'pct',
      ...(item.discountMode === 'amt' ? { discountAmt: Number(item.discountAmt) || 0 } : {}),
    })
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

  const fieldRow = (label, value, accent) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <span style={{
        width: 108, flexShrink: 0, textAlign: 'right',
        fontSize: 10.5, fontWeight: 700,
        color: accent ? 'var(--brand)' : 'var(--text-2)',
      }}>{label}</span>
      <div style={{
        flex: 1, height: 30, borderRadius: 7,
        border: `1.5px solid ${accent ? 'var(--brand-border)' : 'var(--border)'}`,
        background: accent ? 'var(--brand-bg)' : '#fff',
        display: 'flex', alignItems: 'center', padding: '0 10px',
        fontSize: 12, fontWeight: 700,
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
        flex: 1, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
        fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase',
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
        position: 'fixed', inset: 0, zIndex,
        background: 'rgba(10,8,6,0.4)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12,
      }}
    >
      <div style={{
        width: 500, maxWidth: '96vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
      }}>

        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Tag size={14} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>Price Change</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          <div style={{
            flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 0,
            borderRight: '1px solid var(--border)', overflowY: 'auto',
          }}>
            {fieldRow('BarCode', item.barcode)}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            {fieldRow('Current Price', currentNet)}
            {fieldRow('Current With VAT', fmtMoney(currentGross))}
            {fieldRow(`Line Total (×${item.qty})`, fmtMoney(currentLine.lineTotal))}
            {fieldRow('Discount (fixed)', fmtMoney(currentDisc))}

            <div style={{ display: 'flex', gap: 6, margin: '6px 0 2px 118px' }}>
              {modeBtn('net', 'Unit Price')}
              {modeBtn('gross', 'Price With VAT')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <span style={{ width: 108, flexShrink: 0, textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)' }}>
                {editMode === 'gross' ? 'New Price (VAT)' : 'New Price'}
              </span>
              <div style={{
                flex: 1, height: 30, borderRadius: 7,
                border: '1.5px solid var(--brand)',
                background: 'var(--brand-bg)',
                display: 'flex', alignItems: 'center', padding: '0 10px',
                fontSize: 13, fontWeight: 800,
                color: 'var(--text-1)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {newPrice || <span style={{ color: 'var(--text-4)', fontWeight: 500, fontSize: 11 }}>Enter new price…</span>}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

            {/* Fixed-height preview — modal does not grow when typing */}
            <div style={{ minHeight: 108, flexShrink: 0 }}>
              {preview ? (
                <>
                  <div style={{ display: 'flex', gap: 8, padding: '2px 0', marginLeft: 118 }}>
                    {[
                      { label: 'VAT %', value: vatPer },
                      { label: 'VAT Amount', value: fmtMoney(preview.unitVat) },
                    ].map(f => (
                      <div key={f.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>{f.label}</span>
                        <div style={{
                          height: 28, borderRadius: 7,
                          border: '1px solid var(--border)', background: 'var(--surface-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
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
                  {fieldRow(`New Line Total (×${item.qty})`, fmtMoney(previewLine.lineTotal), true)}
                </>
              ) : (
                <div style={{
                  height: 108, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 10px', fontSize: 10.5, color: 'var(--text-4)', textAlign: 'center',
                }}>
                  Enter a price to preview VAT and line total
                </div>
              )}
            </div>
          </div>

          <div style={{ width: 200, flexShrink: 0, padding: '12px 12px' }}>
            <Numpad
              onKey={pressKey}
              showDot
              showClear
              showBackspace={false}
              btnHeight={40}
              fontSize={15}
              gap={5}
              extraRows={[[
                {
                  label: 'Done',
                  flex: 2,
                  style: {
                    background: parsedInput > 0
                      ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                      : 'var(--border)',
                    color: parsedInput > 0 ? '#fff' : 'var(--text-4)',
                    border: 'none',
                    fontSize: 12,
                    boxShadow: parsedInput > 0 ? '0 4px 12px rgba(107,0,0,0.2)' : 'none',
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
                    fontSize: 12,
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
