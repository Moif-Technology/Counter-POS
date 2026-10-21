import { useMemo, useState } from 'react'
import { Percent } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import {
  billDiscountInitialState,
  billTaxableBeforeDiscount,
  previewBillDiscount,
  resolveDiscountOnTaxable,
} from '../lib/discountCalc'
import DiscountEntryPanel from './DiscountEntryPanel'
import Modal from '../components/common/Modal'

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
    <Modal onClose={onClose} icon={Percent} kicker="Bill" title="Bill Discount" width={600}>
      <style>{`
        @media (max-width: 600px) {
          .dc-body { flex-direction: column !important; }
          .dc-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; }
          .dc-right { width: 100% !important; }
        }
      `}</style>

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
    </Modal>
  )
}
