import { ReceiptText, Printer } from 'lucide-react'
import PosPayTiles from './PosPayTiles'

/** Checkout: payment mode tiles, then BILLING No Print / BILLING With Print right under them. */
export default function PosBillingButtons({ saving, onSave }) {
  return (
    <div className="ph-checkout">
      <PosPayTiles />
      <div className="ph-billing">
        <button className="ph-bill is-outline" disabled={saving} onClick={() => onSave(false)}>
          <ReceiptText size={24} />
          <span>BILLING<br />No Print</span>
        </button>
        <button className="ph-bill is-solid" disabled={saving} onClick={() => onSave(true)}>
          <Printer size={24} />
          <span>BILLING<br />With Print</span>
        </button>
      </div>
    </div>
  )
}
