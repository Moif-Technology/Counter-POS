import { useEffect, useState } from 'react'
import { Hash } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { findCartItemByKey, getCartRowKey } from '../lib/cartLine'
import { fmtQty } from '../lib/utils'
import { applyAmountKey, useAmountNumpadKeyboard } from '../lib/posNumpadKeys'
import Modal from '../components/common/Modal'
import WheelPicker from '../components/common/WheelPicker'
import Numpad from '../components/common/Numpad'

const MAX_QTY = 999
const WHEEL_VALUES = Array.from({ length: MAX_QTY }, (_, i) => i + 1)

/**
 * Quantity change for one cart line:
 *   left  — NEW QTY scroll wheel (a typed decimal shows on its centre row), Current Qty
 *   right — the common number keypad, Done / Cancel
 * The wheel, the keypad and a physical keyboard stay in sync. Pass `item` (a cart line);
 * without it the selected line is used.
 */
export default function QtyWheelModal({ item, onClose }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const rowKey   = item ? getCartRowKey(item) : selectedRowKey
  const liveItem = findCartItemByKey(cartItems, rowKey) || item
  const current  = Math.abs(Number(liveItem?.qty)) || 1
  const isReturn = Number(liveItem?.qty) < 0

  const [text, setText]   = useState(() => fmtQty(current))
  const [fresh, setFresh] = useState(true)   // first keypad key replaces the shown qty
  const qty = parseFloat(text) || 0
  const valid = qty > 0 && qty <= MAX_QTY
  // A typed qty that isn't a whole number on the wheel (e.g. 2.5, or empty after C) shows over its centre row.
  const typedOffWheel = text === '' || !(Number.isInteger(Number(text)) && !text.includes('.'))

  // Take focus off the POS screen behind, so keyboard keys come to this popup.
  useEffect(() => { document.activeElement?.blur?.() }, [])

  const type = (k) => {
    setText(v => applyAmountKey(fresh && k !== 'C' ? '' : v, k).slice(0, 7))
    setFresh(false)
  }
  const fromWheel = (v) => { setText(String(v)); setFresh(true) }

  const apply = () => {
    if (!liveItem || !valid) return
    updateLine(rowKey, { qty: isReturn ? -qty : qty })
    onClose()
  }

  // Physical keyboard: digits, '.', Backspace, Enter
  useAmountNumpadKeyboard((fn) => { setText(v => fn(fresh ? '' : v).slice(0, 7)); setFresh(false) }, { onEnter: apply })

  if (!liveItem) return null

  return (
    <Modal onClose={onClose} icon={Hash} kicker={isReturn ? 'Return Quantity' : 'Quantity Change'} title={liveItem.description} width={600}>
      <div className="ph-qtyw">
        <div className="ph-qtyw-left">
          <span className="ph-qtyw-label">NEW QTY</span>
          <div className="ph-qtyw-wheel">
            <WheelPicker values={WHEEL_VALUES} value={qty} onChange={fromWheel} itemHeight={44} />
            {typedOffWheel && <div className="ph-qtyw-typed">{text || '_'}</div>}
          </div>

          <div className="ph-qtyw-field">
            <span>Current Qty</span>
            <b>{fmtQty(current)}</b>
          </div>
        </div>

        <div className="ph-qtyw-right">
          <Numpad onKey={type} showDot showClear showBackspace={false} btnHeight={50} fontSize={18} gap={8} />
          <div className="ph-qtyw-foot">
            <button type="button" className="ph-qtyw-btn is-primary" onClick={apply} disabled={!valid}>Done</button>
            <button type="button" className="ph-qtyw-btn is-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
