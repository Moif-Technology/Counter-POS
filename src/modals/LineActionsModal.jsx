import { useLayoutEffect, useRef, useState } from 'react'
import { RotateCcw, BadgePercent, Pencil, Repeat2, Diff } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { findCartItemByKey, getCartRowKey } from '../lib/cartLine'
import { fmt3 } from '../lib/utils'
import { posConfirm } from '../lib/posNotify'
import { useEscapeKey } from '../hooks/useEscapeKey'
import PriceChangeModal from './PriceChangeModal'
import DiscountModal from './DiscountModal'
import QtyWheelModal from './QtyWheelModal'

// `confirm` actions are sensitive: the cashier must confirm before they run.
const ACTIONS = [
  { key: 'return',   label: 'Return',        icon: RotateCcw,    confirm: true, primary: true },
  { key: 'discount', label: 'Add Discount',  icon: BadgePercent },
  { key: 'price',    label: 'Edit Price',    icon: Pencil,       confirm: true },
  { key: 'repeat',   label: 'Repeat Item',   icon: Repeat2 },
  { key: 'qty',      label: 'Edit Quantity', icon: Diff },
]

const GAP = 6      // space between the row and the menu
const EDGE = 12    // keep the menu this far from the screen edges

/**
 * Line actions menu — a card that drops down from the tapped cart row:
 * Return · Add Discount · Edit Price · Repeat Item · Edit Quantity.
 * It closes as soon as an action is picked; Return and Edit Price ask first.
 *
 *   x      — tap position (the menu is centred on it, kept on screen)
 *   anchor — the row's bounding rect; the menu opens below it, or above when there is no room
 */
export default function LineActionsModal({ item, x, anchor, onClose }) {
  const cartItems  = usePosStore(s => s.cartItems)
  const updateLine = usePosStore(s => s.updateLine)
  const [child, setChild] = useState(null)   // 'busy' while confirming, or the popup to show
  const [pos, setPos] = useState(null)
  const menuRef = useRef(null)

  const rowKey   = getCartRowKey(item)
  const liveItem = findCartItemByKey(cartItems, rowKey) || item

  useEscapeKey(onClose, !child)

  // Place the menu once its size is known: under the row (or above it), centred on the tap.
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el || !anchor) return
    const { width, height } = el.getBoundingClientRect()
    const left = Math.min(Math.max((x ?? anchor.left + anchor.width / 2) - width / 2, EDGE), window.innerWidth - width - EDGE)
    const below = anchor.bottom + GAP
    const top = below + height <= window.innerHeight - EDGE ? below : Math.max(anchor.top - GAP - height, EDGE)
    setPos({ left, top })
  }, [x, anchor])

  const ask = (key) => {
    const name = liveItem.description
    if (key === 'return') {
      return posConfirm({
        title: 'Return this item?',
        message: `${name} will be added as a return (qty ${-Math.abs(Number(liveItem.qty) || 1)}).`,
        confirmLabel: 'Return', cancelLabel: 'Cancel', danger: true,
      })
    }
    return posConfirm({
      title: 'Override the price?',
      message: `Change the selling price of ${name} (now ${fmt3(liveItem.unitPriceGross ?? liveItem.unitPrice)}).`,
      confirmLabel: 'Edit Price', cancelLabel: 'Cancel',
    })
  }

  const run = async (action) => {
    usePosStore.setState({ selectedRowKey: rowKey })
    setChild('busy')   // close the menu straight away
    if (action.confirm && !(await ask(action.key))) { onClose(); return }

    if (action.key === 'return') {
      updateLine(rowKey, { qty: -(Math.abs(Number(liveItem.qty)) || 1) })
      usePosStore.setState({ returnMode: true })
      onClose()
    } else if (action.key === 'repeat') {
      // One more unit of this line, in its own direction (a return line gets one more returned).
      const qty = Number(liveItem.qty) || 0
      updateLine(rowKey, { qty: qty + (qty < 0 ? -1 : 1) })
      onClose()
    } else {
      setChild(action.key)
    }
  }

  if (child === 'price')    return <PriceChangeModal rowKey={rowKey} onClose={onClose} />
  if (child === 'discount') return <DiscountModal rowKey={rowKey} onClose={onClose} />
  if (child === 'qty')      return <QtyWheelModal item={liveItem} onClose={onClose} />
  if (child === 'busy')     return null

  return (
    <div className="ph-linemenu-overlay" data-pos-overlay onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={menuRef}
        className="ph-linemenu"
        role="menu"
        aria-label={`Actions for ${liveItem.description}`}
        style={pos ?? { visibility: 'hidden' }}
      >
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              role="menuitem"
              className={`ph-linemenu-item${action.primary ? ' is-primary' : ''}`}
              onClick={() => run(action)}
            >
              <Icon size={22} strokeWidth={1.8} />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
