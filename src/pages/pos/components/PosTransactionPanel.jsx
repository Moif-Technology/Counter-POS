import { useShallow } from 'zustand/react/shallow'
import { usePosStore } from '../../../store/posStore'
import { fmt3 } from '../../../lib/utils'
import { PM, isCashTenderMode } from '../../../lib/paymentModes'
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
    tenderInput:   st.tenderInput,
  })))
  const setTenderInput = usePosStore(st => st.setTenderInput)
  const showTender = isCashTenderMode(s.paymentMode)

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
            {showTender ? (
              <label htmlFor="pos-paid-amount">
                Paid{' '}
                <input
                  id="pos-paid-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={fmt3(s.netAmount)}
                  value={s.tenderInput}
                  disabled={!s.itemCount}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9.]/g, '')
                    if ((v.match(/\./g) ?? []).length > 1) return
                    setTenderInput(v)
                  }}
                  onKeyDown={e => { if (e.key === 'Escape') setTenderInput('') }}
                  style={{
                    width: 76, height: 20, boxSizing: 'border-box', textAlign: 'right',
                    borderRadius: 5, border: '1px solid var(--brand-border)', background: '#fff',
                    padding: '0 5px', fontSize: 11, fontWeight: 700, color: '#3f3f46', outline: 'none',
                  }}
                />
              </label>
            ) : (
              <span>Paid <b>{fmt3(s.paidAmount)}</b></span>
            )}
            <span>{showTender ? (s.balanceAmount < 0 ? 'Short' : 'Change') : 'Bal'} <b>{fmt3(s.balanceAmount)}</b></span>
          </div>
        </div>
      </div>
    </section>
  )
}
