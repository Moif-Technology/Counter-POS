import { useMemo } from 'react'
import { usePosStore } from '../store/posStore'
import { sumBillTotals } from '../lib/cartLine'
import { billDiscountInitialState, previewBillDiscount } from '../lib/discountCalc'
import DiscountScreen from './DiscountScreen'

/** Bill Discount — discount on the whole bill (see DiscountScreen). */
export default function BillDiscountModal({ onClose }) {
  const cartItems       = usePosStore(s => s.cartItems)
  const billNo          = usePosStore(s => s.billNo)
  const billDiscountAmt = usePosStore(s => s.billDiscountAmt)
  const setBillDiscount = usePosStore(s => s.setBillDiscount)

  const totals = useMemo(() => sumBillTotals(cartItems ?? []), [cartItems])
  const initial = useMemo(() => billDiscountInitialState(cartItems, billDiscountAmt), [cartItems, billDiscountAmt])

  if (!cartItems.length) return null

  return (
    <DiscountScreen
      title="Bill Discount"
      kicker={`Bill # ${billNo || '—'}`}
      totalLabel="Net Bill"
      base={totals.subTotal}
      tax={totals.taxAmt}
      gross={totals.gross}
      initial={initial}
      preview={(mode, pct, amt) => previewBillDiscount(cartItems, mode, pct, amt)}
      onApply={({ discountAmt }) => setBillDiscount(discountAmt)}
      onClose={onClose}
    />
  )
}
