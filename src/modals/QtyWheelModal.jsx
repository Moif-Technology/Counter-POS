import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, SlidersHorizontal } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { findCartItemByKey, getCartRowKey } from '../lib/cartLine'
import { fmtQty } from '../lib/utils'
import Modal from '../components/common/Modal'
import WheelPicker from '../components/common/WheelPicker'

const MAX_QTY = 999
const WHEEL_VALUES = Array.from({ length: MAX_QTY }, (_, i) => i + 1)

/** Tap a line's qty: scroll the wheel or type the qty, then Apply. */
export default function QtyWheelModal({ item, onClose }) {
  const cartItems  = usePosStore(s => s.cartItems)
  const updateLine = usePosStore(s => s.updateLine)
  const rowKey   = getCartRowKey(item)
  const liveItem = findCartItemByKey(cartItems, rowKey) || item
  const isReturn = Number(liveItem.qty) < 0

  const [text, setText] = useState(() => fmtQty(Math.abs(Number(liveItem.qty)) || 1))
  const inputRef = useRef(null)
  const qty = parseFloat(text) || 0

  useEffect(() => { inputRef.current?.select() }, [])

  // Digits and one decimal point only.
  const handleType = (e) => {
    const v = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
    if (parseFloat(v) > MAX_QTY) return
    setText(v)
  }
  const step = (d) => setText(t => {
    const next = +((parseFloat(t) || 0) + d).toFixed(3)
    return next < 1 || next > MAX_QTY ? t : String(next)
  })

  const apply = () => {
    if (qty <= 0) return
    updateLine(rowKey, { qty: isReturn ? -qty : qty })
    onClose()
  }

  return (
    <Modal onClose={onClose} icon={SlidersHorizontal} kicker="Quantity" title={liveItem.description} width={380}>
      <div className="ph-qtyw">
        <div className="ph-qtyw-entry">
          <button type="button" className="ph-qtyw-step" onClick={() => step(-1)} aria-label="Decrease"><Minus size={20} /></button>
          <input
            ref={inputRef}
            className="ph-qtyw-input"
            inputMode="decimal"
            value={text}
            onChange={handleType}
            onKeyDown={(e) => { if (e.key === 'Enter') apply() }}
            aria-label="Quantity"
          />
          <button type="button" className="ph-qtyw-step" onClick={() => step(1)} aria-label="Increase"><Plus size={20} /></button>
        </div>

        <WheelPicker values={WHEEL_VALUES} value={qty} onChange={(v) => setText(String(v))} />

        <div className="ph-qtyw-foot">
          <button type="button" className="ph-qtyw-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="ph-qtyw-btn is-primary" onClick={apply} disabled={qty <= 0}>Apply</button>
        </div>
      </div>
    </Modal>
  )
}
