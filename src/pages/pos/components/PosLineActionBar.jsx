import { useState } from 'react'
import { RotateCcw, BadgePercent, Pencil, Diff } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { findCartItemByKey, getCartRowKey } from '../../../lib/cartLine'
import { fmt3 } from '../../../lib/utils'
import { posConfirm } from '../../../lib/posNotify'
import { closeAndFocusBarcode } from '../../../lib/posFocus'
import PriceChangeModal from '../../../modals/PriceChangeModal'
import DiscountModal from '../../../modals/DiscountModal'
import QtyWheelModal from '../../../modals/QtyWheelModal'

// `confirm` actions are sensitive: the cashier must confirm before they run.
const ACTIONS = [
  { key: 'return',   label: 'Return',        icon: RotateCcw,    confirm: true },
  { key: 'discount', label: 'Add Discount',  icon: BadgePercent },
  { key: 'price',    label: 'Edit Price',    icon: Pencil,       confirm: true },
  { key: 'qty',      label: 'Edit Quantity', icon: Diff },
]

/**
 * Line actions bar at the foot of the cart: Return · Add Discount · Edit Price · Edit Quantity.
 * Acts on the line shown in the item strip (the selected line, or the last one).
 * Return and Edit Price ask for confirmation first.
 */
export default function PosLineActionBar({ disabled }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const [popup, setPopup] = useState(null)   // { key, rowKey }

  const line = findCartItemByKey(cartItems, selectedRowKey) ?? cartItems[cartItems.length - 1]

  const ask = (key) => {
    const name = line.description
    if (key === 'return') {
      return posConfirm({
        title: 'Return this item?',
        message: `${name} will be added as a return (qty ${-(Math.abs(Number(line.qty)) || 1)}).`,
        confirmLabel: 'Return', cancelLabel: 'Cancel', danger: true,
      })
    }
    return posConfirm({
      title: 'Override the price?',
      message: `Change the selling price of ${name} (now ${fmt3(line.unitPriceGross ?? line.unitPrice)}).`,
      confirmLabel: 'Edit Price', cancelLabel: 'Cancel',
    })
  }

  const run = async (action) => {
    const rowKey = getCartRowKey(line)
    usePosStore.setState({ selectedRowKey: rowKey })
    if (action.confirm && !(await ask(action.key))) return
    if (action.key === 'return') {
      updateLine(rowKey, { qty: -(Math.abs(Number(line.qty)) || 1) })
      usePosStore.setState({ returnMode: true })
      return
    }
    setPopup({ key: action.key, rowKey })
  }

  const close = closeAndFocusBarcode(() => setPopup(null))
  const popupLine = popup && findCartItemByKey(cartItems, popup.rowKey)

  return (
    <>
      <div className="ph-linebar" role="toolbar" aria-label="Line actions">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button key={action.key} className="ph-linebar-btn" disabled={disabled || !line} onClick={() => run(action)}>
              <Icon size={20} strokeWidth={1.8} />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>

      {popup?.key === 'price'    && <PriceChangeModal rowKey={popup.rowKey} onClose={close} />}
      {popup?.key === 'discount' && <DiscountModal rowKey={popup.rowKey} onClose={close} />}
      {popup?.key === 'qty' && popupLine && <QtyWheelModal item={popupLine} onClose={close} />}
    </>
  )
}
