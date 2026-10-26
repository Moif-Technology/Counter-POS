import { useEffect, useRef, useState } from 'react'
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
 *   left  — NEW QTY scroll wheel, a New Qty box you can type into, Current Qty
 *   right — keypad, Done / Cancel
 * The wheel, the box and the keypad stay in sync. Pass `item` (a cart line);
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
  const inputRef = useRef(null)
  const qty = parseFloat(text) || 0
  const valid = qty > 0 && qty <= MAX_QTY

  // Open with the New Qty box focused and selected: typing replaces it straight away.
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const type = (k) => {
    setText(v => applyAmountKey(fresh && k !== 'C' ? '' : v, k).slice(0, 7))
    setFresh(false)
  }
  const fromWheel = (v) => { setText(String(v)); setFresh(true) }
  const fromInput = (v) => {
    if (v === '' || /^\d{0,6}(\.\d{0,3})?$/.test(v)) { setText(v); setFresh(false) }
  }

  const apply = () => {
    if (!liveItem || !valid) return
    updateLine(rowKey, { qty: isReturn ? -qty : qty })
    onClose()
  }

  // Physical keyboard when the box isn't focused (digits, '.', Backspace, Enter)
  useAmountNumpadKeyboard((fn) => { setText(v => fn(fresh ? '' : v).slice(0, 7)); setFresh(false) }, { onEnter: apply })

  if (!liveItem) return null

  return (
    <Modal onClose={onClose} icon={Hash} kicker={isReturn ? 'Return Quantity' : 'Quantity Change'} title={liveItem.description} width={600}>
      <div className="ph-qtyw">
        <div className="ph-qtyw-left">
          <span className="ph-qtyw-label">NEW QTY</span>
          <div className="ph-qtyw-wheel">
            <WheelPicker values={WHEEL_VALUES} value={qty} onChange={fromWheel} itemHeight={44} />
          </div>

          <label className="ph-qtyw-field is-new">
            <span>New Qty</span>
            <input
              ref={inputRef}
              value={text}
              onChange={e => fromInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply() } }}
              inputMode="decimal"
              placeholder="0"
              aria-label="New quantity"
            />
          </label>
          <div className="ph-qtyw-field">
            <span>Current Qty</span>
            <b>{fmtQty(current)}</b>
          </div>
        </div>

        <div className="ph-qtyw-right">
          <div className="ph-qtyw-keys">
            {KEYS.map(k => (
              <button key={k} type="button" className="ph-qtyw-key" onClick={() => { type(k); inputRef.current?.focus() }}>{k}</button>
            ))}
          </div>
          <div className="ph-qtyw-foot">
            <button type="button" className="ph-qtyw-btn is-primary" onClick={apply} disabled={!valid}>Done</button>
            <button type="button" className="ph-qtyw-btn is-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
