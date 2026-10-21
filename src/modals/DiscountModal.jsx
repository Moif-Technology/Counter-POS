import { useState } from 'react'
import { Percent } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { findCartItemByKey } from '../lib/cartLine'
import {
  lineDiscountInitialState,
  lineTaxableBeforeDiscount,
  previewLineDiscount,
  resolveDiscountOnTaxable,
} from '../lib/discountCalc'
import DiscountEntryPanel from './DiscountEntryPanel'
import Modal from '../components/common/Modal'

export default function DiscountModal({ onClose, rowKey: rowKeyProp, zIndex = 1000 }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const activeKey      = rowKeyProp ?? selectedRowKey
  const item           = findCartItemByKey(cartItems, activeKey)

  const initial = lineDiscountInitialState(item)
  const [mode, setMode]       = useState(initial.mode)
  const [discPct, setDiscPct] = useState(initial.discPct)
  const [discAmt, setDiscAmt] = useState(initial.discAmt)

  if (!item) return null

  const taxableBase = lineTaxableBeforeDiscount(item)
  const preview = previewLineDiscount(item, mode, discPct, discAmt)
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
    const { discountAmt, pct } = resolveDiscountOnTaxable(
      taxableBase,
      mode,
      mode === 'pct' ? discPct : displayPct,
      mode === 'amt' ? discAmt : displayAmt,
    )
    if (discountAmt <= 0 && pct <= 0) {
      updateLine(activeKey, { discount: 0, discountAmt: 0, discountMode: 'pct' })
    } else if (mode === 'amt') {
      updateLine(activeKey, { discount: 0, discountAmt, discountMode: 'amt' })
    } else {
      updateLine(activeKey, { discount: pct, discountAmt: 0, discountMode: 'pct' })
    }
    onClose()
  }

  return (
    <Modal
      onClose={onClose}
      icon={Percent}
      kicker="Line item"
      title="Line Discount"
      zIndex={zIndex}
      width={600}
    >
      <style>{`
        @media (max-width: 600px) {
          .dc-body { flex-direction: column !important; }
          .dc-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; }
          .dc-right { width: 100% !important; }
        }
      `}</style>

      <DiscountEntryPanel
        contextLabel={item.description}
        contextHint="Discount applies on taxable amount (before VAT)."
        taxableBefore={taxableBase}
        discountAmt={preview.discountAmt}
        taxableAfter={preview.netTaxable}
        totalWithVat={preview.grossTotal}
        totalLabel="Line total (incl. VAT)"
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
