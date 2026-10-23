import { Repeat2 } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { calcLineTotals, findCartItemByKey, getCartRowKey } from '../../../lib/cartLine'
import { fmt3, fmtQty } from '../../../lib/utils'

/** Strip under the cart: the selected line (or the last scanned one) — item · qty · price · total · Repeat. */
export default function PosItemCard() {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const repeatLine     = usePosStore(s => s.repeatLine)
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
      <button
        className="ph-itemcard-repeat"
        disabled={!item}
        onClick={() => repeatLine(getCartRowKey(item))}
        title="Add one more of this item"
      >
        <Repeat2 size={18} />
        <span>Repeat</span>
      </button>
    </div>
  )
}
