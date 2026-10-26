import { useEffect, useState } from 'react'
import { Hash, Minus, Plus } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { calcLineTotals, findCartItemByKey, getCartRowKey } from '../lib/cartLine'
import { fmt3, fmtQty } from '../lib/utils'
import { applyAmountKey, useAmountNumpadKeyboard } from '../lib/posNumpadKeys'
import Modal from '../components/common/Modal'
import WheelPicker from '../components/common/WheelPicker'

const MAX_QTY = 999
const WHEEL_VALUES = Array.from({ length: MAX_QTY }, (_, i) => i + 1)
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'C']   // same order as the home keypad
const QUICK = [1, 2, 3, 5, 6, 10, 12, 24]

/**
 * Quantity change for one cart line.
 *   left  — item info (price, current qty), NEW QTY wheel with − / +,
 *           quick picks and the new line total (live)
 *   right — keypad to type the qty, "Set qty" / Cancel
 * Pass `item` (a cart line); without it the selected line is used.
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
  const [fresh, setFresh] = useState(true)   // first key typed replaces the shown qty
  const qty = parseFloat(text) || 0
  const valid = qty > 0 && qty <= MAX_QTY
  const typedOffWheel = text !== '' && !(Number.isInteger(Number(text)) && !text.includes('.'))

  const setQty = (n) => { setText(fmtQty(Math.min(MAX_QTY, Math.max(1, n)))); setFresh(true) }
  const step = (d) => setQty(Math.round((qty || 0) + d))
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

  // Physical keyboard: digits, '.', Backspace, Enter. Take focus off the POS screen behind
  // first, otherwise the keys would type there instead of into this qty
  useEffect(() => {
    // (also a focused key such as Qty Chan — Enter would press it again)
    document.activeElement?.blur?.()
  }, [])
  useAmountNumpadKeyboard((fn) => { setText(v => fn(fresh ? '' : v).slice(0, 7)); setFresh(false) }, { onEnter: apply })

  if (!liveItem) return null

  const price    = liveItem.unitPriceGross ?? liveItem.unitPrice
  const oldTotal = calcLineTotals(liveItem).lineTotal
  const newTotal = valid ? calcLineTotals({ ...liveItem, qty: isReturn ? -qty : qty }).lineTotal : null
  const changed  = valid && qty !== current

  return (
    <Modal onClose={onClose} icon={Hash} kicker={isReturn ? 'Return Quantity' : 'Quantity Change'} title={liveItem.description} width={640}>
      <div className="ph-qtyw">
        <div className="ph-qtyw-left">
          {/* What is being changed */}
          <div className="ph-qtyw-info">
            <div><span>Price</span><b>{fmt3(price)}</b></div>
            <div><span>Current qty</span><b>{fmtQty(current)}</b></div>
            <div><span>Line total</span><b>{fmt3(oldTotal)}</b></div>
          </div>

          {/* New qty: − wheel + */}
          <span className="ph-qtyw-label">NEW QTY</span>
          <div className="ph-qtyw-stepper">
            <button type="button" className="ph-qtyw-step" onClick={() => step(-1)} disabled={qty <= 1} aria-label="One less">
              <Minus size={22} />
            </button>
            <div className="ph-qtyw-wheel">
              <WheelPicker values={WHEEL_VALUES} value={qty} onChange={fromWheel} itemHeight={42} />
              {/* a typed qty that is not on the wheel (e.g. 2.5) shows over the centre row */}
              {typedOffWheel && <div className="ph-qtyw-typed">{text}</div>}
            </div>
            <button type="button" className="ph-qtyw-step" onClick={() => step(1)} disabled={qty >= MAX_QTY} aria-label="One more">
              <Plus size={22} />
            </button>
          </div>

          {/* Quick picks */}
          <div className="ph-qtyw-quick">
            {QUICK.map(n => (
              <button key={n} type="button" className={`ph-qtyw-chip${qty === n ? ' is-on' : ''}`} onClick={() => setQty(n)}>{n}</button>
            ))}
          </div>

          {/* Live result */}
          <div className={`ph-qtyw-result${changed ? ' is-changed' : ''}`}>
            <span>New line total</span>
            <b>{newTotal == null ? '—' : fmt3(newTotal)}</b>
          </div>
        </div>

        <div className="ph-qtyw-right">
          <div className="ph-qtyw-keys">
            {KEYS.map(k => (
              <button key={k} type="button" className={`ph-qtyw-key ui-key${k === 'C' ? ' is-clear' : ''}`} onClick={() => type(k)}>{k}</button>
            ))}
          </div>
          <div className="ph-qtyw-foot">
            <button type="button" className="ph-qtyw-btn is-primary" onClick={apply} disabled={!valid}>
              {valid ? `Set qty to ${fmtQty(qty)}` : 'Enter a qty'}
            </button>
            <button type="button" className="ph-qtyw-btn is-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
