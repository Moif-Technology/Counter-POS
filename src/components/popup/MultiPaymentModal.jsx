import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Layers, Delete, AlertCircle } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { SPLIT_PAY_MODES, PM } from '../../lib/paymentModes'
import { fmtMoney, moneyInputRegex, moneyPlaceholder, roundMoney } from '../../lib/currencyFormat'

let rowSeq = 1

function num(v, d = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

function rowsToSplits(list) {
  return list.map(r => ({
    payMode: r.payMode,
    amount: roundMoney(r.amount),
    tip: roundMoney(r.tip),
    refNo: r.refNo ?? '',
  }))
}

function hydrateRowsFromSplits(splits) {
  if (!Array.isArray(splits) || !splits.length) return []
  return splits.map((s, i) => ({
    id: rowSeq++,
    payerNo: i + 1,
    payMode: s.payMode ?? PM.CASH,
    amount: num(s.amount, 0),
    tip: num(s.tip, 0),
    refNo: s.refNo ?? '',
  }))
}

const PAY_MODES = SPLIT_PAY_MODES.map(m => ({
  ...m,
  color: m.key === PM.CASH || m.key === PM.CREDITCARD ? 'var(--brand)' : m.key === 'ONLINE' ? 'var(--blue)' : 'var(--text-2)',
  bg: m.key === PM.CASH || m.key === PM.CREDITCARD ? 'var(--brand-bg)' : m.key === 'ONLINE' ? 'var(--blue-bg)' : 'var(--surface-2)',
  border: m.key === PM.CASH || m.key === PM.CREDITCARD ? 'var(--brand-border)' : m.key === 'ONLINE' ? 'var(--blue-border)' : 'var(--border)',
}))

const NUM_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', '.', '00'],
]

export default function MultiPaymentModal({ onClose, billAmount, initialSplits, onConfirm }) {
  const overlayRef = useRef()

  const storeNet = usePosStore(s => s.netAmount)
  const netAmount = billAmount != null ? Number(billAmount) : storeNet
  const standalone = typeof onConfirm === 'function'

  const setPaymentMode = usePosStore(s => s.setPaymentMode)
  const setPayment = usePosStore(s => s.setPayment)
  const setPaymentSplits = usePosStore(s => s.setPaymentSplits)

  const [rows, setRows] = useState(() =>
    hydrateRowsFromSplits(initialSplits ?? (standalone ? [] : usePosStore.getState().paymentSplits)),
  )
  const [selectedId, setSelectedId] = useState(null)
  const [payMode, setPayMode] = useState(PM.CASH)
  const [amount, setAmount] = useState('')
  const [tip, setTip] = useState('')
  const [ref, setRef] = useState('')
  const [focusField, setFocusField] = useState('amount')
  const [error, setError] = useState('')

  const syncSplitsToStore = (list) => {
    if (standalone) return
    if (!list.length) {
      setPaymentSplits(null)
      return
    }
    setPaymentSplits(rowsToSplits(list))
  }

  const updateRows = (updater) => {
    setRows(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      syncSplitsToStore(next)
      return next
    })
  }

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const billTotal = useMemo(
    () => roundMoney(rows.reduce((a, r) => a + num(r.amount, 0), 0)),
    [rows],
  )
  const tipTotal = useMemo(
    () => roundMoney(rows.reduce((a, r) => a + num(r.tip, 0), 0)),
    [rows],
  )
  const remaining = useMemo(
    () => roundMoney(num(netAmount, 0) - billTotal),
    [netAmount, billTotal],
  )
  const grandTotal = useMemo(() => roundMoney(billTotal + tipTotal), [billTotal, tipTotal])
  const balanced = Math.abs(remaining) <= 0.02
  const canDone = rows.length > 0 && balanced

  const setFieldValue = (field, value) => {
    if (field === 'amount') setAmount(value)
    else if (field === 'tip') setTip(value)
    else setRef(value)
  }

  const getFieldValue = (field) => {
    if (field === 'amount') return amount
    if (field === 'tip') return tip
    return ref
  }

  const appendKey = (key) => {
    setError('')
    if (focusField === 'ref') {
      setRef(v => v + key)
      return
    }
    const cur = getFieldValue(focusField)
    const next = cur + key
    if (!moneyInputRegex().test(next)) return
    setFieldValue(focusField, next)
  }

  const backspace = () => {
    setError('')
    if (focusField === 'ref') {
      setRef(v => v.slice(0, -1))
      return
    }
    setFieldValue(focusField, getFieldValue(focusField).slice(0, -1))
  }

  const clearField = () => {
    setError('')
    setFieldValue(focusField, '')
  }

  const useRemaining = () => {
    setError('')
    if (remaining <= 0) {
      setError('No remaining balance to apply.')
      return
    }
    setAmount(fmtMoney(remaining))
    setFocusField('amount')
  }

  const addRow = () => {
    setError('')
    if (remaining <= 0.01) {
      setError('Split balance is 0.00 — cannot add more rows.')
      return
    }

    const amt = num(amount, 0)
    const tipAmt = num(tip, 0)
    const refVal = ref.trim()

    if (amt <= 0) {
      setError('Enter split amount.')
      setFocusField('amount')
      return
    }
    if (amt > remaining + 0.01) {
      setError(`Amount exceeds remaining balance (${fmtMoney(remaining)}).`)
      setFocusField('amount')
      return
    }

    const id = rowSeq++
    updateRows(prev => [...prev, {
      id,
      payerNo: prev.length + 1,
      payMode,
      amount: amt,
      tip: tipAmt,
      refNo: refVal,
    }])
    setSelectedId(id)
    setAmount('')
    setTip('')
    setRef('')
    setFocusField('amount')
  }

  const removeSelected = () => {
    setError('')
    if (selectedId == null) return
    updateRows(prev => prev
      .filter(r => r.id !== selectedId)
      .map((r, i) => ({ ...r, payerNo: i + 1 })))
    setSelectedId(null)
  }

  const clearAll = () => {
    setError('')
    updateRows([])
    setSelectedId(null)
  }

  const done = () => {
    setError('')
    if (!rows.length) {
      setError('Add split rows first.')
      return
    }
    if (!balanced) {
      setError(`Split not completed. Balance: ${fmtMoney(remaining)}`)
      return
    }

    const splits = rowsToSplits(rows)
    if (standalone) {
      onConfirm(splits)
      onClose?.()
      return
    }

    setPaymentMode(PM.MULTIPAYMENT)
    setPaymentSplits(splits)
    setPayment(num(netAmount, 0))
    onClose?.()
  }

  const press = e => { e.currentTarget.style.transform = 'scale(0.93)' }
  const release = e => { e.currentTarget.style.transform = 'scale(1)' }

  const NumBtn = ({ label, onClick, style = {} }) => (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={press}
      onMouseUp={release}
      style={{
        height: 44, width: '100%',
        borderRadius: 10,
        border: '1.5px solid var(--border)',
        background: '#fff',
        color: 'var(--text-1)',
        fontSize: typeof label === 'string' && label.length > 2 ? 11 : 16,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: typeof label === 'string' && label !== 'C' && label !== 'ADD'
          ? "'JetBrains Mono', monospace"
          : 'inherit',
        transition: 'all 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...style,
      }}
      onMouseEnter={e => {
        if (!style.background) {
          e.currentTarget.style.background = 'var(--brand-bg)'
          e.currentTarget.style.borderColor = 'var(--brand-border)'
          e.currentTarget.style.color = 'var(--brand)'
        } else {
          e.currentTarget.style.filter = 'brightness(0.94)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = 'brightness(1)'
        if (!style.background) {
          e.currentTarget.style.background = '#fff'
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-1)'
        }
      }}
    >
      {label}
    </button>
  )

  const fieldRow = (label, field, value, mono = true) => {
    const focused = focusField === field
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 58, flexShrink: 0, textAlign: 'right',
          fontSize: 11, fontWeight: 700, color: 'var(--text-2)',
        }}>
          {label}
        </span>
        <div
          onClick={() => setFocusField(field)}
          style={{
            flex: 1, height: 38, borderRadius: 8, boxSizing: 'border-box',
            border: `1.5px solid ${focused ? 'var(--brand-border)' : 'var(--border)'}`,
            background: focused ? 'var(--brand-bg)' : '#fff',
            display: 'flex', alignItems: 'center', padding: '0 12px',
            fontSize: mono ? 15 : 12,
            fontWeight: mono ? 800 : 600,
            color: value ? 'var(--text-1)' : 'var(--text-4)',
            fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
            cursor: 'text',
          }}
        >
          {value || (field === 'ref' ? 'Reference…' : moneyPlaceholder())}
        </div>
      </div>
    )
  }

  const actionBtn = (label, onClick, variant = 'default') => {
    const styles = {
      default: {
        background: '#fff',
        border: '1.5px solid var(--border)',
        color: 'var(--text-2)',
      },
      danger: {
        background: 'var(--red-bg)',
        border: '1.5px solid var(--red-border)',
        color: 'var(--red)',
      },
    }
    const s = styles[variant] || styles.default
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseDown={press}
        onMouseUp={release}
        style={{
          flex: 1, height: 38, borderRadius: 10,
          fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
          cursor: 'pointer', transition: 'all 0.12s', ...s,
        }}
        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.96)' }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      ref={overlayRef}
      data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.44)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'sp-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes sp-fade  { from{opacity:0} to{opacity:1} }
        @keyframes sp-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 700, maxWidth: '96vw', maxHeight: '94vh',
          background: '#fff', borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 28px 72px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          animation: 'sp-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Layers size={16} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Settlement
                </p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Split Payment</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Bill Total', value: fmtMoney(netAmount), accent: false },
              { label: 'Remaining', value: fmtMoney(remaining), accent: !balanced },
              { label: 'Paid', value: fmtMoney(billTotal), accent: false },
            ].map(chip => (
              <div
                key={chip.label}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
                }}
              >
                {chip.label}{' '}
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 16,
                  fontWeight: 800,
                  color: chip.accent ? '#fecaca' : '#fff',
                }}>
                  {chip.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px', overflow: 'auto', flex: 1 }}>

          {/* Mode buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
            {PAY_MODES.map(m => {
              const active = payMode === m.key
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setPayMode(m.key)}
                  style={{
                    height: 40, borderRadius: 10,
                    border: `1.5px solid ${active ? m.border : 'var(--border)'}`,
                    background: active ? m.bg : 'var(--surface)',
                    color: active ? m.color : 'var(--text-3)',
                    fontSize: 11, fontWeight: 800, cursor: 'pointer',
                    transition: 'all 0.12s',
                    boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Input + numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 228px', gap: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fieldRow('Amount', 'amount', amount)}
              {fieldRow('Tip', 'tip', tip)}
              {fieldRow('Ref', 'ref', ref, false)}
              <button
                type="button"
                onClick={addRow}
                onMouseDown={press}
                onMouseUp={release}
                style={{
                  marginTop: 4, height: 42, borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
                  color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: 0.4,
                  cursor: 'pointer', boxShadow: '0 3px 12px rgba(107,0,0,0.2)',
                }}
              >
                ADD PAYMENT
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={useRemaining}
                style={{
                  width: '100%', height: 36, marginBottom: 8, borderRadius: 10,
                  border: '1.5px solid var(--green-border)',
                  background: 'var(--green-bg)', color: 'var(--green)',
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                }}
              >
                Use Remaining
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {NUM_ROWS.flat().map(k => (
                  <NumBtn key={k} label={k} onClick={() => appendKey(k)} />
                ))}
                <NumBtn label={<Delete size={15} />} onClick={backspace} />
                <NumBtn
                  label="C"
                  onClick={clearField}
                  style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}
                />
                <NumBtn
                  label="ADD"
                  onClick={addRow}
                  style={{
                    background: 'var(--purple-bg)',
                    borderColor: 'var(--purple-border)',
                    color: 'var(--purple)',
                    fontWeight: 800,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{
            border: '1.5px solid var(--border)', borderRadius: 12,
            overflow: 'hidden', background: 'var(--surface)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Ref', 'Mode', 'Amount', 'Tip'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 10px', textAlign: 'left', fontWeight: 800,
                        fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--text-4)', fontWeight: 600 }}>
                      No payments added
                    </td>
                  </tr>
                ) : rows.map(r => {
                  const selected = r.id === selectedId
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{
                        background: selected ? 'var(--brand-bg)' : '#fff',
                        color: selected ? 'var(--brand)' : 'var(--text-1)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{r.payerNo}</td>
                      <td style={{ padding: '8px 10px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.refNo || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.payMode}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>
                        {fmtMoney(r.amount)}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmtMoney(r.tip)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {actionBtn('Remove Selected', removeSelected)}
            {actionBtn('Clear All', clearAll, 'danger')}
          </div>

          {error && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 10,
              background: 'var(--red-bg)', border: '1.5px solid var(--red-border)',
              color: 'var(--red)', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 20,
            marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
            fontSize: 12, fontWeight: 700, color: 'var(--text-2)',
          }}>
            <span>Paid <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)' }}>{fmtMoney(billTotal)}</span></span>
            <span>Tips <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-1)' }}>{fmtMoney(tipTotal)}</span></span>
            <span>
              Grand Total{' '}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--green)', fontWeight: 800 }}>
                {fmtMoney(grandTotal)}
              </span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 8, padding: '12px 18px 16px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
        }}>
          <button
            type="button"
            onClick={done}
            disabled={!canDone}
            onMouseDown={press}
            onMouseUp={release}
            style={{
              flex: 1, height: 46, borderRadius: 10, border: 'none',
              background: canDone
                ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                : 'var(--border)',
              color: canDone ? '#fff' : 'var(--text-4)',
              fontSize: 13, fontWeight: 900, letterSpacing: 0.5,
              cursor: canDone ? 'pointer' : 'not-allowed',
              boxShadow: canDone ? '0 4px 14px rgba(107,0,0,0.22)' : 'none',
            }}
          >
            Done
          </button>
          <button
            type="button"
            onClick={onClose}
            onMouseDown={press}
            onMouseUp={release}
            style={{
              flex: 1, height: 46, borderRadius: 10,
              border: '1.5px solid var(--red-border)',
              background: 'var(--red-bg)', color: 'var(--red)',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
