import { useCallback, useEffect, useState } from 'react'
import { X, ClipboardList, Printer, RefreshCw, CornerDownLeft } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { api } from '../lib/api'
import { fmt3 } from '../lib/utils'
import { fmtMoney, moneyPlaceholder } from '../lib/currencyFormat'
import { printCounterReport } from '../lib/printCounterReport'
import { getReceiptPrintMetaFromStore, resolveCashierName } from '../lib/receiptPrintTheme'
import { posConfirm, posNotifyWarning, posNotifySuccess } from '../lib/posNotify'
import { useOfflineStore } from '../lib/offlineCache'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'
import { applyAmountKey } from '../lib/posNumpadKeys'
import './CounterReadingModal.css'
import { DENOMS } from '../lib/denoms'

const COLLECTED = 'collected'   // active field = Collected Amount
const CARD      = 'card'        // active field = Card Collected
const initCounts = () => Object.fromEntries(DENOMS.map(d => [d.label, '']))

export default function CounterReadingModal({ onClose, summaryFn = null, closeFn = null }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const cashier     = usePosStore(s => s.cashier)
  const [summary,     setSummary]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [submitting,  setSubmitting]  = useState(null) // 'X' | 'Z' | null
  const [closeResult, setCloseResult] = useState(null) // last close response

  const [counts,       setCounts]      = useState(initCounts)
  const [activeDenom,  setActiveDenom] = useState('1000')
  const [manualInput,  setManualInput] = useState('')
  const [cardInput,    setCardInput]   = useState('')

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const doSummary = summaryFn ?? (() => api.counterPos.counterSummary(counterNo, accessToken))
      const data = await doSummary()
      setSummary(data)
    } catch (err) {
      setError(err.message ?? 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }, [counterNo, accessToken, summaryFn])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  useEffect(() => {
    const onKey = e => {
      // Don't close if user is typing in an input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const denomTotal = DENOMS.reduce((sum, d) => {
    return sum + d.value * (parseFloat(counts[d.label]) || 0)
  }, 0)

  // Manual input takes priority over denomination total
  const collectedAmount = manualInput !== '' ? (parseFloat(manualInput) || 0) : denomTotal

  const cashToCollect  = Number(summary?.cashToBeCollected) || 0
  const cashDifference = collectedAmount - cashToCollect

  // Card machine batch total = card sales + card tips + credit received by card
  const cardToCollect  = (Number(summary?.totalCard) || 0) + (Number(summary?.totalCardTip) || 0) + (Number(summary?.creditReceiptCard) || 0)
  const collectedCard  = parseFloat(cardInput) || 0
  const cardDifference = Math.round((collectedCard - cardToCollect) * 1000) / 1000

  // Numpad types into the active note count, Collected Amount, or Card Collected
  const handleKey = k => {
    if (activeDenom === COLLECTED) {
      setManualInput(m => applyAmountKey(m, k))   // typing starts a fresh amount; empty = use notes total
      return
    }
    if (activeDenom === CARD) {
      setCardInput(m => applyAmountKey(m, k))
      return
    }
    if (k === '.') return
    if (k === 'C') { setCounts(c => ({ ...c, [activeDenom]: '' })); return }
    if (k === '⌫') { setCounts(c => ({ ...c, [activeDenom]: c[activeDenom].slice(0, -1) })); return }
    setCounts(c => ({ ...c, [activeDenom]: c[activeDenom] + k }))
  }

  const nextDenom = () => {
    if (activeDenom === COLLECTED) { setActiveDenom(CARD); return }
    const idx = DENOMS.findIndex(d => d.label === activeDenom)
    if (idx >= 0) setActiveDenom(idx < DENOMS.length - 1 ? DENOMS[idx + 1].label : COLLECTED)
  }

  const handleReport = async (reportType) => {
    if (submitting || loading) return
    // Bills saved offline on this till are not on the server yet.
    if (!closeFn) {
      const { pending, failed } = useOfflineStore.getState()
      if (reportType === 'Z' && pending.length) {
        posNotifyWarning(`Sync ${pending.length} pending offline bill${pending.length > 1 ? 's' : ''} first (status button in the header).`, { title: 'Z-Report' })
        return
      }
      const unsynced = pending.length + failed.length
      if (unsynced) {
        const ok = await posConfirm({
          title: `${reportType}-Report`,
          message: `${unsynced} offline bill${unsynced > 1 ? 's are' : ' is'} not synced and won't be in this report. Continue?`,
          confirmLabel: 'Continue',
          cancelLabel: 'Cancel',
        })
        if (!ok) return
      }
    }
    // Z closes the counter session for good — ask first.
    if (reportType === 'Z') {
      const ok = await posConfirm({
        title: 'Take Z-Report?',
        message: `This closes the counter for ${resolveCashierName(cashier, 'this cashier')} and cannot be undone. Collected cash ${fmt3(collectedAmount)}, difference ${fmt3(cashDifference)}.`,
        confirmLabel: 'Yes, take Z-Report',
        cancelLabel: 'No',
        danger: true,
      })
      if (!ok) return
    }
    setSubmitting(reportType)
    setError(null)
    // Notes counted (saved on Z for ERP audit, printed on the slip); empty when the cashier only typed the amount.
    const cashDenoms = DENOMS
      .map(d => ({ value: d.value, count: parseInt(counts[d.label], 10) || 0 }))
      .filter(d => d.count > 0)
    try {
      const doClose = closeFn ?? ((payload) => api.counterPos.counterClose(payload, accessToken))
      const result = await doClose({
        counterNo,
        reportType,
        collectedCash: collectedAmount,
        collectedCard,
        cashDenoms,
      })
      const printPayload = {
        ...summary, ...result,
        collectedCash: collectedAmount, cashDifference: collectedAmount - (summary?.cashToBeCollected ?? 0),
        cardToBeCollected: cardToCollect, collectedCard, cardDifference, cashDenoms,
      }
      try {
        await printCounterReport(printPayload, {
          ...getReceiptPrintMetaFromStore(),
          cashierName: resolveCashierName(cashier, ''),
          reportType,
          closeNo: result.closeNo ?? '',
          reportAt: new Date(),
        })
      } catch (printErr) {
        posNotifyWarning(printErr.message ?? `${reportType}-Report saved but print failed`, {
          title: `${reportType}-Report Print`,
        })
      }
      setCloseResult({ ...result, reportType })
      posNotifySuccess(reportType === 'Z' ? `Z-Report saved${result.closeNo ? ` — ${result.closeNo}` : ''}` : 'X-Report printed', { title: 'Counter Reading', duration: 1500 })
      if (reportType === 'Z') {
        setCounts(initCounts())
        setManualInput('')
        setCardInput('')
      }
      await fetchSummary()
    } catch (err) {
      setError(err.message ?? `${reportType}-Report failed`)
    } finally {
      setSubmitting(null)
    }
  }

  const hasSummary = !loading && !!summary
  const v = (n) => (hasSummary ? fmt3(n ?? 0) : '—')
  const c = (n) => (hasSummary ? (n ?? 0) : '—')

  const cancelled = (count, amt) => (hasSummary ? `${count ?? 0} / ${fmt3(amt ?? 0)}` : '—')
  const cashRows = [
    ['Opening Float',     summary?.openingFloat, 'in'],
    ['Cash Sales',        summary?.cashSales ?? summary?.totalCash],
    ['Cash Refund',       summary?.cashRefund, 'out'],
    ['Net Cash Sales',    summary?.totalCash],
    ['Credits Received',  summary?.creditReceiptCash],
    ['Total Cash IN',     summary?.cashIn,  'in'],
    ['Petty Cash IN',     summary?.pettyCashIn, 'in'],
    ['Total Cash Out',    summary?.cashOut, 'out'],
    ['Petty Cash Out',    summary?.pettyCashOut, 'out'],
    ['Bills Cancelled',   cancelled(summary?.billCancelledCount, summary?.billCancelledAmount), 'out'],
    ['Items Cancelled',   cancelled(summary?.itemCancelledCount, summary?.itemCancelledAmount), 'out'],
  ]
  const otherRows = [
    ['Credit Amt',                    summary?.totalCredit],
    ['Credit Card Amt',               summary?.totalCard],
    ['Credit Received – C. Card Amt', summary?.creditReceiptCard],
    ['Voucher Amt',                   summary?.totalVoucher],
  ]
  const billRows = [
    ['Cash Bill',          summary?.cashBillCount],
    ['Credit Bill',        summary?.creditBillCount],
    ['Credit Card Bill',   summary?.cardBillCount],
    ['Multi Payment Bill', summary?.multiBillCount],
  ]
  const collectedActive = activeDenom === COLLECTED
  const cardActive = activeDenom === CARD

  return (
    <Modal
      closeOnEsc={false}
      onClose={onClose}
      icon={ClipboardList}
      kicker={`Cashier: ${cashier?.staffName ?? '—'} · Counter No: ${counterNo ?? '—'}`}
      title="Counter Reading"
      headerRight={
        <button type="button" className="cr-refresh" onClick={fetchSummary} disabled={loading} title="Refresh">
          <RefreshCw size={14} className={loading ? 'cr-spin' : undefined} />
        </button>
      }
      zIndex={1100}
      width={1100}
      maxHeight="96vh"
    >
      {error && (
        <div className="cr-banner is-error">
          {error}
          <button type="button" onClick={() => setError(null)}><X size={13} /></button>
        </div>
      )}
      {closeResult && (
        <div className={`cr-banner${closeResult.reportType === 'Z' ? ' is-ok' : ''}`}>
          {closeResult.reportType === 'Z'
            ? `Z-Report saved — ${closeResult.closeNo || `#${closeResult.closeId}`} · ${closeResult.billsClosed ?? closeResult.billCount ?? 0} bill(s) closed`
            : 'X-Report printed — live snapshot (not saved)'}
          <button type="button" onClick={() => setCloseResult(null)}><X size={13} /></button>
        </div>
      )}

      <div className="cr">
        {/* ── Sales Summary ── */}
        <section className="cr-sum">
          <h4>Sales Summary</h4>
          <div className="cr-rows">
            {cashRows.map(([label, n, tone]) => (
              <div key={label} className={`cr-row${tone ? ` is-${tone}` : ''}`}><span>{label}</span><b>{typeof n === 'string' ? n : v(n)}</b></div>
            ))}
          </div>
          <div className="cr-collect"><span>Cash To Be Collected</span><b>{v(summary?.cashToBeCollected)}</b></div>

          <div className="cr-rows is-boxed">
            {otherRows.map(([label, n]) => (
              <div key={label} className="cr-row"><span>{label}</span><b>{v(n)}</b></div>
            ))}
          </div>

          <div className="cr-rows">
            <div className="cr-row"><span>Total Sale</span><b>{v(summary?.grossAmount)}</b></div>
            <div className="cr-row is-out"><span>Refund / Return</span><b>{v(summary?.totalRefund)}</b></div>
          </div>
          <div className="cr-total"><span>Net Sale</span><b>{v((summary?.grossAmount ?? 0) - (summary?.totalRefund ?? 0))}</b></div>
          <div className="cr-rows">
            <div className="cr-row"><span>Tax Amount</span><b>{v(summary?.totalTax)}</b></div>
            <div className="cr-row is-out"><span>Return Tax</span><b>{v(summary?.totalRefundTax ?? 0)}</b></div>
            <div className="cr-row"><span>Net Tax</span><b>{v((summary?.totalTax ?? 0) - (summary?.totalRefundTax ?? 0))}</b></div>
            <div className="cr-row"><span>Bill Count</span><b>{c(summary?.billCount)}</b></div>
          </div>
          <div className="cr-bills">
            {billRows.map(([label, n]) => (
              <div key={label}><span>{label}</span><b>{c(n)}</b></div>
            ))}
          </div>
        </section>

        {/* ── Denominations ── */}
        <section className="cr-denoms">
          <div className="cr-denom-head"><span>Note</span><span>Count</span><span>Amount</span></div>
          {DENOMS.map(d => {
            const cnt = parseFloat(counts[d.label]) || 0
            return (
              <div
                key={d.label}
                className={`cr-denom${activeDenom === d.label ? ' is-active' : ''}`}
                onClick={() => setActiveDenom(d.label)}
              >
                <span className="cr-denom-note">{d.label} ×</span>
                <input
                  value={counts[d.label]}
                  placeholder="0"
                  onFocus={() => setActiveDenom(d.label)}
                  onChange={e => { const x = e.target.value; if (x === '' || /^\d*$/.test(x)) setCounts(cs => ({ ...cs, [d.label]: x })) }}
                  onKeyDown={e => e.stopPropagation()}
                />
                <span className={`cr-denom-amt${cnt > 0 ? ' has-value' : ''}`}>{cnt > 0 ? fmtMoney(d.value * cnt) : '—'}</span>
              </div>
            )
          })}
          <div className="cr-denom-total"><span>Notes total</span><b>{fmtMoney(denomTotal)}</b></div>
        </section>

        {/* ── Collected / difference / numpad ── */}
        <section className="cr-side">
          <label className={`cr-field${collectedActive ? ' is-active' : ''}`} onClick={() => setActiveDenom(COLLECTED)}>
            <span>
              Collected Amount
              {manualInput !== '' && (
                <button type="button" onClick={e => { e.preventDefault(); setManualInput('') }}>Use notes total</button>
              )}
            </span>
            <input
              value={manualInput !== '' ? manualInput : denomTotal > 0 ? fmtMoney(denomTotal) : ''}
              placeholder={moneyPlaceholder()}
              onFocus={() => setActiveDenom(COLLECTED)}
              onChange={e => { const x = e.target.value; if (x === '' || /^\d*\.?\d*$/.test(x)) setManualInput(x) }}
              onKeyDown={e => e.stopPropagation()}
            />
          </label>
          <div className={`cr-diff${cashDifference < 0 ? ' is-short' : cashDifference > 0 ? ' is-over' : ''}`}>
            <span>Cash Difference</span>
            <b>{cashDifference > 0 ? '+' : ''}{fmtMoney(cashDifference)}</b>
            <small>{cashDifference < 0 ? 'Short' : cashDifference > 0 ? 'Excess' : 'Balanced'}</small>
          </div>
          <label className={`cr-field${cardActive ? ' is-active' : ''}`} onClick={() => setActiveDenom(CARD)}>
            <span>
              Card Collected
              <em>Card total {v(cardToCollect)}</em>
            </span>
            <input
              value={cardInput}
              placeholder={moneyPlaceholder()}
              onFocus={() => setActiveDenom(CARD)}
              onChange={e => { const x = e.target.value; if (x === '' || /^\d*\.?\d*$/.test(x)) setCardInput(x) }}
              onKeyDown={e => e.stopPropagation()}
            />
          </label>
          <div className={`cr-diff${cardDifference < 0 ? ' is-short' : cardDifference > 0 ? ' is-over' : ''}`}>
            <span>Card Difference</span>
            <b>{cardDifference > 0 ? '+' : ''}{fmtMoney(cardDifference)}</b>
            <small>{cardDifference < 0 ? 'Short' : cardDifference > 0 ? 'Excess' : 'Balanced'}</small>
          </div>
          <div className="cr-pad">
            <Numpad onKey={handleKey} showDot showClear showBackspace fontSize={19} gap={7} />
          </div>
          <button type="button" className="cr-enter" onClick={nextDenom}>
            <CornerDownLeft size={17} /> Enter
          </button>
        </section>
      </div>

      <div className="cr-foot">
        {['X', 'Z'].map(t => (
          <button
            key={t}
            type="button"
            className={`cr-report${t === 'Z' ? ' is-z' : ''}`}
            onClick={() => handleReport(t)}
            disabled={!!submitting || loading}
          >
            {submitting === t ? <RefreshCw size={15} className="cr-spin" /> : <Printer size={15} />}
            {submitting === t ? 'Saving…' : `${t}-Report`}
          </button>
        ))}
        <button type="button" className="cr-close" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
