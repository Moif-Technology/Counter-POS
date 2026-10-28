import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, RotateCcw, Trash2, MessageSquare, Clock, Hash, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import { posConfirm, posNotifyError, posNotifySuccess, usePosNotify } from '../lib/posNotify'
import { parseHoldBarcode } from '../lib/holdBarcode'
import Modal from '../components/common/Modal'
import Table from '../components/common/Table'
import './ClearHoldBillModal.css'
import './RecallHoldModal.css'

/*
 * Recall Hold — held bills as cards (left), the selected bill's items (right),
 * Recall puts it back on the counter. Type / scan the Hold No to jump to it;
 * ↑ / ↓ move, Enter recalls, Escape closes.
 */
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
const salesMan = h => h.staff_name || h.sales_man || h.staff_code || ''

const ITEM_COLS = [
  { key: 'sl',                label: 'SL',          width: 36, align: 'center', render: (_, __, i) => i + 1 },
  { key: 'product_code',      label: 'Barcode',     width: 100, mono: true },
  { key: 'short_description', label: 'Description' },
  { key: 'qty',               label: 'Qty',         width: 48, align: 'center', mono: true },
  { key: 'unit_price',        label: 'Unit Price',  width: 78, align: 'right', mono: true, render: v => fmtMoney(v) },
  { key: 'discount_amount',   label: 'Disc',        width: 58, align: 'right', mono: true, render: v => fmtMoney(v) },
  { key: 'line_total',        label: 'Total',       width: 78, align: 'right', mono: true, render: v => <b>{fmtMoney(v)}</b> },
]

export default function RecallHoldModal({ onClose, onRecall }) {
  const accessToken = usePosStore(s => s.accessToken)
  const recallHold  = usePosStore(s => s.recallHold)
  const [holds, setHolds]           = useState(null)    // null = loading
  const [selectedId, setSelectedId] = useState(null)
  const [itemsById, setItemsById]   = useState({})
  const [holdNo, setHoldNo]         = useState('')
  const [busy, setBusy]             = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    let alive = true
    api.counterPos.getHeldBills(accessToken)
      .then(d => { if (!alive) return; const list = Array.isArray(d) ? d : []; setHolds(list); setSelectedId(list[0]?.sales_id ?? null) })
      .catch(e => { if (alive) { setHolds([]); posNotifyError(e.message, { title: 'Recall Hold' }) } })
    return () => { alive = false }
  }, [accessToken])

  // Items of the selected hold (loaded once per hold)
  useEffect(() => {
    if (!selectedId || itemsById[selectedId]) return
    let alive = true
    api.counterPos.recallBill(selectedId, accessToken)
      .then(list => { if (alive) setItemsById(prev => ({ ...prev, [selectedId]: Array.isArray(list) ? list : [] })) })
      .catch(() => { if (alive) setItemsById(prev => ({ ...prev, [selectedId]: [] })) })
    return () => { alive = false }
  }, [selectedId, accessToken, itemsById])

  const list = useMemo(() => holds ?? [], [holds])
  const selected = list.find(h => h.sales_id === selectedId) ?? null
  const items = selected ? itemsById[selected.sales_id] ?? [] : []
  const itemsLoading = !!selected && !itemsById[selected.sales_id]
  const total = selected?.amount != null ? Number(selected.amount) : items.reduce((s, it) => s + (Number(it.line_total) || 0), 0)

  // Typed / scanned Hold No selects that hold
  const onHoldNo = raw => {
    setHoldNo(raw)
    const no = parseHoldBarcode(raw) ?? raw.trim()
    const hit = list.find(h => String(h.hold_no) === String(no))
    if (hit) setSelectedId(hit.sales_id)
  }

  async function recall() {
    if (!selected || busy) return
    setBusy(true)
    try {
      const recalled = await api.counterPos.recallHeldBill(selected.sales_id, accessToken)
      recallHold(selected, Array.isArray(recalled) ? recalled : [])
      posNotifySuccess(`Hold ${selected.hold_no} recalled`, { title: 'Recall Hold', duration: 1500 })
      onRecall?.(selected)
      onClose()
    } catch (e) {
      posNotifyError(e.message, { title: 'Recall Hold' })
      setBusy(false)
    }
  }

  async function cancelHold() {
    if (!selected || busy) return
    const ok = await posConfirm({ title: 'Cancel Hold', message: `Cancel hold ${selected.hold_no}? This cannot be undone.`, confirmLabel: 'Cancel Hold', cancelLabel: 'Keep', danger: true })
    if (!ok) return
    setBusy(true)
    try {
      await api.counterPos.cancelHold(selected.sales_id, accessToken)
      const idx = list.findIndex(h => h.sales_id === selected.sales_id)
      const next = list.filter(h => h.sales_id !== selected.sales_id)
      setHolds(next)
      setSelectedId(next[Math.min(idx, next.length - 1)]?.sales_id ?? null)
      posNotifySuccess(`Hold ${selected.hold_no} cancelled`, { title: 'Cancel Hold', duration: 1500 })
    } catch (e) {
      posNotifyError(e.message, { title: 'Cancel Hold' })
    } finally {
      setBusy(false)
    }
  }

  // Keyboard: ↑ / ↓ select, Enter recalls, Escape closes
  useEffect(() => {
    const onKey = e => {
      const n = usePosNotify.getState()
      if (n.confirm || n.alerts.some(a => !a.timer)) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Enter') { e.preventDefault(); recall(); return }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()
      const idx = list.findIndex(h => h.sales_id === selectedId)
      const next = list[Math.max(0, Math.min(list.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1)))]
      if (next) setSelectedId(next.sales_id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <Modal closeOnEsc={false} onClose={onClose} icon={Archive} title="Recall Hold" width={1040} maxHeight="94vh">
      <div className="chb">
        <section className="chb-left">
          <div className="chb-left-head">
            <h4>Held Bills <span>{list.length}</span></h4>
            <label className="chb-find rh-holdno">
              <Hash size={15} />
              <input ref={inputRef} data-system-keyboard value={holdNo} onChange={e => onHoldNo(e.target.value)} placeholder="Hold No / scan" />
            </label>
          </div>
          <div className="chb-cards">
            {holds === null && <div className="chb-empty"><Loader2 size={16} className="chb-spin" /> Loading held bills…</div>}
            {holds?.length === 0 && <div className="chb-empty">No held bills</div>}
            {list.map(h => {
              const age = holdAge(h.bill_date)
              const note = String(h.remarks ?? '').trim()
              return (
                <button key={h.sales_id} type="button" className={`chb-card${h.sales_id === selectedId ? ' is-on' : ''}`} onClick={() => setSelectedId(h.sales_id)} onDoubleClick={recall}>
                  <span className="chb-card-no"><small>Hold</small>{h.hold_no}</span>
                  <span className="chb-card-main">
                    <span className="chb-card-top">
                      <b>{h.customer_name || 'Walk-in'}</b>
                      {h.amount != null && <strong className="rh-amt">{fmtMoney(h.amount)}</strong>}
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
            <b>{fmtMoney(total)}</b>
          </div>
        </section>
      </div>

      <div className="chb-foot">
        <button type="button" className="rh-cancel" onClick={cancelHold} disabled={!selected || busy}><Trash2 size={15} /> Cancel Hold</button>
        <button type="button" className="chb-close" onClick={onClose}>Close</button>
        <button type="button" className="rh-recall" onClick={recall} disabled={!selected || busy}>
          {busy ? <Loader2 size={17} className="chb-spin" /> : <RotateCcw size={17} />} {busy ? 'Recalling…' : 'Recall'}
        </button>
      </div>
    </Modal>
  )
}
