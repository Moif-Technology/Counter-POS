import { useState } from 'react'
import { Check } from 'lucide-react'
import { moneyPlaceholder } from '../lib/currencyFormat'
import { applyAmountKey, useAmountNumpadKeyboard } from '../lib/posNumpadKeys'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'
import './GroupPriceModal.css'

/*
 * Group price — tapped a price-entry group on the Groups tab: type the unit
 * price (incl. VAT) and Done adds the line to the bill. Keyboard: digits, ., ⌫, Enter.
 */
export default function GroupPriceModal({ group, qty = 1, onDone, onClose }) {
  const [price, setPrice] = useState('')
  const value = parseFloat(price) || 0

  const done = () => { if (value > 0) onDone(value) }
  useAmountNumpadKeyboard(setPrice, { onEnter: done })

  return (
    <Modal onClose={onClose} header={false} width={360} zIndex={1100}>
      <div className="gp">
        <div className="gp-head">
          <span>Group</span>
          <h3>{group?.groupDescription ?? '—'}</h3>
          {qty !== 1 && <em>Qty × {qty}</em>}
        </div>

        <div className={`gp-price${price ? ' has-value' : ''}`}>
          <span>Unit Price</span>
          <b>{price || moneyPlaceholder()}</b>
        </div>

        <Numpad onKey={k => setPrice(v => applyAmountKey(v, k))} showDot showClear showBackspace btnHeight={56} fontSize={20} gap={8} />

        <div className="gp-btns">
          <button type="button" className="gp-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="gp-done" onClick={done} disabled={value <= 0}><Check size={18} /> Done</button>
        </div>
      </div>
    </Modal>
  )
}
