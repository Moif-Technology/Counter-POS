import { usePosStore } from '../../../store/posStore'
import { calcLineTotals, findCartItemByKey } from '../../../lib/cartLine'
import { fmt3, fmtQty } from '../../../lib/utils'

/** Selected line (or the last scanned one): Item · Qty · Price · Total. */
export default function PosItemCard() {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const item = findCartItemByKey(cartItems, selectedRowKey) ?? cartItems[cartItems.length - 1]

  return (
    <div className="ph-card ph-itemcard">
      <div className="ph-itemcard-row">
        <span className="ph-label">Item :</span>
        <strong className="ph-itemcard-name ph-ellipsis">{item?.description ?? '—'}</strong>
      </div>
      <div className="ph-itemcard-row ph-itemcard-nums">
        <span><span className="ph-label">Qty :</span> <b>{item ? fmtQty(item.qty) : '—'}</b></span>
        <span><span className="ph-label">Price:</span> <b>{item ? fmt3(item.unitPriceGross ?? item.unitPrice) : '—'}</b></span>
        <span><span className="ph-label">Total:</span> <b>{item ? fmt3(calcLineTotals(item).lineTotal) : '—'}</b></span>
      </div>
    </div>
  )
}
