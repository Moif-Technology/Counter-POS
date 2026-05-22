import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Delete, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '../../lib/api'
import { usePosStore } from '../../store/posStore'

const NUM_KEYS = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
]

function resolveMode(dbMode) {
  const m = String(dbMode || '').toUpperCase()
  if (m === 'CREDITCARD' || m === 'CARD') return 'CARD'
  if (m === 'CREDIT')                     return 'CREDIT'
  return 'CASH'
}

export default function CreditCustomerModal({ onClose, onApply }) {
  const [customerCode, setCustomerCode] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customers,    setCustomers]    = useState([])
  const [selectedIdx,  setSelectedIdx]  = useState(-1)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [focus,        setFocus]        = useState('code')
  const overlayRef  = useRef()
  const listRef     = useRef()
  const debounceRef = useRef(null)
  const accessToken = usePosStore(s => s.accessToken)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const doSearch = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const { customers: list } = await api.counterPos.customerSearch(q, 200, accessToken)
      const creditOnly = (list ?? []).filter(c => resolveMode(c.paymentMode) === 'CREDIT')
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
    fontFamily: "'JetBrains Mono', monospace",
  })

  const numBtnStyle = {
    flex: 1, height: 46, borderRadius: 8,
    border: '1.5px solid var(--border)', background: '#fff',
    fontSize: 16, fontWeight: 700, color: 'var(--text-1)',
    cursor: 'pointer', transition: 'all 0.1s',
  }

  const selected = selectedIdx >= 0 ? customers[selectedIdx] : null
  const osAmt    = selected ? Number(selected.osAmount ?? 0) : 0

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.4)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'cc-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes cc-fade  { from{opacity:0} to{opacity:1} }
        @keyframes cc-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes cc-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes cc-bal   { from{opacity:0;transform:scaleY(0.7)} to{opacity:1;transform:scaleY(1)} }
      `}</style>

      <div style={{
        width: 700, maxWidth: '96vw',
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'cc-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}>

        {/* Header — brand crimson, same as privilege modal */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Credit Customer Selection</span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left: customer list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden', padding: '12px' }}>
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              border: '1.5px solid var(--brand-border)', borderRadius: 10,
            }}>
              {/* Column headings */}
              <div style={{
                display: 'grid', gridTemplateColumns: '110px 1fr',
                background: 'var(--brand-bg)', borderBottom: '1.5px solid var(--brand-border)',
                padding: '8px 12px', flexShrink: 0,
                borderRadius: '8px 8px 0 0',
              }}>
                {['Customer Code', 'Customer Name'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div ref={listRef} style={{ flex: 1, overflowY: 'auto', borderRadius: '0 0 8px 8px' }}>
                {loading && (
                  <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-4)', fontSize: 12 }}>
                    <Loader2 size={14} style={{ animation: 'cc-spin 0.8s linear infinite' }} /> Loading…
                  </div>
                )}
                {!loading && error && (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{error}</div>
                )}
                {!loading && !error && customers.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>No credit customers found</div>
                )}
                {!loading && customers.map((c, i) => {
                  const isActive = selectedIdx === i
                  const isLast   = i === customers.length - 1
                  const cOs      = Number(c.osAmount ?? 0)
                  return (
                    <div key={c.customerId}>
                      {/* Main row */}
                      <div
                        onClick={() => selectRow(c, i)}
                        style={{
                          display: 'grid', gridTemplateColumns: '110px 1fr',
                          padding: '9px 12px', cursor: 'pointer',
                          borderBottom: (isActive || (!isActive && !isLast)) ? '1px solid var(--border)' : 'none',
                          background: isActive ? 'var(--brand-bg)' : '#fff',
                          borderLeft: `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#fff' }}
                      >
                        <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace", fontWeight: isActive ? 700 : 500 }}>{c.customerCode}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: isActive ? 700 : 500 }}>{c.customerName}</span>
                      </div>

                      {/* Inline OS balance strip — visible only when this row selected */}
                      {isActive && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 14px 8px 15px',
                          background: cOs > 0 ? 'var(--red-bg)' : 'var(--green-bg)',
                          borderLeft: `3px solid ${cOs > 0 ? 'var(--red)' : 'var(--green)'}`,
                          borderBottom: isLast ? 'none' : '1px solid var(--border)',
                          animation: 'cc-bal 0.15s ease',
                          transformOrigin: 'top',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {cOs > 0
                              ? <AlertCircle  size={13} color="var(--red)"   />
                              : <CheckCircle2 size={13} color="var(--green)" />
                            }
                            <span style={{ fontSize: 11, fontWeight: 700, color: cOs > 0 ? 'var(--red)' : 'var(--green)' }}>
                              Outstanding Balance
                            </span>
                          </div>
                          <span style={{
                            fontSize: 15, fontWeight: 800,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontVariantNumeric: 'tabular-nums',
                            color: cOs > 0 ? 'var(--red)' : 'var(--green)',
                            letterSpacing: '-0.3px',
                          }}>
                            {cOs.toFixed(3)} <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.65 }}>AED</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
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
                <button onClick={() => pressKey('0')} style={{ ...numBtnStyle, flex: 2 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >0</button>
                <button onClick={() => pressKey('.')} style={numBtnStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >.</button>
                <button onClick={() => pressKey('⌫')}
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

      </div>
    </div>
  )
}
