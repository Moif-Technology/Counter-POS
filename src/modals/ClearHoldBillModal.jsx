import { useEffect, useState } from 'react'
import { Eraser, Trash2, RefreshCw, MessageSquare, Search, Clock } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import { posConfirm, posNotifySuccess, usePosNotify } from '../lib/posNotify'
import Modal from '../components/common/Modal'
import Table from '../components/common/Table'
import './ClearHoldBillModal.css'

/*
 * Clear Hold Bill — held bills as cards on the left (age, sales man, customer,
 * comment; holds older than a day are tagged "Old"), the selected bill's items
 * on the right, then "Clear Hold Bill" deletes it.
 * Type a hold no to find it; ↑ / ↓ move, Delete clears, Escape closes.
 */
function fmtDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const salesMan = h => h.staff_name || h.sales_man || h.staff_code || ''

const DAY_MS = 24 * 60 * 60 * 1000
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** → 'Today 14:20' · 'Yesterday 09:05' · '3 days ago' · '31 Dec 2024' (older than a week) */
function holdAge(value) {
  const d = new Date(value)
  if (!value || Number.isNaN(d.getTime())) return { label: '—', old: false }
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY_MS)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const label = days <= 0 ? `Today ${time}` : days === 1 ? `Yesterday ${time}` : days <= 7 ? `${days} days ago`
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  return { label, old: Date.now() - d.getTime() > DAY_MS }
}

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
  const [find, setFind] = useState('')
  const shown = find ? holds.filter(h => String(h.hold_no).includes(find.trim())) : holds

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
      const idx = shown.findIndex(h => h.sales_id === selectedId)
      const nextIdx = Math.max(0, Math.min(shown.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1)))
      if (shown[nextIdx]) setSelectedId(shown[nextIdx].sales_id)
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
          <div className="chb-left-head">
            <h4>Held Bills <span>{holds.length}</span></h4>
            <label className="chb-find">
              <Search size={15} />
              <input
                data-system-keyboard
                value={find}
                onChange={e => {
                  const v = e.target.value.replace(/D/g, '')
                  setFind(v)
                  const hit = holds.find(h => String(h.hold_no).includes(v))
                  if (v && hit) setSelectedId(hit.sales_id)
                }}
                onKeyDown={e => e.stopPropagation()}
                placeholder="Find hold no"
              />
            </label>
          </div>
          <div className="chb-cards">
            {loading && <div className="chb-empty">Loading held bills…</div>}
            {!loading && shown.length === 0 && <div className="chb-empty">{find ? `No hold "${find}"` : 'No held bills'}</div>}
            {!loading && shown.map(h => {
              const age = holdAge(h.bill_date)
              const note = String(h.remarks ?? '').trim()
              return (
                <button
                  key={h.sales_id}
                  type="button"
                  className={`chb-card${h.sales_id === selectedId ? ' is-on' : ''}`}
                  onClick={() => setSelectedId(h.sales_id)}
                >
                  <span className="chb-card-no"><small>Hold</small>{h.hold_no}</span>
                  <span className="chb-card-main">
                    <span className="chb-card-top">
                      <b>{h.customer_name || 'Walk-in'}</b>
                      {age.old && <em>Old</em>}
                    </span>
                    <span className="chb-card-meta"><Clock size={12} /> {age.label}{salesMan(h) ? ` · ${salesMan(h)}` : ''}</span>
                    {note && <span className="chb-card-note"><MessageSquare size={12} /> {note}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="chb-right">
          <h4>{selected ? <>Hold <b>{selected.hold_no}</b> · {selected.customer_name || 'Walk-in'} <small>{fmtDateTime(selected.bill_date)}</small></> : 'Bill items'}</h4>
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
