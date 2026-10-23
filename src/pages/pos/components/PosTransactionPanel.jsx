import { useShallow } from 'zustand/react/shallow'
import { usePosStore } from '../../../store/posStore'
import { fmt3 } from '../../../lib/utils'
import { PM } from '../../../lib/paymentModes'
import { UserRound, ChevronRight } from 'lucide-react'
import CustomerSearch from './CustomerSearch'

const MODE_LABEL = { [PM.CASH]: 'CASH', [PM.CREDITCARD]: 'CARD', [PM.CREDIT]: 'CREDIT', [PM.MULTIPAYMENT]: 'MULTI PAY' }

/**
 * Bill summary card (top of the middle column):
 *   (icon) Customer / name     [special-bill label] · payment mode · lines ›
 *   [Sub total] [Discount] [Tax] [Round off]
 * The TOTAL has its own card — see PosTotalCard.
 */
export default function PosTransactionPanel() {
  const s = usePosStore(useShallow(st => ({
    customerCode:  st.customerCode,
    paymentMode:   st.paymentMode,
    subTotal:      st.subTotal,
    discountAmt:   st.discountAmt,
    taxAmt:        st.taxAmt,
    roundOff:      st.roundOff,
    returnMode:    st.returnMode,
    recalledHold:  st.recalledHoldSalesId,
    recalledDelivery: st.recalledDeliverySalesId,
    itemCount:     st.cartItems.length,
  })))

  // Only special bills get a label; a normal new bill shows none.
  const title = s.returnMode ? 'Return Transaction'
    : s.recalledHold ? 'Recalled Hold'
    : s.recalledDelivery ? 'Recalled Delivery'
    : null

  const stats = [
    { label: 'Sub Total', value: s.subTotal },
    { label: 'Discount',  value: s.discountAmt },
    { label: 'Tax',       value: s.taxAmt },
    { label: 'Round Off', value: s.roundOff },
  ]

  return (
    <section className={`ph-txn${s.returnMode ? ' is-return' : ''}`} aria-label="Bill summary">
      <div className="ph-txn-head">
        <span className="ph-txn-avatar"><UserRound size={16} /></span>
        <div className="ph-txn-cust">
          <span className="ph-txn-cust-label">Customer{s.customerCode ? ` · ${s.customerCode}` : ''}</span>
          <CustomerSearch variant="plain" />
        </div>
        {title && <span className="ph-txn-title">{title}</span>}
        <span className="ph-txn-mode">{MODE_LABEL[s.paymentMode] ?? s.paymentMode}</span>
        <span className="ph-txn-count">{s.itemCount} {s.itemCount === 1 ? 'line' : 'lines'} <ChevronRight size={14} /></span>
      </div>

      <div className="ph-txn-boxes">
        {stats.map(st => (
          <div key={st.label} className="ph-txn-stat">
            <span>{st.label}</span>
            <b>{fmt3(st.value)}</b>
          </div>
        ))}
      </div>
    </section>
  )
}
