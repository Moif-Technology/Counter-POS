import { useEffect, useMemo, useRef, useState } from 'react'
import { Percent, Check } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { sumBillTotals } from '../lib/cartLine'
import { fmtMoney, roundMoney } from '../lib/currencyFormat'
import {
  billDiscountInitialState,
  previewBillDiscount,
  resolveDiscountOnTaxable,
} from '../lib/discountCalc'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'
import './BillDiscountModal.css'

/*
 * Bill Discount — Net Bill / Taxable / Tax cards, Before VAT vs After VAT,
 * 5 · 10 · 25 % presets, Discount % or Amount entry on the numpad, live totals.
 *
 * The store always keeps the discount on the taxable amount. In "After VAT"
 * (round-off style) the amount typed is off the bill total incl. VAT and is
 * converted back to taxable before saving.
 */
const PRESETS = [5, 10, 25]

export default function BillDiscountModal({ onClose }) {
  const cartItems       = usePosStore(s => s.cartItems)
  const billNo          = usePosStore(s => s.billNo)
  const billDiscountAmt = usePosStore(s => s.billDiscountAmt)
  const setBillDiscount = usePosStore(s => s.setBillDiscount)

  const totals = useMemo(() => sumBillTotals(cartItems ?? []), [cartItems])
  const base = totals.subTotal
  const gross = totals.gross
  const initial = useMemo(() => billDiscountInitialState(cartItems, billDiscountAmt), [cartItems, billDiscountAmt])

  const [vat, setVat]         = useState('before')      // 'before' | 'after'
  const [mode, setMode]       = useState(initial.mode)  // field being typed: 'pct' | 'amt'
  const [discPct, setDiscPct] = useState(initial.discPct)
  const [discAmt, setDiscAmt] = useState(initial.discAmt)
  const fresh = useRef(true)                            // next key replaces the field

  // Amount typed in "After VAT" is off the gross; scale it back to taxable.
  const factor = vat === 'after' && base !== 0 ? Math.abs(gross / base) : 1
  const taxableAmtStr = mode === 'amt' ? String((parseFloat(discAmt) || 0) / factor) : discAmt
  const preview = previewBillDiscount(cartItems, mode, discPct, taxableAmtStr)

  const shownPct = mode === 'pct' ? discPct : (preview.pct ? String(preview.pct) : '')
  const shownAmt = mode === 'amt' ? discAmt : (preview.discountAmt ? fmtMoney(roundMoney(preview.discountAmt * factor)) : '')
  const maxAmt = Math.abs(vat === 'after' ? gross : base)

  const pickField = m => { setMode(m); fresh.current = true }
  const switchVat = v => {
    if (v === vat) return
    setVat(v); setDiscAmt(''); setMode('pct'); setDiscPct(shownPct); fresh.current = true
  }

  const handleKey = k => {
    const cur = fresh.current ? '' : (mode === 'pct' ? discPct : discAmt)
    const set = mode === 'pct' ? setDiscPct : setDiscAmt
    fresh.current = false
    if (k === 'C') { set(''); return }
    if (k === '⌫') { set(cur.slice(0, -1)); return }
    if (k === '.' && cur.includes('.')) return
    const next = cur === '' && k === '.' ? '0.' : cur + k
    if (parseFloat(next) > (mode === 'pct' ? 100 : maxAmt)) return
    set(next)
  }

  const applyPreset = p => { setMode('pct'); setDiscPct(String(p)); setDiscAmt(''); fresh.current = true }

  const handleApply = () => {
    const { discountAmt } = resolveDiscountOnTaxable(base, mode, discPct, taxableAmtStr)
    setBillDiscount(discountAmt)
    onClose()
  }

  // Hardware keyboard: digits / . / Backspace / Enter.
  const keyRef = useRef(null)
  useEffect(() => { keyRef.current = { handleKey, handleApply } })
  useEffect(() => {
    const onKey = e => {
      if (/^[0-9.]$/.test(e.key)) keyRef.current.handleKey(e.key)
      else if (e.key === 'Backspace') keyRef.current.handleKey('⌫')
      else if (e.key === 'Enter') keyRef.current.handleApply()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!cartItems.length) return null

  const hasDisc = preview.discountAmt > 0

  return (
    <Modal onClose={onClose} icon={Percent} kicker={`Bill # ${billNo || '—'}`} title="Bill Discount" width={780}>
      <div className="bd">
        <div className="bd-sum">
          <div className="is-main"><span>Net Bill</span><b>{fmtMoney(gross)}</b></div>
          <div><span>Taxable</span><b>{fmtMoney(base)}</b></div>
          <div><span>Tax</span><b>{fmtMoney(totals.taxAmt)}</b></div>
        </div>

        <div className="bd-body">
          <div className="bd-left">
            <div className="bd-seg">
              <button type="button" className={vat === 'before' ? 'is-on' : ''} onClick={() => switchVat('before')}>
                Before VAT<small>from Taxable</small>
              </button>
              <button type="button" className={vat === 'after' ? 'is-on' : ''} onClick={() => switchVat('after')}>
                After VAT<small>Round off</small>
              </button>
            </div>

            <div className="bd-presets">
              {PRESETS.map(p => (
                <button key={p} type="button" className={mode === 'pct' && Number(discPct) === p ? 'is-on' : ''} onClick={() => applyPreset(p)}>
                  {p}%
                </button>
              ))}
            </div>

            <button type="button" className={`bd-field${mode === 'pct' ? ' is-active' : ''}`} onClick={() => pickField('pct')}>
              <span>Discount %</span>
              <b>{shownPct || '0'}<i>%</i></b>
            </button>
            <button type="button" className={`bd-field${mode === 'amt' ? ' is-active' : ''}`} onClick={() => pickField('amt')}>
              <span>Discount Amount{vat === 'after' && <em> incl. VAT</em>}</span>
              <b>{shownAmt || fmtMoney(0)}</b>
            </button>

            <div className={`bd-result${hasDisc ? ' has-disc' : ''}`}>
              <div><span>Net Total After Disc</span><b>{fmtMoney(preview.grossTotal)}</b></div>
              <div><span>Taxable After Disc</span><em>{fmtMoney(preview.netTaxable)}</em></div>
            </div>
          </div>

          <div className="bd-pad">
            <Numpad onKey={handleKey} showDot showClear showBackspace fontSize={20} gap={8} />
          </div>
        </div>
      </div>

      <div className="bd-foot">
        {hasDisc && <span className="bd-save">You save <b>{fmtMoney(roundMoney(gross - preview.grossTotal))}</b></span>}
        <button type="button" className="bd-cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="bd-apply" onClick={handleApply}><Check size={16} /> Apply Discount</button>
      </div>
    </Modal>
  )
}
