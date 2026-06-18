import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Percent } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import {
  billDiscountInitialState,
  billTaxableBeforeDiscount,
  previewBillDiscount,
  resolveDiscountOnTaxable,
} from '../../lib/discountCalc'
import DiscountEntryPanel from './DiscountEntryPanel'

export default function BillDiscountModal({ onClose }) {
  const cartItems = usePosStore(s => s.cartItems)
  const billDiscountAmt = usePosStore(s => s.billDiscountAmt)
  const setBillDiscount = usePosStore(s => s.setBillDiscount)

  const taxableBase = useMemo(
    () => billTaxableBeforeDiscount(cartItems),
    [cartItems],
  )

  const initial = useMemo(
    () => billDiscountInitialState(cartItems, billDiscountAmt),
    [cartItems, billDiscountAmt],
  )

  const [mode, setMode]       = useState(initial.mode)
  const [discPct, setDiscPct] = useState(initial.discPct)
  const [discAmt, setDiscAmt] = useState(initial.discAmt)
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!cartItems.length) return null

  const preview = previewBillDiscount(cartItems, mode, discPct, discAmt)
  const displayPct = mode === 'pct' ? discPct : (preview.pct ? String(preview.pct) : '')
  const displayAmt = mode === 'amt' ? discAmt : (preview.discountAmt ? String(preview.discountAmt) : '')

  const handleKey = k => {
    if (k === 'C') {
      if (mode === 'pct') setDiscPct('')
      else setDiscAmt('')
      return
    }
    if (k === '⌫') {
      if (mode === 'pct') setDiscPct(v => v.slice(0, -1))
      else setDiscAmt(v => v.slice(0, -1))
      return
    }
    if (k === '.' && (mode === 'pct' ? discPct : discAmt).includes('.')) return

    if (mode === 'pct') {
      const next = discPct + k
      if (parseFloat(next) > 100) return
      setDiscPct(next)
    } else {
      const next = discAmt + k
      if (parseFloat(next) > Math.abs(taxableBase)) return
      setDiscAmt(next)
    }
  }

  const applyPreset = p => {
    setMode('pct')
    setDiscPct(String(p))
    setDiscAmt('')
  }

  const handleDone = () => {
    const { discountAmt } = resolveDiscountOnTaxable(
      taxableBase,
      mode,
      mode === 'pct' ? discPct : displayPct,
      mode === 'amt' ? discAmt : displayAmt,
    )
    setBillDiscount(discountAmt)
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.44)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <style>{`
        @media (max-width: 600px) {
          .dc-body { flex-direction: column !important; }
          .dc-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; }
          .dc-right { width: 100% !important; }
        }
      `}</style>

      <div style={{
        width: 600, maxWidth: '96vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 28px 72px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Bill</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Bill Discount</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer',
          }}>
            <X size={14} />
          </button>
        </div>

        <DiscountEntryPanel
          contextLabel={`${cartItems.length} item${cartItems.length !== 1 ? 's' : ''} on bill`}
          contextHint="Bill discount on taxable total after line discounts (before VAT)."
          taxableBefore={taxableBase}
          discountAmt={preview.discountAmt}
          taxableAfter={preview.netTaxable}
          totalWithVat={preview.grossTotal}
          totalLabel="Bill total (incl. VAT)"
          mode={mode}
          setMode={setMode}
          displayPct={displayPct}
          displayAmt={displayAmt}
          onKey={handleKey}
          applyPreset={applyPreset}
          onClear={() => { setDiscPct(''); setDiscAmt('') }}
          onDone={handleDone}
          onClose={onClose}
        />
      </div>
    </div>
  )
}
