import { useCallback, useEffect, useRef, useState } from 'react'
import { Crown } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'
import Table from '../components/common/Table'


export default function PrivilegeCustomerModal({ onClose, onApply, searchFn = null }) {
  const [customerNo,   setCustomerNo]   = useState('')
  const [customerCode, setCustomerCode] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customers,    setCustomers]    = useState([])
  const [selectedIdx,  setSelectedIdx]  = useState(-1)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [focus,        setFocus]        = useState('no')
  const debounceRef = useRef(null)
  const accessToken = usePosStore(s => s.accessToken)

  const doSearch = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const doSearch = searchFn ?? ((qq) => api.counterPos.customerSearch(qq, 100, accessToken))
      const { customers: list } = await doSearch(q)
      setCustomers(list ?? [])
      setSelectedIdx(-1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, searchFn])

  // Load all customers on open
  useEffect(() => { doSearch('') }, [doSearch])

  const scheduleSearch = (q) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 300)
  }

  const selectRow = (c, idx) => {
    setSelectedIdx(idx)
    setCustomerNo(String(c.customerId ?? ''))
    setCustomerCode(c.customerCode ?? '')
    setCustomerName(c.customerName ?? '')
  }

  // Keypad types into the focused field; C clears it.
  const pressKey = k => {
    if (k === 'C') {
      const setter = { no: setCustomerNo, code: setCustomerCode, name: setCustomerName }[focus]
      setter?.(''); scheduleSearch('')
      return
    }
    if (k === '⌫') {
      if (focus === 'no')   { setCustomerNo(v   => { const n = v.slice(0, -1); scheduleSearch(n); return n }) }
      if (focus === 'code') { setCustomerCode(v => { const n = v.slice(0, -1); scheduleSearch(n); return n }) }
      if (focus === 'name') { setCustomerName(v => { const n = v.slice(0, -1); scheduleSearch(n); return n }) }
      return
    }
    if (focus === 'no')   { setCustomerNo(v   => { const n = v + k; scheduleSearch(n); return n }) }
    if (focus === 'code') { setCustomerCode(v => { const n = v + k; scheduleSearch(n); return n }) }
    if (focus === 'name') { setCustomerName(v => { const n = v + k; scheduleSearch(n); return n }) }
  }

  const handleFieldChange = (setter, val) => {
    setter(val)
    scheduleSearch(val)
  }

  const handleApply = () => {
    if (selectedIdx < 0) return
    onApply?.(customers[selectedIdx])
    onClose()
  }

  const FIELDS = [
    { label: 'Customer No',   value: customerNo,   key: 'no',   setter: setCustomerNo   },
    { label: 'Customer Code', value: customerCode, key: 'code', setter: setCustomerCode },
    { label: 'Customer Name', value: customerName, key: 'name', setter: setCustomerName },
  ]

  const fieldStyle = active => ({
    width: '100%', height: 38, boxSizing: 'border-box',
    padding: '0 10px', borderRadius: 8, outline: 'none', fontSize: 13,
    fontWeight: 600, color: 'var(--text-1)',
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: '#fff', transition: 'border-color 0.12s', fontFamily: 'inherit',
  })

  const count = customers.length
  const selected = selectedIdx >= 0 ? customers[selectedIdx] : null

  // Common popup layout: table card (left) · fields + keypad (right) · footer with count, Close, Apply.
  return (
    <Modal onClose={onClose} icon={Crown} kicker="Customer" title="Privilege Customer" width={780} maxHeight="92vh">
      <style>{`
        @media (max-width: 680px) {
          .pc-body { flex-direction: column !important; }
          .pc-right { width: 100% !important; border-left: none !important; border-top: 1px solid var(--border) !important; }
        }
      `}</style>

      <div className="pc-body" style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Customer table ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
          <Table
            columns={[
              { key: 'customerId',   label: 'Customer No',   width: '1fr', mono: true },
              { key: 'customerCode', label: 'Customer Code', width: '1.2fr' },
              { key: 'customerName', label: 'Customer Name', width: '2.2fr' },
            ]}
            rows={customers}
            rowKey="customerId"
            selected={selected?.customerId}
            onRowClick={(c, i) => selectRow(c, i)}
            onRowDoubleClick={(c, i) => { selectRow(c, i); onApply?.(c); onClose() }}
            loading={loading}
            error={error}
            emptyText="No customers found"
            minHeight={300}
          />
        </div>

        {/* ── Fields + keypad ── */}
        <div className="pc-right" style={{
          width: 270, flexShrink: 0, padding: '14px 16px', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {FIELDS.map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' }}>{f.label}</label>
              <input
                value={f.value}
                onFocus={() => setFocus(f.key)}
                onChange={e => handleFieldChange(f.setter, e.target.value)}
                style={fieldStyle(focus === f.key)}
              />
            </div>
          ))}
          <div style={{ marginTop: 4 }}>
            <Numpad onKey={pressKey} showDot showClear showBackspace={false} btnHeight={44} fontSize={16} gap={6} />
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
      }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--text-3)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected
            ? <>Selected: <b style={{ color: 'var(--brand)' }}>{selected.customerName}</b></>
            : `${count} customer${count !== 1 ? 's' : ''} · tap a row to select`}
        </span>
        <button onClick={onClose} style={{
          height: 34, padding: '0 18px', borderRadius: 9,
          border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
          color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Close
        </button>
        <button onClick={handleApply} disabled={!selected} style={{
          height: 34, padding: '0 22px', borderRadius: 9, border: 'none',
          background: selected ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--border)',
          color: selected ? '#fff' : 'var(--text-4)',
          fontSize: 12, fontWeight: 700, cursor: selected ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}>
          Apply
        </button>
      </div>
    </Modal>
  )
}
