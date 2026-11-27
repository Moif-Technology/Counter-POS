import { ReceiptText, Printer } from 'lucide-react'
import PosPayTiles from './PosPayTiles'
import { usePosStore, featureOn } from '../../../store/posStore'

/** Checkout: payment mode tiles, then BILLING No Print / BILLING With Print right under them. */
export default function PosBillingButtons({ saving, onSave, onMultiPay }) {
  // Superadmin "Direct settlement / Print Bill" off → only BILLING No Print stays.
  const canPrint = usePosStore(s => featureOn(s.features, 'pos.settlement', 'pos.settlement.direct'))
  // Superadmin "BILLING No Print" off → only BILLING With Print stays. Never hide both (till could not bill).
  const canNoPrint = usePosStore(s => featureOn(s.features, 'pos.billing_no_print')) || !canPrint
  return (
    <div className="ph-checkout">
      <PosPayTiles onMultiPay={onMultiPay} />
      <div className="ph-billing" style={canPrint && canNoPrint ? undefined : { gridTemplateColumns: '1fr' }}>
        {canNoPrint && (
          <button className="ph-bill is-outline" disabled={saving} onClick={() => onSave(false)}>
            <ReceiptText size={24} />
            <span>BILLING<br />No Print</span>
          </button>
        )}
        {canPrint && (
          <button className="ph-bill is-solid" disabled={saving} onClick={() => onSave(true)}>
            <Printer size={24} />
            <span>BILLING<br />With Print</span>
          </button>
        )}
      </div>
    </div>
  )
}
