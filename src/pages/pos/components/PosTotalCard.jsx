import { useShallow } from 'zustand/react/shallow'
import { usePosStore } from '../../../store/posStore'
import { fmt3 } from '../../../lib/utils'

/** TOTAL card (top of the right column): bill total with Paid · Balance. */
export default function PosTotalCard() {
  const s = usePosStore(useShallow(st => ({
    netAmount:     st.netAmount,
    paidAmount:    st.paidAmount,
    balanceAmount: st.balanceAmount,
  })))

  return (
    <section className="ph-total" aria-label="Bill total">
      <span className="ph-total-label">TOTAL</span>
      <strong>{fmt3(s.netAmount)}</strong>
      <div className="ph-total-paid">
        <span>Paid <b>{fmt3(s.paidAmount)}</b></span>
        <span>Bal <b>{fmt3(s.balanceAmount)}</b></span>
      </div>
    </section>
  )
}
