import { useShallow } from 'zustand/react/shallow'
import { usePosStore } from '../../../store/posStore'
import { fmt3 } from '../../../lib/utils'
import { PM } from '../../../lib/paymentModes'
import CustomerSearch from './CustomerSearch'

const MODE_LABEL = { [PM.CASH]: 'CASH', [PM.CREDITCARD]: 'CARD', [PM.CREDIT]: 'CREDIT', [PM.MULTIPAYMENT]: 'MULTI PAY' }

/**
 * Bill summary card (top of the right side):
 *   customer          [special-bill label] · payment mode · lines
 *   [Sub total] [Discount] [Tax] [Round off] [  TOTAL  ]
 */
export default function PosTransactionPanel() {
  const s = usePosStore(useShallow(st => ({
    customerCode:  st.customerCode,
    paymentMode:   st.paymentMode,
    subTotal:      st.subTotal,
    discountAmt:   st.discountAmt,
    taxAmt:        st.taxAmt,
    roundOff:      st.roundOff,
    netAmount:     st.netAmount,
    paidAmount:    st.paidAmount,
    balanceAmount: st.balanceAmount,
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
        <div className="ph-txn-cust">
          <CustomerSearch variant="plain" />
          {s.customerCode && <span className="ph-txn-cust-code">{s.customerCode}</span>}
        </div>
        {title && <span className="ph-txn-title">{title}</span>}
        <span className="ph-txn-mode">{MODE_LABEL[s.paymentMode] ?? s.paymentMode}</span>
        <span className="ph-txn-count">{s.itemCount} {s.itemCount === 1 ? 'line' : 'lines'}</span>
      </div>

      <div className="ph-txn-boxes">
        {stats.map(st => (
          <div key={st.label} className="ph-txn-stat">
            <span>{st.label}</span>
            <b>{fmt3(st.value)}</b>
          </div>
        ))}
        <div className="ph-txn-total">
          <span>TOTAL</span>
          <strong>{fmt3(s.netAmount)}</strong>
          <div className="ph-txn-paid">
            <span>Paid <b>{fmt3(s.paidAmount)}</b></span>
            <span>Bal <b>{fmt3(s.balanceAmount)}</b></span>
          </div>
        </div>
      </div>
    </section>
  )
}
