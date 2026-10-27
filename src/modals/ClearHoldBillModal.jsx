import { useEffect, useState } from 'react'
import { Eraser, Trash2, RefreshCw, MessageSquare } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import { posConfirm, posNotifySuccess, usePosNotify } from '../lib/posNotify'
import Modal from '../components/common/Modal'
import Table from '../components/common/Table'
import './ClearHoldBillModal.css'

/*
 * Clear Hold Bill — held bills on the left (tap to see items), the bill's items
 * on the right, then "Clear Hold Bill" deletes the selected hold.
 * ↑ / ↓ move through the holds, Delete clears, Escape closes.
 */
function fmtDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const salesMan = h => h.staff_name || h.sales_man || h.staff_code || ''

const HOLD_COLS = [
  { key: 'hold_no',   label: 'Hold No',   width: 70, mono: true, render: v => <b>{v}</b> },
  { key: 'bill_date', label: 'Bill Time', width: 124, render: v => fmtDateTime(v) },
  { key: 'staff',     label: 'Sales Man', render: (_, h) => salesMan(h) || '—' },
]

const ITEM_COLS = [
  { key: 'sl',                label: 'SL',          width: 36, align: 'center', render: (_, __, i) => i + 1 },
  { key: 'product_code',      label: 'Barcode',     width: 100, mono: true },
  { key: 'short_description', label: 'Description' },
  { key: 'qty',               label: 'Qty',         width: 48, align: 'center', mono: true },
  { key: 'unit_price',        label: 'Unit Price',  width: 78, align: 'right', mono: true, render: v => fmtMoney(v) },
  { key: 'discount_amount',   label: 'Disc',        width: 58, align: 'right', mono: true, render: v => fmtMoney(v) },
  { key: 'line_total',        label: 'Total',       width: 78, align: 'right', mono: true, render: v => <b>{fmtMoney(v)}</b> },
]

export default function ClearHoldBillModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const [holds, setHolds]       = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [itemsById, setItemsById]   = useState({})
  const [loading, setLoading]       = useState(true)
  const [reloadKey, setReloadKey]   = useState(0)
  const [clearing, setClearing]     = useState(false)
  const [error, setError]           = useState(null)

  const selected = holds.find(h => h.sales_id === selectedId) ?? null
  const items = selected ? itemsById[selected.sales_id] ?? [] : []
  const itemsLoading = !!selected && !itemsById[selected.sales_id]
  const billTotal = items.reduce((s, it) => s + (Number(it.line_total) || 0), 0)
  const comment = String(selected?.remarks ?? '').trim()

  // Held bills (reloadKey bumps on Refresh)
  useEffect(() => {
    let alive = true
    api.counterPos.getHeldBills(accessToken)
      .then(data => {
        if (!alive) return
        const list = Array.isArray(data) ? data : []
        setHolds(list)
        setSelectedId(list[0]?.sales_id ?? null)
        setItemsById({})
      })
      .catch(e => { if (alive) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [accessToken, reloadKey])

  const fetchHolds = () => { setLoading(true); setError(null); setReloadKey(k => k + 1) }

  // Items of the selected hold (loaded once per hold)
  useEffect(() => {
    if (!selectedId || itemsById[selectedId]) return
    let alive = true
    api.counterPos.recallBill(selectedId, accessToken)
      .then(list => { if (alive) setItemsById(prev => ({ ...prev, [selectedId]: Array.isArray(list) ? list : [] })) })
      .catch(e => { if (alive) { setError(e.message); setItemsById(prev => ({ ...prev, [selectedId]: [] })) } })
    return () => { alive = false }
  }, [selectedId, accessToken, itemsById])

  async function handleClear() {
    if (!selected || clearing) return
    const ok = await posConfirm({
      title: 'Clear Hold Bill',
      message: `Clear hold ${selected.hold_no}? This cannot be undone.`,
      confirmLabel: 'Clear',
      cancelLabel: 'Keep',
      danger: true,
    })
    if (!ok) return
    setClearing(true)
    setError(null)
    try {
      await api.counterPos.cancelHold(selected.sales_id, accessToken)
      const idx = holds.findIndex(h => h.sales_id === selected.sales_id)
      const next = holds.filter(h => h.sales_id !== selected.sales_id)
      setHolds(next)
      setSelectedId(next[Math.min(idx, next.length - 1)]?.sales_id ?? null)
      posNotifySuccess(`Hold ${selected.hold_no} cleared`, { title: 'Clear Hold Bill' })
    } catch (e) {
      setError(e.message)
    } finally {
      setClearing(false)
    }
  }

  // Keyboard: ↑ / ↓ select, Delete clears, Escape closes
  useEffect(() => {
    const onKey = e => {
      const notify = usePosNotify.getState()
      if (notify.confirm || notify.alerts.length) return   // a message / confirm is open
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Delete') { handleClear(); return }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()
      const idx = holds.findIndex(h => h.sales_id === selectedId)
      const nextIdx = Math.max(0, Math.min(holds.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1)))
      if (holds[nextIdx]) setSelectedId(holds[nextIdx].sales_id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // re-binds each render so it sees the current selection

  return (
    <Modal
      closeOnEsc={false}
      onClose={onClose}
      icon={Eraser}
      kicker="Operations"
      title="Clear Hold Bill"
      headerRight={
        <button type="button" className="chb-refresh" onClick={fetchHolds} disabled={loading} title="Refresh">
          <RefreshCw size={14} className={loading ? 'chb-spin' : undefined} />
        </button>
      }
      zIndex={1100}
      width={1040}
      maxHeight="94vh"
    >
      {error && <div className="chb-error">{error}</div>}

      <div className="chb">
        <section className="chb-left">
          <h4>Held Bills <span>{holds.length}</span></h4>
          <div className="chb-table">
            <Table
              columns={HOLD_COLS}
              rows={holds}
              rowKey="sales_id"
              selected={selectedId}
              onRowClick={h => setSelectedId(h.sales_id)}
              loading={loading}
              emptyText="No held bills"
            />
          </div>
          <div className={`chb-comment${comment ? ' has-value' : ''}`}>
            <MessageSquare size={15} />
            <span>Comments</span>
            <p>{comment || '—'}</p>
          </div>
        </section>

        <section className="chb-right">
          <h4>{selected ? <>Hold <b>{selected.hold_no}</b> · {selected.customer_name || 'Walk-in'}</> : 'Bill items'}</h4>
          <div className="chb-table">
            <Table
              columns={ITEM_COLS}
              rows={items}
              rowKey="sl"
              loading={itemsLoading && !items.length}
              emptyText={selected ? 'No items on this hold' : 'Select a held bill'}
            />
          </div>
          <div className="chb-total">
            <span>Bill Total <small>{items.length} item{items.length !== 1 ? 's' : ''}</small></span>
            <b>{fmtMoney(billTotal)}</b>
          </div>
        </section>
      </div>

      <div className="chb-foot">
        <button type="button" className="chb-clear" onClick={handleClear} disabled={!selected || clearing}>
          <Trash2 size={16} /> {clearing ? 'Clearing…' : 'Clear Hold Bill'}
        </button>
        <button type="button" className="chb-close" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
