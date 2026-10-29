import { useState } from 'react'
import {
  Banknote, CreditCard, AlertCircle, CheckCircle2, Printer, FileText,
  CalendarRange, ListChecks, Wallet, Loader2,
} from 'lucide-react'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'
import DateRangePicker from '../components/common/DateRangePicker'
import { fmt3 } from '../lib/utils'
import { CREDIT_SETTLEMENT_PAY_MODES, PM, normalizePaymentMode } from '../lib/paymentModes'
import './CreditReceiptVoucher.css'

/*
 * Receipt Voucher — settle a credit customer's outstanding balance.
 * Customer + OS Balance, Cash / Credit Card, Amount Paid → Balance, numpad,
 * print / summary / details shortcuts and the Settlement button.
 */
const PAY_ICONS = { [PM.CASH]: Banknote, [PM.CREDITCARD]: CreditCard }
const PAY_LABELS = { [PM.CASH]: 'Cash', [PM.CREDITCARD]: 'Credit Card' }

export default function CreditReceiptVoucher({
  customer, osBalance, billCount, loadingBills,
  amountStr, onAmountKey, payMode, setPayMode,
  saving, error, success, onSettle,
  onPrintBills, onPrintOs, onSummary, onDetails,
}) {
  const paid = parseFloat(amountStr) || 0
  const balance = osBalance - paid
  const actions = [
    { label: 'Print Outstanding Bills', icon: Printer, onClick: onPrintBills },
    { label: 'Print OS Balance',        icon: Wallet, onClick: onPrintOs },
    { label: 'Receipt Summary',         icon: CalendarRange, onClick: onSummary },
    { label: 'Receipt Details',         icon: ListChecks, onClick: onDetails },
  ]

  return (
    <div className="crv">
      <div className="crv-left">
        <div className="crv-cust">
          <div className="crv-cust-head">
            <span className="crv-code">{customer?.customerCode}</span>
            {billCount > 0 && <small>{billCount} open bill{billCount !== 1 ? 's' : ''}</small>}
          </div>
          <b className="crv-name">{customer?.customerName}</b>
          <div className={`crv-os${osBalance > 0 ? ' is-due' : ''}`}>
            <span>OS Balance</span>
            <b>{loadingBills ? <Loader2 size={20} className="crv-spin" /> : fmt3(osBalance)}</b>
          </div>
        </div>

        <div className="crv-pay">
          {CREDIT_SETTLEMENT_PAY_MODES.map(m => {
            const Icon = PAY_ICONS[m.key]
            return (
              <button key={m.key} type="button" className={payMode === m.key ? 'is-on' : ''} onClick={() => setPayMode(m.key)}>
                <Icon size={18} /> {PAY_LABELS[m.key] ?? m.label}
              </button>
            )
          })}
        </div>

        <div className="crv-amt is-active">
          <span>Amount Paid</span>
          <b>{amountStr || '0'}</b>
        </div>
        <div className={`crv-amt${balance < 0 ? ' is-over' : ''}`}>
          <span>Balance</span>
          <b>{fmt3(balance)}</b>
        </div>

        {error && <div className="crv-msg is-error"><AlertCircle size={15} /> {error}</div>}
        {success && (
          <div className="crv-msg is-ok">
            <CheckCircle2 size={15} />
            <span>Settled — RCV #{success.transactionNo} · Paid {fmt3(success.amount)} ({normalizePaymentMode(success.paymentMode)}) · O/S now {fmt3(success.remainingOs)}</span>
          </div>
        )}

        <div className="crv-actions">
          {actions.map(a => (
            <button key={a.label} type="button" onClick={a.onClick}><a.icon size={16} /> {a.label}</button>
          ))}
        </div>
      </div>

      <div className="crv-right">
        <div className="crv-pad">
          <Numpad onKey={onAmountKey} showDot showClear showBackspace fontSize={20} gap={8} />
        </div>
        <button type="button" className="crv-settle" disabled={saving || loadingBills || !paid} onClick={onSettle}>
          {saving ? <><Loader2 size={18} className="crv-spin" /> Settling…</> : <><FileText size={18} /> Settlement</>}
        </button>
      </div>
    </div>
  )
}

const today = () => {
  const d = new Date(), p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* Receipt Summary → pick From / To and print. */
export function ReceiptSummaryDates({ onPrint, onClose }) {
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const print = async () => {
    setBusy(true); setError(null)
    try { await onPrint(from, to); onClose() } catch (e) { setError(e.message ?? String(e)) } finally { setBusy(false) }
  }

  return (
    <Modal onClose={onClose} icon={CalendarRange} kicker="Receipt Summary" title="Select Date Range" width={460} zIndex={1100}>
      <div className="crv-range">
        <DateRangePicker label="Date range" from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
        {error && <div className="crv-msg is-error"><AlertCircle size={15} /> {error}</div>}
      </div>
      <div className="crv-range-foot">
        <button type="button" className="crv-cancel" onClick={onClose}>Close</button>
        <button type="button" className="crv-ok" disabled={busy} onClick={print}>
          {busy ? <Loader2 size={16} className="crv-spin" /> : <Printer size={16} />} Print
        </button>
      </div>
    </Modal>
  )
}
