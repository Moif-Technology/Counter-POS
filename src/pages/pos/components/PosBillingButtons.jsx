import { ReceiptText, Printer } from 'lucide-react'

/** BILLING No Print / BILLING With Print (main button, right). */
export default function PosBillingButtons({ saving, onSave }) {
  return (
    <div className="ph-billing">
      <button className="ph-bill is-outline" disabled={saving} onClick={() => onSave(false)}>
        <ReceiptText size={26} />
        <span>BILLING<br />No Print</span>
      </button>
      <button className="ph-bill is-solid" disabled={saving} onClick={() => onSave(true)}>
        <Printer size={26} />
        <span>BILLING<br />With Print</span>
      </button>
    </div>
  )
}
