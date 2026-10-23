import { useState } from 'react'
import { RotateCcw, Tag, Percent, SlidersHorizontal } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { findCartItemByKey, getCartRowKey } from '../lib/cartLine'
import { useEscapeKey } from '../hooks/useEscapeKey'
import PriceChangeModal from './PriceChangeModal'
import DiscountModal from './DiscountModal'
import QtyWheelModal from './QtyWheelModal'

const RADIUS  = 76   // distance of the buttons from the centre
const MARGIN  = 120  // keep the whole wheel on screen
const STAGGER = 70   // ms between buttons, so they sweep out one after another

// Clockwise from the top
const ACTIONS = [
  { key: 'discount', label: 'Add Discount', icon: Percent,           angle: -90 },
  { key: 'price',    label: 'Edit Price',   icon: Tag,               angle: 0 },
  { key: 'qty',      label: 'Edit Qty',     icon: SlidersHorizontal, angle: 90 },
  { key: 'return',   label: 'Return',       icon: RotateCcw,         angle: 180 },
]

/**
 * Radial line menu — opens where the cart row was double-tapped:
 * Add Discount (top) · Edit Price (right) · Edit Qty (bottom) · Return (left).
 */
export default function LineActionsModal({ item, x, y, onClose }) {
  const cartItems  = usePosStore(s => s.cartItems)
  const updateLine = usePosStore(s => s.updateLine)
  const [child, setChild] = useState(null)

  const rowKey   = getCartRowKey(item)
  const liveItem = findCartItemByKey(cartItems, rowKey) || item

  useEscapeKey(onClose, !child)

  const run = (key) => {
    usePosStore.setState({ selectedRowKey: rowKey })
    if (key === 'return') {
      // The line becomes a return (negative qty), as the old line popup did.
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
  if (child === 'qty')      return <QtyWheelModal item={liveItem} onClose={onClose} />

  const cx = Math.min(Math.max(x ?? window.innerWidth / 2, MARGIN), window.innerWidth - MARGIN)
  const cy = Math.min(Math.max(y ?? window.innerHeight / 2, MARGIN), window.innerHeight - MARGIN)

  // Rendered in place (inside the POS screen) so it picks up the screen's colour variables.
  return (
    <div className="ph-radial-overlay" data-pos-overlay onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ph-radial" style={{ left: cx, top: cy }} role="menu" aria-label={`Actions for ${liveItem.description}`}>
        <span className="ph-radial-backdrop" />
        <span className="ph-radial-center" />
        {ACTIONS.map(({ key, label, icon: Icon, angle }, i) => {
          const rad = (angle * Math.PI) / 180
          return (
            <button
              key={key}
              role="menuitem"
              className="ph-radial-btn"
              style={{
                '--tx': `${Math.round(Math.cos(rad) * RADIUS)}px`,
                '--ty': `${Math.round(Math.sin(rad) * RADIUS)}px`,
                animationDelay: `${i * STAGGER}ms`,
              }}
              onClick={() => run(key)}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
