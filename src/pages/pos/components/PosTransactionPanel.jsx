import { useShallow } from 'zustand/react/shallow'
import { usePosStore } from '../../../store/posStore'
import { fmt3 } from '../../../lib/utils'
import { PM } from '../../../lib/paymentModes'
import CustomerSearch from './CustomerSearch'

const MODE_LABEL = { [PM.CASH]: 'CASH', [PM.CREDITCARD]: 'CARD', [PM.CREDIT]: 'CREDIT', [PM.MULTIPAYMENT]: 'MULTI PAY' }

/** Bottom "New Transaction" panel: customer · tender · tax breakdown · paid / balance · TOTAL. */
export default function PosTransactionPanel() {
  const s = usePosStore(useShallow(st => ({
    customerCode: st.customerCode,
    paymentMode:  st.paymentMode,
    subTotal:     st.subTotal,
    discountAmt:  st.discountAmt,
    taxableAmt:   st.taxableAmt,
    taxAmt:       st.taxAmt,
    roundOff:     st.roundOff,
    netAmount:    st.netAmount,
    paidAmount:   st.paidAmount,
    balanceAmount: st.balanceAmount,
    returnMode:   st.returnMode,
    recalledHold: st.recalledHoldSalesId,
    recalledDelivery: st.recalledDeliverySalesId,
    currency:     st.currency,
  })))

  const title = s.returnMode ? 'Return Transaction'
    : s.recalledHold ? 'Recalled Hold'
    : s.recalledDelivery ? 'Recalled Delivery'
    : 'New Transaction'

  return (
    <section className="ph-txn" aria-label="Current transaction">
      <div className="ph-txn-title">{title}</div>

      <div className="ph-txn-cust">
        <div className="ph-txn-line">
          <span className="ph-label">Customer</span>
          <CustomerSearch variant="plain" dropUp />
        </div>
        <div className="ph-txn-line">
          <span className="ph-label">Customer Code</span>
          <b>{s.customerCode || '—'}</b>
        </div>
      </div>

      <div className="ph-txn-tender">
        <div className="ph-txn-line">
          <span className="ph-txn-mode">{MODE_LABEL[s.paymentMode] ?? s.paymentMode}</span>
          <b>{fmt3(s.subTotal)}</b>
        </div>
        <div className="ph-txn-line">
          <span className="ph-label ph-txn-right">Discount</span>
          <b>{fmt3(s.discountAmt)}</b>
        </div>
      </div>

      <div className="ph-txn-tax">
        <span className="ph-label">Taxable</span>    <b>{fmt3(s.taxableAmt)}</b>
        <span className="ph-label">Tax Amount</span> <b>{fmt3(s.taxAmt)}</b>
        <span className="ph-label">Round Off</span>  <b>{fmt3(s.roundOff)}</b>
        <span className="ph-label ph-strong">Total</span> <b className="ph-brand">{fmt3(s.netAmount)}</b>
      </div>

      <div className="ph-txn-paid">
        <label>Paid :</label><output>{fmt3(s.paidAmount)}</output>
        <label>Bal :</label><output>{fmt3(s.balanceAmount)}</output>
      </div>

      <div className="ph-txn-total">
        <span>TOTAL</span>
        <strong>{fmt3(s.netAmount)}</strong>
      </div>
    </section>
  )
}
