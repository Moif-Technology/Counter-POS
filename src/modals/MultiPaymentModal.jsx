import { useEffect, useRef, useState } from 'react'
import { Layers, CornerDownLeft } from 'lucide-react'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'
import { usePosStore } from '../store/posStore'
import { PM } from '../lib/paymentModes'
import { fmtMoney, moneyInputRegex, roundMoney } from '../lib/currencyFormat'
import './MultiPaymentModal.css'

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

/** Existing splits → field values (amounts per mode, voucher number). */
function fieldsFromSplits(splits) {
  const f = { voucherNo: '', voucher: '', card: '', online: '', cash: '' }
  for (const s of Array.isArray(splits) ? splits : []) {
    const amt = num(s.amount)
    if (s.payMode === 'VOUCHER') { f.voucher = String(roundMoney(num(f.voucher) + amt)); if (s.refNo) f.voucherNo = s.refNo }
    else if (s.payMode === PM.CREDITCARD) f.card = String(roundMoney(num(f.card) + amt))
    else if (s.payMode === 'ONLINE') f.online = String(roundMoney(num(f.online) + amt))
    else f.cash = String(roundMoney(num(f.cash) + amt))
  }
  return f
}

/**
 * Multi Pay — pay one bill with a gift voucher, a credit card and cash:
 *   Bill Amount · Scan Gift Voucher · Gift Voucher · Credit Card · Cash Paid · Balance Amount
 * with a keypad and Enter / Cancel (same contents as the old desktop screen). Cash may be more than what is left: the
 * extra is change. Saves splits (VOUCHER / CREDITCARD / CASH) that add up to
 * the bill, exactly as before.
 *
 * Props: billAmount (default: the bill total), initialSplits, onConfirm(splits)
 * for standalone use (Delivery Settlement); otherwise the POS bill is updated.
 */
export default function MultiPaymentModal({ onClose, billAmount, initialSplits, onConfirm }) {
  const storeNet  = usePosStore(s => s.netAmount)
  const bill      = roundMoney(billAmount != null ? num(billAmount) : storeNet)
  const standalone = typeof onConfirm === 'function'

  const [f, setF] = useState(() => fieldsFromSplits(initialSplits ?? (standalone ? [] : usePosStore.getState().paymentSplits)))
  const [focus, setFocus] = useState('voucherNo')
  const [error, setError] = useState('')
  const refs = { voucherNo: useRef(), voucher: useRef(), card: useRef(), online: useRef(), cash: useRef() }

  // Cursor starts in Scan Gift Voucher, so a scan (or typing) goes straight in.
  useEffect(() => { refs.voucherNo.current?.focus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasOnline = num(f.online) > 0   // only shown when an earlier split used Online

  const FIELDS = [
    { key: 'voucherNo', label: 'Scan Gift Voucher', text: true, placeholder: 'Scan or type voucher no.' },
    { key: 'voucher',   label: 'Gift Voucher' },
    { key: 'card',      label: 'Credit Card' },
    ...(hasOnline ? [{ key: 'online', label: 'Online' }] : []),
    { key: 'cash',      label: 'Cash Paid' },
  ]

  const nonCash = roundMoney(num(f.voucher) + num(f.card) + num(f.online))
  const tendered = roundMoney(nonCash + num(f.cash))
  const balance = roundMoney(bill - tendered)          // > 0 still due, < 0 change
  const covered = balance <= 0.009
  const tooMuchNonCash = nonCash > bill + 0.009

  const setField = (key, value) => { setError(''); setF(prev => ({ ...prev, [key]: value })) }

  const typeMoney = (key, value) => {
    if (value === '' || moneyInputRegex().test(value)) setField(key, value)
  }

  // Keypad types into the focused field (C clears it, ⌫ deletes one character)
  const pressKey = (k) => {
    const cur = f[focus] ?? ''
    if (k === 'C') { setField(focus, ''); return }
    if (k === '⌫') { setField(focus, cur.slice(0, -1)); return }
    if (FIELDS.find(x => x.key === focus)?.text) setField(focus, cur + k)
    else typeMoney(focus, cur + k)
    refs[focus].current?.focus()
  }

  const goNext = (key) => {
    const i = FIELDS.findIndex(x => x.key === key)
    const next = FIELDS[i + 1]
    if (next) { setFocus(next.key); refs[next.key].current?.focus(); refs[next.key].current?.select?.() }
    else confirm()
  }

  const confirm = () => {
    setError('')
    if (tendered <= 0) { setError('Enter the voucher, card or cash amount.'); return }
    if (num(f.voucher) > 0 && !f.voucherNo.trim()) { setError('Scan or type the gift voucher number.'); setFocus('voucherNo'); refs.voucherNo.current?.focus(); return }
    if (tooMuchNonCash) { setError(`Voucher + card can't be more than the bill (${fmtMoney(bill)}).`); return }
    if (!covered) { setError(`Short by ${fmtMoney(balance)} — add cash or card.`); return }

    const cashPart = roundMoney(bill - nonCash)          // cash kept on the bill; the rest is change
    const splits = [
      num(f.voucher) > 0 && { payMode: 'VOUCHER',     amount: roundMoney(num(f.voucher)), tip: 0, refNo: f.voucherNo.trim() },
      num(f.card)    > 0 && { payMode: PM.CREDITCARD, amount: roundMoney(num(f.card)),    tip: 0, refNo: '' },
      num(f.online)  > 0 && { payMode: 'ONLINE',      amount: roundMoney(num(f.online)),  tip: 0, refNo: '' },
      cashPart       > 0 && { payMode: PM.CASH,       amount: cashPart,                   tip: 0, refNo: '' },
    ].filter(Boolean)

    if (standalone) { onConfirm(splits); onClose?.(); return }
    const st = usePosStore.getState()
    st.setPaymentMode(PM.MULTIPAYMENT)
    st.setPaymentSplits(splits)
    st.setPayment(tendered)                               // paid = everything handed over → balance = change
    onClose?.()
  }

  const balanceLabel = balance < -0.009 ? 'Change' : 'Balance Amount'

  return (
    <Modal onClose={onClose} icon={Layers} kicker="Settlement" title="Multi Pay" width={760}>
      <div className="mpm">
        {/* ── Fields ── */}
        <div className="mpm-left">
          <div className="mpm-row is-readonly">
            <span className="mpm-label">Bill Amount</span>
            <div className="mpm-box mpm-bill">{fmtMoney(bill)}</div>
          </div>

          {FIELDS.map(({ key, label, text, placeholder }) => (
            <label key={key} className={`mpm-row${focus === key ? ' is-focus' : ''}`}>
              <span className="mpm-label">{label}</span>
              <input
                ref={refs[key]}
                className="mpm-box"
                value={f[key]}
                placeholder={placeholder ?? '0.00'}
                inputMode={text ? undefined : 'decimal'}
                onFocus={() => setFocus(key)}
                onChange={e => (text ? setField(key, e.target.value) : typeMoney(key, e.target.value))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); goNext(key) } }}
                style={{ textAlign: text ? 'left' : 'right' }}
              />
            </label>
          ))}

          <div className={`mpm-row is-readonly mpm-balance${balance < -0.009 ? ' is-change' : covered ? ' is-done' : ''}`}>
            <span className="mpm-label">{balanceLabel}</span>
            <div className="mpm-box">{fmtMoney(Math.abs(balance))}</div>
          </div>

          {error && <div className="mpm-error">{error}</div>}
        </div>

        {/* ── Keypad ── */}
        <div className="mpm-right">
          <Numpad onKey={pressKey} showDot showClear showBackspace={false} btnHeight={50} fontSize={18} gap={8} />
          <div className="mpm-foot">
            <button type="button" className="mpm-btn is-primary" onClick={confirm} disabled={!covered || tendered <= 0}>
              <CornerDownLeft size={17} /> Enter
            </button>
            <button type="button" className="mpm-btn is-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
