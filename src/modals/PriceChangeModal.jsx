import { useState } from 'react'
import { Tag, Check } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import {
  calcLineTotals,
  findCartItemByKey,
  resolveUnitPriceGross,
  resolveUnitPricesFromInput,
  unitPricePatchFromInput,
} from '../lib/cartLine'
import { fmtMoney, moneyPlaceholder, roundMoney } from '../lib/currencyFormat'
import { useAmountNumpadKeyboard } from '../lib/posNumpadKeys'
import { getGvTax } from '../lib/gvtax'
import Numpad from '../components/common/Numpad'
import Modal from '../components/common/Modal'
import { posNotifySuccess } from '../lib/posNotify'
import './PriceChangeModal.css'

export default function PriceChangeModal({ onClose, rowKey: rowKeyProp, zIndex = 1000 }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const activeKey      = rowKeyProp ?? selectedRowKey
  const item           = findCartItemByKey(cartItems, activeKey)

  const [editMode, setEditMode] = useState('net')
  const [newPrice, setNewPrice] = useState('')

  // Hardware keyboard: digits / . / Backspace / Enter (handleDone is hoisted below)
  useAmountNumpadKeyboard(setNewPrice, { onEnter: () => { if (item) handleDone() } })

  if (!item) return null

  const vatPer = Number(item.vatPer) || getGvTax()
  const parsedInput = parseFloat(newPrice) || 0

  const currentGross = resolveUnitPriceGross(item)
  const currentNet = vatPer > 0
    ? fmtMoney(currentGross / (1 + vatPer / 100))
    : fmtMoney(currentGross)
  const currentLine = calcLineTotals(item)
  const currentDisc = currentLine.discountAmt

  const preview = parsedInput > 0
    ? resolveUnitPricesFromInput(editMode, parsedInput, vatPer)
    : null

  const previewLine = preview
    ? calcLineTotals({
      ...item,
      unitPrice: preview.unitPrice,
      unitPriceGross: preview.unitPriceGross,
      vatPer,
    })
    : null

  const pressKey = k => {
    if (k === 'C')  { setNewPrice(''); return }
    if (k === '⌫') { setNewPrice(v => v.slice(0, -1)); return }
    if (k === '.' && newPrice.includes('.')) return
    setNewPrice(v => v + k)
  }

  function handleDone() {
    const patch = unitPricePatchFromInput(editMode, parsedInput, vatPer)
    if (!patch) return
    updateLine(activeKey, {
      ...patch,
      discount: item.discount ?? 0,
      discountMode: item.discountMode ?? 'pct',
      ...(item.discountMode === 'amt' ? { discountAmt: Number(item.discountAmt) || 0 } : {}),
    })
    posNotifySuccess(`${item.description} — price updated`, { title: 'Price Change', duration: 1500 })
    onClose()
  }

  const switchMode = mode => {
    if (mode === editMode) return
    if (parsedInput > 0) {
      const cur = resolveUnitPricesFromInput(editMode, parsedInput, vatPer)
      setNewPrice(mode === 'net' ? String(cur.unitNet) : fmtMoney(cur.unitPriceGross))
    }
    setEditMode(mode)
  }

  const vatAmt   = preview ? roundMoney(preview.unitPriceGross - preview.unitPrice) : 0
  const otherLbl = editMode === 'net' ? 'Price with VAT' : 'Price ex VAT'
  const otherVal = preview ? (editMode === 'net' ? preview.unitPriceGross : preview.unitPrice) : null

  return (
    <Modal onClose={onClose} icon={Tag} kicker="Price Change" title={item.description} zIndex={zIndex} width={720}>
      <div className="pc">
        <div className="pc-left">
          <div className="pc-now">
            <div><span>Barcode</span><b className="is-mono">{item.barcode || item.productCode || '—'}</b></div>
            <div><span>Now ex VAT</span><b>{currentNet}</b></div>
            <div><span>Now incl VAT</span><b>{fmtMoney(currentGross)}</b></div>
          </div>

          <div className="pc-seg">
            <button type="button" className={editMode === 'net' ? 'is-on' : ''} onClick={() => switchMode('net')}>Ex VAT</button>
            <button type="button" className={editMode === 'gross' ? 'is-on' : ''} onClick={() => switchMode('gross')}>Incl VAT</button>
          </div>

          <div className={`pc-new${newPrice ? ' has-value' : ''}`}>
            <span>New Unit Price <em>{editMode === 'net' ? '(Ex VAT)' : '(Incl VAT)'}</em></span>
            <b>{newPrice || moneyPlaceholder()}</b>
          </div>

          <div className="pc-calc">
            <div><span>VAT %</span><b>{vatPer}</b></div>
            <div><span>VAT</span><b>{preview ? fmtMoney(vatAmt) : '—'}</b></div>
            <div className="is-main"><span>{otherLbl}</span><b>{otherVal != null ? fmtMoney(otherVal) : '—'}</b></div>
          </div>

          {previewLine && (
            <div className="pc-line">
              Line total <b>{fmtMoney(currentLine.lineTotal)}</b> → <b className="is-new">{fmtMoney(previewLine.lineTotal)}</b>
              {currentDisc > 0 && <small> · discount kept</small>}
            </div>
          )}
        </div>

        <div className="pc-pad">
          <Numpad onKey={pressKey} showDot showClear showBackspace fontSize={20} gap={8} />
        </div>
      </div>

      <div className="pc-foot">
        <button type="button" className="pc-cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="pc-ok" onClick={handleDone} disabled={!preview}><Check size={17} /> Update Price</button>
      </div>
    </Modal>
  )
}
