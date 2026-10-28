import { useEffect, useMemo, useState } from 'react'
import {
  Truck, ScanLine, RotateCcw, Check, CheckCircle2, XCircle, Layers, Banknote, CreditCard, UserRound, LayoutGrid,
} from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney, roundMoney } from '../lib/currencyFormat'
import { parseDeliveryBarcode } from '../lib/deliveryBarcode'
import { applyAmountKey } from '../lib/posNumpadKeys'
import { PM, isMultiPaymentMode } from '../lib/paymentModes'
import Modal from '../components/common/Modal'
import Table from '../components/common/Table'
import Numpad from '../components/common/Numpad'
import Notice from '../components/common/Notice'
import MultiPaymentModal from './MultiPaymentModal'
import './DeliverySettlementModal.css'

/*
 * Delivery Settlement
 *   Pending    — open deliveries: tick the ones that came back (or scan the slip),
 *                or Bring to Counter to edit one.
 *   Settlement — pay mode per delivery, totals by mode, collected cash vs cash
 *                to be collected, then Settle (posts the invoices).
 */
function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function mapDeliveryRow(d) {
  return {
    salesId: d.sales_id,
    holdNo: d.hold_no,
    customerName: d.customer_name ?? '—',
    customerCode: d.customer_code ?? '',
    deliveryTime: d.delivery_time,
    netAmount: Number(d.amount ?? 0),
    selected: false,
    paymentMode: PM.CASH,
    paymentSplits: null,
  }
}

const MODES = [
  { key: PM.CASH,         label: 'Cash',   icon: Banknote },
  { key: PM.CREDITCARD,   label: 'Card',   icon: CreditCard },
  { key: PM.CREDIT,       label: 'Credit', icon: UserRound },
  { key: PM.MULTIPAYMENT, label: 'Multi',  icon: LayoutGrid },
]

/** Amount of a row paid by `mode` (multi pay counts its splits). */
function paidBy(row, mode) {
  if (isMultiPaymentMode(row.paymentMode)) {
    return (row.paymentSplits ?? []).filter(s => s.payMode === mode).reduce((t, s) => t + (Number(s.amount) || 0), 0)
  }
  return row.paymentMode === mode ? row.netAmount : 0
}

export default function DeliverySettlementModal({ onClose, loadDeliveriesFn = null, settleFn = null, recallFn = null }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)

  const [tab, setTab]             = useState('pending')
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [scan, setScan]           = useState('')
  const [recalling, setRecalling] = useState(false)
  const [settling, setSettling]   = useState(false)
  const [collected, setCollected] = useState('')
  const [multiRow, setMultiRow]   = useState(null)
  const [notice, setNotice]       = useState(null)       // { ok, title, message }

  useEffect(() => {
    let alive = true
    const doLoad = loadDeliveriesFn ?? (() => api.counterPos.getDeliveryBills(accessToken))
    Promise.resolve(doLoad())
      .then(data => { if (alive) setRows((Array.isArray(data) ? data : []).map(mapDeliveryRow)) })
      .catch(e => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [accessToken, loadDeliveriesFn])

  const selected = useMemo(() => rows.filter(r => r.selected), [rows])
  const selectedTotal = roundMoney(selected.reduce((s, r) => s + r.netAmount, 0))
  const totals = useMemo(() => ({
    cash:   roundMoney(selected.reduce((s, r) => s + paidBy(r, PM.CASH), 0)),
    card:   roundMoney(selected.reduce((s, r) => s + paidBy(r, PM.CREDITCARD), 0)),
    credit: roundMoney(selected.reduce((s, r) => s + paidBy(r, PM.CREDIT), 0)),
  }), [selected])
  const collectedNum = parseFloat(collected) || 0
  const cashDiff = roundMoney(collectedNum - totals.cash)

  const patchRow = (salesId, patch) => setRows(prev => prev.map(r => (r.salesId === salesId ? { ...r, ...patch } : r)))
  const toggleRow = salesId => setRows(prev => prev.map(r => (r.salesId === salesId ? { ...r, selected: !r.selected } : r)))
  const allSelected = rows.length > 0 && selected.length === rows.length
  const selectAll = on => setRows(prev => prev.map(r => ({ ...r, selected: on })))

  function onScanKey(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const no = parseDeliveryBarcode(scan)
    const hit = no != null && rows.find(r => String(r.holdNo) === String(no))
    if (!hit) { setError(no == null ? 'Scan the delivery slip or type its number' : `Delivery ${no} not found`); return }
    patchRow(hit.salesId, { selected: true })
    setScan('')
    setError(null)
  }

  async function bringToCounter() {
    const no = selected.length === 1 ? selected[0].holdNo : parseDeliveryBarcode(scan)
    if (no == null) { setError('Tick one delivery (or scan it) to bring it to the counter'); return }
    if (recalling) return
    setRecalling(true)
    setError(null)
    try {
      await (recallFn ?? ((n) => usePosStore.getState().recallDeliveryByNo(n)))(no)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setRecalling(false)
    }
  }

  async function settle() {
    if (!selected.length || settling) return
    const noSplit = selected.find(r => isMultiPaymentMode(r.paymentMode) && !r.paymentSplits?.length)
    if (noSplit) { setError(`Delivery ${noSplit.holdNo}: set the Multi Pay split`); return }
    setSettling(true)
    setError(null)
    try {
      const items = selected.map(r => ({
        salesId: r.salesId,
        holdNo: r.holdNo,
        paymentMode: r.paymentMode,
        paidAmount: r.netAmount,
        balanceAmount: 0,
        paymentSplits: isMultiPaymentMode(r.paymentMode) ? r.paymentSplits : undefined,
      }))
      const doSettle = settleFn ?? ((payload) => api.counterPos.settleDeliveryBulk(payload, accessToken))
      const result = await doSettle({ counterNo, items })
      const settledIds = new Set((result?.results ?? items).map(x => x.salesId))
      setRows(prev => prev.filter(r => !settledIds.has(r.salesId)))
      setCollected('')
      setNotice({ ok: true, title: 'Settlement Done', message: result?.message ?? `${settledIds.size} invoice(s) posted` })
    } catch (e) {
      setNotice({ ok: false, title: 'Unable to Save', message: e.message ?? 'The settlement was not saved. Please try again.' })
    } finally {
      setSettling(false)
    }
  }

  const pendingCols = [
    {
      key: 'pick', label: (
        <input type="checkbox" className="ds-check" checked={allSelected} onChange={e => selectAll(e.target.checked)} onClick={e => e.stopPropagation()} aria-label="Select all" />
      ), width: 44, align: 'center',
      render: (_, r) => <input type="checkbox" className="ds-check" checked={r.selected} onChange={() => toggleRow(r.salesId)} onClick={e => e.stopPropagation()} aria-label={`Select ${r.holdNo}`} />,
    },
    { key: 'holdNo',       label: 'Del No',        width: 80, mono: true, render: v => <b>{v}</b> },
    { key: 'customerName', label: 'Customer Name', render: (v, r) => <span className="ds-cust">{v}{r.customerCode && <small>{r.customerCode}</small>}</span> },
    { key: 'deliveryTime', label: 'Ordered Time',  width: 140, render: v => fmtDateTime(v) },
    { key: 'netAmount',    label: 'Amount',        width: 110, align: 'right', mono: true, render: v => <b>{fmtMoney(v)}</b> },
  ]

  return (
    <>
    <Modal
      onClose={onClose}
      icon={Truck}
      kicker="Post invoice after payment"
      title="Delivery Settlement"
      width={1080}
      maxHeight="94vh"
      closeOnBackdrop={!multiRow && !notice}
      closeOnEsc={!multiRow && !notice}
    >
      <div className="ds-tabs">
        <button type="button" className={tab === 'pending' ? 'is-on' : ''} onClick={() => setTab('pending')}>
          Pending <span>{rows.length}</span>
        </button>
        <button type="button" className={tab === 'settle' ? 'is-on' : ''} onClick={() => setTab('settle')}>
          Settlement <span>{selected.length}</span>
        </button>
      </div>

      {error && <div className="ds-error">{error}</div>}

      {tab === 'pending' ? (
        <div className="ds-pending">
          <div className="ds-bar">
            <label className="ds-scan">
              <ScanLine size={16} />
              <input data-system-keyboard value={scan} onChange={e => setScan(e.target.value)} onKeyDown={onScanKey} placeholder="Scan delivery slip / type Del No" />
            </label>
            <button type="button" className="ds-btn" onClick={bringToCounter} disabled={recalling}>
              <RotateCcw size={15} /> {recalling ? 'Loading…' : 'Bring to Counter'}
            </button>
          </div>
          <div className="ds-table">
            <Table
              columns={pendingCols}
              rows={rows}
              rowKey="salesId"
              onRowClick={r => toggleRow(r.salesId)}
              loading={loading}
              emptyText="No pending deliveries"
            />
          </div>
        </div>
      ) : (
        <div className="ds-settle">
          <section className="ds-list">
            {selected.length === 0 && (
              <div className="ds-empty">
                Tick deliveries on the <button type="button" onClick={() => setTab('pending')}>Pending</button> tab to settle them.
              </div>
            )}
            {selected.map(r => (
              <div key={r.salesId} className="ds-row">
                <div className="ds-row-top">
                  <b>{r.holdNo}</b>
                  <span>{r.customerName}</span>
                  <em>{fmtMoney(r.netAmount)}</em>
                </div>
                <div className="ds-modes">
                  {MODES.map(m => {
                    const Icon = m.icon
                    return (
                      <button
                        key={m.key}
                        type="button"
                        className={r.paymentMode === m.key ? 'is-on' : ''}
                        onClick={() => {
                          patchRow(r.salesId, { paymentMode: m.key, paymentSplits: isMultiPaymentMode(m.key) ? r.paymentSplits : null })
                          if (isMultiPaymentMode(m.key)) setMultiRow({ ...r, paymentMode: m.key })
                        }}
                      ><Icon size={15} /> {m.label}</button>
                    )
                  })}
                  {isMultiPaymentMode(r.paymentMode) && (
                    <button type="button" className="ds-split" onClick={() => setMultiRow(r)}>
                      <Layers size={14} /> {r.paymentSplits?.length ? 'Edit split' : 'Set split'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>

          <aside className="ds-sum">
            <div className="ds-lines">
              <div><span>Total Cash Amount</span><b>{fmtMoney(totals.cash)}</b></div>
              <div><span>Total Credit Card</span><b>{fmtMoney(totals.card)}</b></div>
              <div><span>Total Credit</span><b>{fmtMoney(totals.credit)}</b></div>
              <div className="is-total"><span>Total Sales</span><b>{fmtMoney(selectedTotal)}</b></div>
            </div>
            <div className="ds-collect"><span>Cash to be Collected</span><b>{fmtMoney(totals.cash)}</b></div>
            <div className="ds-cash">
              <div className={`ds-field${collected ? ' has-value' : ''}`}><span>Collected Cash</span><b>{collected || fmtMoney(0)}</b></div>
              <div className={`ds-diff${!collected ? '' : cashDiff < 0 ? ' is-short' : cashDiff > 0 ? ' is-over' : ''}`}>
                <span>Cash Difference</span>
                <b>{collected ? `${cashDiff > 0 ? '+' : ''}${fmtMoney(cashDiff)}` : '—'}</b>
              </div>
            </div>
            <div className="ds-pad">
              <Numpad onKey={k => setCollected(v => applyAmountKey(v, k))} showDot showClear showBackspace btnHeight={40} fontSize={17} gap={5} />
            </div>
          </aside>
        </div>
      )}

      <div className="ds-foot">
        <span className="ds-total">Total Delivery Amount <b>{fmtMoney(selectedTotal)}</b><small>{selected.length} selected</small></span>
        <button type="button" className="ds-close" onClick={onClose}>Close</button>
        {tab === 'pending' ? (
          <button type="button" className="ds-go" onClick={() => setTab('settle')} disabled={!selected.length}>
            Next: Settlement
          </button>
        ) : (
          <button type="button" className="ds-go" onClick={settle} disabled={!selected.length || settling}>
            <Check size={17} /> {settling ? 'Settling…' : `Settle (${selected.length})`}
          </button>
        )}
      </div>
    </Modal>

    {multiRow && (
      <MultiPaymentModal
        billAmount={multiRow.netAmount}
        initialSplits={multiRow.paymentSplits}
        onConfirm={(splits) => { patchRow(multiRow.salesId, { paymentSplits: splits }); setMultiRow(null) }}
        onClose={() => setMultiRow(null)}
      />
    )}
    {notice && (
      <Notice
        icon={notice.ok ? CheckCircle2 : XCircle}
        tone={notice.ok ? 'success' : 'error'}
        title={notice.title}
        message={notice.message}
        onClose={() => { const ok = notice.ok; setNotice(null); if (ok && !rows.some(r => r.selected)) setTab('pending') }}
      />
    )}
    </>
  )
}
