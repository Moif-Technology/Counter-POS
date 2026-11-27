import { useState } from 'react'
import { Repeat2, BadgePercent, Pencil, Trash2 } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { findCartItemByKey, getCartRowKey } from '../../../lib/cartLine'
import { fmt3 } from '../../../lib/utils'
import { posConfirm } from '../../../lib/posNotify'
import { closeAndFocusBarcode } from '../../../lib/posFocus'
import PriceChangeModal from '../../../modals/PriceChangeModal'
import DiscountModal from '../../../modals/DiscountModal'
import { requireApproval } from '../../../lib/supervisorApproval'

// `confirm` actions are sensitive: the cashier must confirm before they run.
// `approval`: needs the role permission, else a supervisor code + PIN (the approval doubles as the confirm).
const ACTIONS = [
  { key: 'repeat',   label: 'Repeat',        icon: Repeat2 },
  { key: 'discount', label: 'Add Discount',  icon: BadgePercent, approval: 'discount' },
  { key: 'price',    label: 'Edit Price',    icon: Pencil,       confirm: true, approval: 'price_change' },
  { key: 'clear',    label: 'Delete All',    icon: Trash2,       danger: true },   // asks Yes/No before clearing
]

/**
 * Actions bar at the foot of the cart: Repeat · Add Discount · Edit Price · Delete All.
 * The first three act on the line shown in the item strip (the selected line, or the last one).
 * Edit Price and Delete All ask for confirmation first.
 */
export default function PosLineActionBar({ disabled }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const [popup, setPopup] = useState(null)   // { key, rowKey }

  const line = findCartItemByKey(cartItems, selectedRowKey) ?? cartItems[cartItems.length - 1]

  const ask = () => {
    const name = line.description
    return posConfirm({
      title: 'Override the price?',
      message: `Change the selling price of ${name} (now ${fmt3(line.unitPriceGross ?? line.unitPrice)}).`,
      confirmLabel: 'Edit Price', cancelLabel: 'Cancel',
    })
  }

  const run = async (action) => {
    const rowKey = getCartRowKey(line)
    usePosStore.setState({ selectedRowKey: rowKey })
    const allowed = action.approval ? await requireApproval(action.approval) : 'self'
    if (!allowed) return
    if (action.confirm && allowed === 'self' && !(await ask())) return
    if (action.key === 'clear') {
      const n = cartItems.length
      const ok = await posConfirm({
        title: 'Delete all items?',
        message: `Remove all ${n} scanned item${n === 1 ? '' : 's'} from this bill? This cannot be undone.`,
        confirmLabel: 'Yes, delete all', cancelLabel: 'No',
        danger: true,
      })
      if (ok) usePosStore.getState().clearAll()
      return
    }
    if (action.key === 'repeat') {
      usePosStore.getState().repeatLine(rowKey)
      return
    }
    setPopup({ key: action.key, rowKey })
  }

  const close = closeAndFocusBarcode(() => setPopup(null))

  return (
    <>
      <div className="ph-linebar" role="toolbar" aria-label="Line actions">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              className={`ph-linebar-btn${action.danger ? ' is-danger' : ''}`}
              disabled={disabled || !line}
              onClick={() => run(action)}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>

      {popup?.key === 'price'    && <PriceChangeModal rowKey={popup.rowKey} onClose={close} />}
      {popup?.key === 'discount' && <DiscountModal rowKey={popup.rowKey} onClose={close} />}
    </>
  )
}
