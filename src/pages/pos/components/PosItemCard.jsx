import { usePosStore } from '../../../store/posStore'
import { calcLineTotals, findCartItemByKey } from '../../../lib/cartLine'
import { fmt3, fmtQty } from '../../../lib/utils'

/** Strip under the cart: the selected line (or the last scanned one) — item · qty · price · total. */
export default function PosItemCard() {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const item = findCartItemByKey(cartItems, selectedRowKey) ?? cartItems[cartItems.length - 1]

  return (
    <div className={`ph-itemcard${item ? '' : ' is-empty'}`}>
      <div className="ph-itemcard-main">
        <span className="ph-label">Item</span>
        <strong className="ph-ellipsis">{item?.description ?? 'No item selected'}</strong>
      </div>
      <div className="ph-itemcard-stat">
        <span className="ph-label">Qty</span>
        <b>{item ? fmtQty(item.qty) : '—'}</b>
      </div>
      <div className="ph-itemcard-stat">
        <span className="ph-label">Price</span>
        <b>{item ? fmt3(item.unitPriceGross ?? item.unitPrice) : '—'}</b>
      </div>
      <div className="ph-itemcard-stat is-total">
        <span className="ph-label">Total</span>
        <b>{item ? fmt3(calcLineTotals(item).lineTotal) : '—'}</b>
      </div>
    </div>
  )
}
