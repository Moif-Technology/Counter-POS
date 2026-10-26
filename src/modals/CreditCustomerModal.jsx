import { useCallback, useEffect, useRef, useState } from 'react'
import { Delete } from 'lucide-react'
import { normalizePaymentMode, PM } from '../lib/paymentModes'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import Modal from '../components/common/Modal'
import Table from '../components/common/Table'

const NUM_KEYS = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
]

function resolveMode(dbMode) {
  return normalizePaymentMode(dbMode)
}

export default function CreditCustomerModal({ onClose, onApply }) {
  const [customerCode, setCustomerCode] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customers,    setCustomers]    = useState([])
  const [selectedIdx,  setSelectedIdx]  = useState(-1)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [focus,        setFocus]        = useState('code')
  const debounceRef = useRef(null)
  const accessToken = usePosStore(s => s.accessToken)

  const doSearch = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const { customers: list } = await api.counterPos.customerSearch(q, 200, accessToken)
      const creditOnly = (list ?? []).filter(c => resolveMode(c.paymentMode) === PM.CREDIT)
      setCustomers(creditOnly)
      setSelectedIdx(-1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { doSearch('') }, [doSearch])

  const scheduleSearch = (q) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 300)
  }

  const selectRow = (c, idx) => {
    setSelectedIdx(idx)
    setCustomerCode(c.customerCode ?? '')
    setCustomerName(c.customerName ?? '')
  }

  const pressKey = k => {
    if (k === '⌫') {
      if (focus === 'code') { setCustomerCode(v => { const n = v.slice(0, -1); scheduleSearch(n); return n }) }
      if (focus === 'name') { setCustomerName(v => { const n = v.slice(0, -1); scheduleSearch(n); return n }) }
      return
    }
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

  const fieldStyle = active => ({
    width: '100%', height: 34, boxSizing: 'border-box',
    padding: '0 10px', borderRadius: 6, outline: 'none', fontSize: 13,
    fontWeight: 600, color: 'var(--text-1)',
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand-bg)' : '#fff',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  })

  const numBtnStyle = {
    flex: 1, height: 46, borderRadius: 8,
    border: '1.5px solid var(--border)', background: '#fff',
    fontSize: 16, fontWeight: 700, color: 'var(--text-1)',
    cursor: 'pointer', transition: 'all 0.1s',
  }

  const selected = selectedIdx >= 0 ? customers[selectedIdx] : null

  return (
    <Modal onClose={onClose} title="Credit Customer Selection" width={700}>
      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left: customer list */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', padding: '14px 16px' }}>
          <Table
            columns={[
              { key: 'customerCode', label: 'Customer Code', width: 120 },
              { key: 'customerName', label: 'Customer Name' },
              {
                key: 'osAmount', label: 'Outstanding', width: 110, align: 'right', mono: true,
                render: v => {
                  const os = Number(v ?? 0)
                  return <b style={{ color: os > 0 ? 'var(--red)' : 'var(--green)' }}>{fmtMoney(os)}</b>
                },
              },
            ]}
            rows={customers}
            rowKey="customerId"
            selected={selected?.customerId}
            onRowClick={(c, i) => selectRow(c, i)}
            loading={loading}
            error={error}
            emptyText="No credit customers found"
            minHeight={300}
          />
        </div>

        {/* Right: inputs + numpad */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', padding: '14px 14px 0', gap: 10, flexShrink: 0 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Customer Code :', value: customerCode, key: 'code', setter: setCustomerCode },
              { label: 'Customer Name :', value: customerName, key: 'name', setter: setCustomerName },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', display: 'block', marginBottom: 3 }}>{f.label}</label>
                <input
                  value={f.value}
                  onFocus={() => setFocus(f.key)}
                  onChange={e => handleFieldChange(f.setter, e.target.value)}
                  style={fieldStyle(focus === f.key)}
                />
              </div>
            ))}
          </div>

          {/* Numpad */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {NUM_KEYS.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 5 }}>
                {row.map(k => (
                  <button
                    key={k}
                    className="ui-key"
                    onClick={() => pressKey(k)}
                    style={numBtnStyle}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  >{k}</button>
                ))}
              </div>
            ))}
            {/* Bottom row: 0 · ⌫ */}
            <div style={{ display: 'flex', gap: 5 }}>
              <button className="ui-key" onClick={() => pressKey('0')} style={{ ...numBtnStyle, flex: 2 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >0</button>
              <button className="ui-key" onClick={() => pressKey('.')} style={numBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >.</button>
              <button className="ui-key is-back" onClick={() => pressKey('⌫')}
                style={{ ...numBtnStyle, background: 'var(--red-bg)', borderColor: 'var(--red-border)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.93)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              ><Delete size={15} /></button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 6, paddingBottom: 14, marginTop: 'auto' }}>
            <button
              onClick={handleApply}
              disabled={selectedIdx < 0}
              style={{
                flex: 1, height: 36, borderRadius: 8, border: 'none',
                background: selectedIdx >= 0 ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--border)',
                color: selectedIdx >= 0 ? '#fff' : 'var(--text-4)',
                fontSize: 12, fontWeight: 700, cursor: selectedIdx >= 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { if (selectedIdx >= 0) e.currentTarget.style.filter = 'brightness(1.08)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
            >Apply</button>
            <button
              onClick={onClose}
              style={{
                flex: 1, height: 36, borderRadius: 8,
                border: '1.5px solid var(--border)', background: '#fff',
                color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >Close</button>
          </div>

        </div>
      </div>
    </Modal>
  )
}
