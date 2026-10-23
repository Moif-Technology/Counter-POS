import { useState } from 'react'
import { Hash } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { findCartItemByKey, getCartRowKey } from '../lib/cartLine'
import { fmtQty } from '../lib/utils'
import { applyAmountKey, useAmountNumpadKeyboard } from '../lib/posNumpadKeys'
import Modal from '../components/common/Modal'
import WheelPicker from '../components/common/WheelPicker'

const MAX_QTY = 999
const WHEEL_VALUES = Array.from({ length: MAX_QTY }, (_, i) => i + 1)
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.']

/**
 * Quantity change for one cart line:
 *   left  — NEW QTY scroll wheel, Current Qty underneath
 *   right — numpad to type the qty, Done / Cancel
 * Pass `item` (a cart line); without it the selected line is used.
 */
export default function QtyWheelModal({ item, onClose }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const rowKey   = item ? getCartRowKey(item) : selectedRowKey
  const liveItem = findCartItemByKey(cartItems, rowKey) || item
  const current  = Math.abs(Number(liveItem?.qty)) || 1

  const [text, setText]   = useState(() => fmtQty(current))
  const [fresh, setFresh] = useState(true)   // first key typed replaces the shown qty
  const qty = parseFloat(text) || 0
  const typedOffWheel = text !== '' && !(Number.isInteger(Number(text)) && !text.includes('.'))

  const type = (k) => {
    setText(v => applyAmountKey(fresh && k !== 'C' ? '' : v, k).slice(0, 7))
    setFresh(false)
  }
  const fromWheel = (v) => { setText(String(v)); setFresh(true) }

  const apply = () => {
    if (!liveItem || qty <= 0 || qty > MAX_QTY) return
    updateLine(rowKey, { qty: Number(liveItem.qty) < 0 ? -qty : qty })
    onClose()
  }

  // Physical keyboard: digits, '.', Backspace, Enter
  useAmountNumpadKeyboard((fn) => { setText(v => fn(fresh ? '' : v).slice(0, 7)); setFresh(false) }, { onEnter: apply })

  if (!liveItem) return null

  return (
    <Modal onClose={onClose} icon={Hash} kicker="Quantity Change" title={liveItem.description} width={600}>
      <div className="ph-qtyw">
        <div className="ph-qtyw-left">
          <span className="ph-qtyw-label">NEW QTY</span>
          <div className="ph-qtyw-wheel">
            <WheelPicker values={WHEEL_VALUES} value={qty} onChange={fromWheel} itemHeight={44} />
            {/* a typed qty that is not on the wheel (e.g. 2.5) shows over the centre row */}
            {typedOffWheel && <div className="ph-qtyw-typed">{text}</div>}
          </div>
          <div className="ph-qtyw-current">
            <span>Current Qty</span>
            <b>{fmtQty(current)}</b>
          </div>
        </div>

        <div className="ph-qtyw-right">
          <div className="ph-qtyw-keys">
            {KEYS.map(k => (
              <button key={k} type="button" className="ph-qtyw-key" onClick={() => type(k)}>{k}</button>
            ))}
          </div>
          <div className="ph-qtyw-foot">
            <button type="button" className="ph-qtyw-btn is-primary" onClick={apply} disabled={qty <= 0}>Done</button>
            <button type="button" className="ph-qtyw-btn is-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
