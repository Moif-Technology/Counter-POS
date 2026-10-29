import { usePosStore } from '../store/posStore'
import { posConfirm } from './posNotify'
import { fmtQty } from './utils'

/** Fired after a bill is saved so open stock views (Look Up) reload qty on hand. */
export const STOCK_CHANGED_EVENT = 'pos-stock-changed'

export function notifyStockChanged() {
  window.dispatchEvent(new CustomEvent(STOCK_CHANGED_EVENT))
}

/**
 * Zero / short stock guard before a sale line is added.
 * Asks "Stock is X. Proceed?" when the product is out of stock or the cart would take
 * more than is on hand. Returns lines (qty < 0) and NON INVENTORY items pass straight through.
 */
export async function confirmStockForAdd(product, qty) {
  if (!product || product.trackStock === false) return true
  if (!(Number(qty) > 0)) return true
  const onHand = Number(product.qtyOnHand)
  if (!Number.isFinite(onHand)) return true

  const inCart = usePosStore.getState().cartItems
    .filter(i => product.productId != null && Number(i.productId) === Number(product.productId))
    .reduce((s, i) => s + Math.max(0, Number(i.qty) || 0), 0)
  const wanted = inCart + Number(qty)
  if (onHand > 0 && wanted <= onHand) return true

  const name = product.description ?? product.productName ?? 'This item'
  return posConfirm({
    title: onHand <= 0 ? 'Out of Stock' : 'Low Stock',
    message: `${name}: stock is ${fmtQty(onHand)}${inCart > 0 ? ` (${fmtQty(inCart)} already in cart)` : ''}. Proceed?`,
    confirmLabel: 'Proceed',
    cancelLabel: 'Cancel',
    danger: true,
  })
}
