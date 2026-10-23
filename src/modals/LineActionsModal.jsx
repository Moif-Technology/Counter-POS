import { useState } from 'react'
import { RotateCcw, Tag, Percent, SlidersHorizontal } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { findCartItemByKey, getCartRowKey } from '../lib/cartLine'
import { fmt3, fmtQty } from '../lib/utils'
import Modal from '../components/common/Modal'
import PriceChangeModal from './PriceChangeModal'
import DiscountModal from './DiscountModal'
import QtyChangeModal from './QtyChangeModal'

const ACTIONS = [
  { key: 'return',   label: 'Return',       icon: RotateCcw },
  { key: 'price',    label: 'Price Change', icon: Tag },
  { key: 'discount', label: 'Discount',     icon: Percent },
  { key: 'qty',      label: 'Qty Change',   icon: SlidersHorizontal },
]

/**
 * Cart line actions (double-tap a row): four round buttons —
 * Return · Price Change · Discount · Qty Change — for that line.
 */
export default function LineActionsModal({ item, onClose }) {
  const cartItems  = usePosStore(s => s.cartItems)
  const updateLine = usePosStore(s => s.updateLine)
  const [child, setChild] = useState(null)

  const rowKey   = getCartRowKey(item)
  const liveItem = findCartItemByKey(cartItems, rowKey) || item

  const run = (key) => {
    usePosStore.setState({ selectedRowKey: rowKey })
    if (key === 'return') {
      // Same as the old line popup: the line becomes a return (negative qty).
      const absQty = Math.abs(Number(liveItem.qty)) || 1
      updateLine(rowKey, { qty: -absQty })
      usePosStore.setState({ returnMode: true })
      onClose()
      return
    }
    setChild(key)
  }

  if (child === 'price')    return <PriceChangeModal rowKey={rowKey} onClose={onClose} />
  if (child === 'discount') return <DiscountModal rowKey={rowKey} onClose={onClose} />
  if (child === 'qty')      return <QtyChangeModal onClose={onClose} />

  return (
    <Modal onClose={onClose} kicker={`Line ${liveItem.slNo ?? ''}`} title={liveItem.description} width={460}>
      <div className="ph-line-meta">
        <span>Qty <b>{fmtQty(liveItem.qty)}</b></span>
        <span>Price <b>{fmt3(liveItem.unitPriceGross ?? liveItem.unitPrice)}</b></span>
      </div>
      <div className="ph-line-actions">
        {ACTIONS.map(({ key, label, icon: Icon }) => (
          <button key={key} className="ph-line-action" onClick={() => run(key)}>
            <span className="ph-line-circle"><Icon size={26} strokeWidth={1.8} /></span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
