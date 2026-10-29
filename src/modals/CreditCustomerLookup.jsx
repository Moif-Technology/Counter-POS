import { useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, ArrowRight } from 'lucide-react'
import Table from '../components/common/Table'
import Numpad from '../components/common/Numpad'
import TouchKeyboard from '../components/common/Keyboard'
import { fmt3 } from '../lib/utils'
import './CreditCustomerLookup.css'

/*
 * Customer lookup (first step of Receipt / Credit Settlement):
 * customer table on the left; Code / Name / Mobile filters, numpad and
 * actions on the right. Tap a row to select it, tap it again (or Enter / Settle)
 * to open the settlement.
 */
const mobileOf = c => c.mobileNo ?? c.mobile ?? c.phone ?? ''

const COLUMNS = [
  { key: 'customerCode', label: 'Code', width: 90, mono: true },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'mobileNo', label: 'Mobile No', width: 130, mono: true, render: (_, row) => mobileOf(row) || '—' },
  {
    key: 'osAmount', label: 'O/S', width: 90, align: 'right', mono: true,
    render: v => <span className={Number(v) > 0 ? 'ccl-os is-due' : 'ccl-os'}>{fmt3(v)}</span>,
  },
]

const FIELDS = [
  { key: 'code',   label: 'Customer Code' },
  { key: 'name',   label: 'Customer Name' },
  { key: 'mobile', label: 'Mobile No' },
]

export default function CreditCustomerLookup({ customers, loading, error, onSearch, onOpen, onClose }) {
  const [q, setQ] = useState({ code: '', name: '', mobile: '' })
  const [focus, setFocus] = useState('code')
  const [selId, setSelId] = useState(null)
  const [kbOpen, setKbOpen] = useState(false)
  const inputs = useRef({})
  const tableRef = useRef(null)

  const rows = useMemo(() => {
    const has = (v, s) => String(v ?? '').toLowerCase().includes(s.trim().toLowerCase())
    return customers.filter(c =>
      (!q.code || has(c.customerCode, q.code)) &&
      (!q.name || has(c.customerName, q.name)) &&
      (!q.mobile || has(mobileOf(c), q.mobile)))
  }, [customers, q])

  const selIdx = rows.findIndex(c => c.customerId === selId)
  // A single match counts as selected, so Enter opens it straight away.
  const selected = selIdx >= 0 ? rows[selIdx] : rows.length === 1 ? rows[0] : null

  useEffect(() => { inputs.current.code?.focus() }, [])
  useEffect(() => {
    tableRef.current?.querySelector('.ui-table-row.is-selected')?.scrollIntoView({ block: 'nearest' })
  }, [selId])

  const setField = (key, value) => {
    setQ(prev => ({ ...prev, [key]: value }))
    if (key === 'name') onSearch(value)
  }

  const typeKey = k => {
    const cur = q[focus]
    if (k === '⌫') setField(focus, cur.slice(0, -1))
    else if (k === 'C') setField(focus, '')
    else if (k === 'ENTER') openSelected()
    else if (k.length === 1) setField(focus, cur + k)
    refocus()
  }

  const move = d => {
    if (!rows.length) return
    const i = selIdx < 0 ? (d > 0 ? 0 : rows.length - 1) : Math.min(Math.max(selIdx + d, 0), rows.length - 1)
    setSelId(rows[i].customerId)
  }

  const refocus = () => inputs.current[focus]?.focus()
  const openSelected = () => { if (selected) onOpen(selected) }

  const onRowClick = row => {
    if (row.customerId === selected?.customerId) onOpen(row)
    else setSelId(row.customerId)
  }

  // Enter / ↑ ↓ also work when focus isn't in a field (e.g. after tapping a row).
  const navRef = useRef(null)
  useEffect(() => { navRef.current = { move, openSelected } })
  useEffect(() => {
    const onKey = e => {
      if (e.defaultPrevented || /^(INPUT|TEXTAREA|BUTTON)$/.test(e.target?.tagName)) return
      if (e.key === 'ArrowDown') navRef.current.move(1)
      else if (e.key === 'ArrowUp') navRef.current.move(-1)
      else if (e.key === 'Enter') navRef.current.openSelected()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onFieldKey = e => {
    if (e.key === 'ArrowDown') move(1)
    else if (e.key === 'ArrowUp') move(-1)
    else if (e.key === 'Enter') openSelected()
    else return
    e.preventDefault(); e.stopPropagation()
  }

  return (
    <div className={`ccl${kbOpen ? ' is-kb' : ''}`}>
      <div className="ccl-table" ref={tableRef}>
        <Table
          columns={COLUMNS}
          rows={rows}
          rowKey="customerId"
          selected={selected?.customerId ?? null}
          onRowClick={onRowClick}
          onRowDoubleClick={onOpen}
          loading={loading}
          error={error}
          emptyText="No credit customers found"
        />
      </div>

      <div className="ccl-side">
        <div className="ccl-search">
          <div className="ccl-fields">
            {FIELDS.map(f => (
              <label key={f.key} className={`ccl-field${focus === f.key ? ' is-focus' : ''}`}>
                <span>{f.label}</span>
                <input
                  ref={el => { inputs.current[f.key] = el }}
                  value={q[f.key]}
                  onChange={e => setField(f.key, e.target.value)}
                  onFocus={() => setFocus(f.key)}
                  onKeyDown={onFieldKey}
                  autoComplete="off"
                />
              </label>
            ))}
          </div>
        </div>

        <div className={`ccl-picked${selected ? ' has-value' : ''}`}>
          {selected
            ? <><b>{selected.customerName}</b><span>O/S {fmt3(selected.osAmount)}</span></>
            : <span>Select a customer</span>}
        </div>

        {!kbOpen && <Numpad onKey={typeKey} showDot showClear={false} showBackspace btnHeight={44} fontSize={18} gap={6} />}

        <div className="ccl-actions">
          <button type="button" className={`ccl-btn${kbOpen ? ' is-on' : ''}`} onClick={() => { setKbOpen(o => !o); refocus() }}><Keyboard size={15} /> Keyboard</button>
          <button type="button" className="ccl-btn is-close" onClick={onClose}>Close</button>
        </div>
        <button type="button" className="ccl-go" disabled={!selected} onClick={openSelected}>
          Settle <ArrowRight size={16} />
        </button>
      </div>

      {kbOpen && (
        <div className="ccl-kb">
          <TouchKeyboard onKey={typeKey} onClose={() => setKbOpen(false)} />
        </div>
      )}
    </div>
  )
}
