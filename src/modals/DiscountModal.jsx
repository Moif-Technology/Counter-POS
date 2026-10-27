import { useState } from 'react'
import { usePosStore } from '../store/posStore'
import { findCartItemByKey } from '../lib/cartLine'
import { roundMoney } from '../lib/currencyFormat'
import {
  lineDiscountInitialState,
  lineTaxableBeforeDiscount,
  previewLineDiscount,
} from '../lib/discountCalc'
import DiscountScreen from './DiscountScreen'

/** Line Discount — discount on one cart line (same screen as Bill Discount). */
export default function DiscountModal({ onClose, rowKey: rowKeyProp, zIndex = 1000 }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const activeKey      = rowKeyProp ?? selectedRowKey
  const item           = findCartItemByKey(cartItems, activeKey)
  const [initial]      = useState(() => lineDiscountInitialState(item))

  if (!item) return null

  const base  = lineTaxableBeforeDiscount(item)
  const gross = previewLineDiscount(item, 'pct', '0', '').grossTotal   // line total before any discount

  const handleApply = ({ mode, discountAmt, pct }) => {
    if (discountAmt <= 0 && pct <= 0) updateLine(activeKey, { discount: 0, discountAmt: 0, discountMode: 'pct' })
    else if (mode === 'amt') updateLine(activeKey, { discount: 0, discountAmt, discountMode: 'amt' })
    else updateLine(activeKey, { discount: pct, discountAmt: 0, discountMode: 'pct' })
  }

  return (
    <DiscountScreen
      title="Line Discount"
      kicker={item.description}
      totalLabel="Line Total"
      base={base}
      tax={roundMoney(gross - base)}
      gross={gross}
      initial={initial}
      preview={(mode, pct, amt) => previewLineDiscount(item, mode, pct, amt)}
      onApply={handleApply}
      onClose={onClose}
      zIndex={zIndex}
    />
  )
}
