import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Truck, AlertCircle, Loader2, CheckCircle2, Layers, ScanLine, RotateCcw } from 'lucide-react'
import { api } from '../../lib/api'
import { usePosStore } from '../../store/posStore'
import { fmtMoney, roundMoney } from '../../lib/currencyFormat'
import { parseDeliveryBarcode } from '../../lib/deliveryBarcode'
import MultiPaymentModal from './MultiPaymentModal'

import { DELIVERY_SETTLEMENT_PAY_MODES, PM, isMultiPaymentMode } from '../../lib/paymentModes'

function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function mapDeliveryRow(d) {
  const net = Number(d.amount ?? 0)
  return {
    salesId: d.sales_id,
    holdNo: d.hold_no,
    customerName: d.customer_name ?? '—',
    customerCode: d.customer_code ?? '',
    deliveryTime: d.delivery_time,
    remarks: d.remarks ?? '',
    netAmount: net,
    selected: false,
    paymentMode: PM.CREDITCARD,
    paidAmount: net.toFixed(2),
    paymentSplits: null,
  }
}

export default function DeliverySettlementModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo = usePosStore(s => s.counterNo)
  const overlayRef = useRef()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [multiRow, setMultiRow] = useState(null)
  const [scanInput, setScanInput] = useState('')
  const [recalling, setRecalling] = useState(false)
  const scanInputRef = useRef()

  const selectedRows = useMemo(() => rows.filter(r => r.selected), [rows])
  const selectedTotal = useMemo(
    () => roundMoney(selectedRows.reduce((s, r) => s + r.netAmount, 0)),
    [selectedRows],
  )

  const touchBtn = {
    height: 40,
    minWidth: 72,
    padding: '0 14px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    border: '1.5px solid var(--border)',
    background: '#fff',
    color: 'var(--text-2)',
    touchAction: 'manipulation',
  }

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !multiRow) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, multiRow])

  useEffect(() => {
    if (!success) return undefined
    const t = window.setTimeout(() => onClose(), 1300)
    return () => window.clearTimeout(t)
  }, [success, onClose])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.counterPos.getDeliveryBills(accessToken)
        setRows((Array.isArray(data) ? data : []).map(mapDeliveryRow))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [accessToken])

  function toggleRow(salesId) {
    setRows(prev => prev.map(r => (
      r.salesId === salesId ? { ...r, selected: !r.selected } : r
    )))
  }

  function selectAll() {
    setRows(prev => prev.map(r => ({ ...r, selected: true })))
  }

  function clearSelection() {
    setRows(prev => prev.map(r => ({ ...r, selected: false })))
  }

  function patchRow(salesId, patch) {
    setRows(prev => prev.map(r => (r.salesId === salesId ? { ...r, ...patch } : r)))
  }

  function stopRowTap(e) {
    e.stopPropagation()
  }

  function validateRow(r) {
    const mode = r.paymentMode
    if (mode === 'CASH') {
      const paid = Number(r.paidAmount)
      if (!Number.isFinite(paid) || paid < r.netAmount - 0.02) {
        return `${r.holdNo}: cash paid must be at least ${fmtMoney(r.netAmount)}`
      }
    }
    if (isMultiPaymentMode(mode)) {
      if (!r.paymentSplits?.length) {
        return `${r.holdNo}: configure multi pay split`
      }
      const total = r.paymentSplits.reduce((s, x) => s + (Number(x.amount) || 0), 0)
      if (Math.abs(total - r.netAmount) > 0.02) {
        return `${r.holdNo}: split total must match ${fmtMoney(r.netAmount)}`
      }
    }
    return null
  }

  function selectDeliveryByNo(deliveryNo) {
    const n = String(deliveryNo)
    const found = rows.some(r => String(r.holdNo) === n)
    if (!found) {
      setError(`Delivery ${deliveryNo} not found`)
      return false
    }
    setRows(prev => prev.map(r => ({
      ...r,
      selected: String(r.holdNo) === n,
    })))
    setError(null)
    return true
  }

  async function handleBringToCounter(fromScan = false) {
    const deliveryNo = fromScan
      ? parseDeliveryBarcode(scanInput)
      : (selectedRows.length === 1 ? selectedRows[0].holdNo : parseDeliveryBarcode(scanInput))
    if (deliveryNo == null) {
      setError(fromScan ? 'Scan or enter delivery number' : 'Select one delivery or scan barcode')
      return
    }
    if (recalling) return
    setRecalling(true)
    setError(null)
    try {
      await usePosStore.getState().recallDeliveryByNo(deliveryNo)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setRecalling(false)
    }
  }

  function handleScanInputKeyDown(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const deliveryNo = parseDeliveryBarcode(scanInput)
    if (deliveryNo == null) {
      setError('Invalid delivery barcode — scan slip or enter number')
      return
    }
    if (selectDeliveryByNo(deliveryNo)) {
      setScanInput(String(deliveryNo))
      setError(null)
    }
  }

  async function handleBulkSettle() {
    if (!selectedRows.length || settling) return

    for (const r of selectedRows) {
      const msg = validateRow(r)
      if (msg) { setError(msg); return }
    }

    setSettling(true)
    setError(null)
    setSuccess(null)
    try {
      const items = selectedRows.map(r => {
        const paid = r.paymentMode === 'CASH' ? Number(r.paidAmount) : r.netAmount
        return {
          salesId: r.salesId,
          holdNo: r.holdNo,
          paymentMode: r.paymentMode,
          paidAmount: paid,
          balanceAmount: roundMoney(paid - r.netAmount),
          paymentSplits: isMultiPaymentMode(r.paymentMode) ? r.paymentSplits : undefined,
        }
      })

      const result = await api.counterPos.settleDeliveryBulk({ counterNo, items }, accessToken)
      const settledIds = new Set((result.results ?? []).map(x => x.salesId))
      setRows(prev => prev.filter(r => !settledIds.has(r.salesId)))
      setSuccess(result.message ?? `${result.count} invoice(s) posted`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSettling(false)
    }
  }

  return (
    <>
    <div
      ref={overlayRef}
      data-pos-overlay
      onClick={e => e.target === overlayRef.current && !multiRow && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.42)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 920, maxWidth: '97vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Truck size={18} color="#fff" />
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Post invoice after payment
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Delivery Settlement</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={14} /></button>
        </div>

        {error && (
          <div style={{
            margin: '10px 16px 0', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)',
          }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexWrap: 'wrap',
        }}>
          <button type="button" onClick={selectAll} style={touchBtn}>Select all</button>
          <button type="button" onClick={clearSelection} style={touchBtn}>Clear</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
            {selectedRows.length} selected · {fmtMoney(selectedTotal)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 4 }}>
            Tap a row to select
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <ScanLine size={16} color="var(--text-3)" />
            <input
              ref={scanInputRef}
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={handleScanInputKeyDown}
              placeholder="Scan delivery no…"
              style={{
                width: 130, height: 40, borderRadius: 10, border: '1.5px solid var(--border)',
                padding: '0 12px', fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
              }}
            />
            <button
              type="button"
              onClick={() => handleBringToCounter(false)}
              disabled={recalling}
              style={{
                ...touchBtn,
                border: '1.5px solid var(--brand-border)',
                background: 'var(--brand-bg)',
                color: 'var(--brand)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: recalling ? 0.6 : 1,
              }}
            >
              <RotateCcw size={14} />
              {recalling ? 'Loading…' : (selectedRows.length === 1 ? 'Bring Selected' : 'Bring to Counter')}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '10px 12px' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
              No pending deliveries
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.map(r => {
                const selected = r.selected
                return (
                  <div
                    key={r.salesId}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleRow(r.salesId)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(r.salesId) } }}
                    style={{
                      borderRadius: 14,
                      border: selected ? '2.5px solid var(--brand)' : '1.5px solid var(--border)',
                      background: selected ? 'var(--brand-bg)' : '#fff',
                      boxShadow: selected ? '0 4px 14px rgba(107,0,0,0.08)' : 'var(--shadow-xs)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                      userSelect: 'none',
                      transition: 'border-color 0.12s, background 0.12s',
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 14px 10px',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        border: selected ? 'none' : '2px solid var(--border)',
                        background: selected ? 'var(--brand)' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <CheckCircle2 size={18} color="#fff" strokeWidth={2.5} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--brand)' }}>{r.holdNo}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.customerName}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                          {r.customerCode ? `${r.customerCode} · ` : ''}{fmtDateTime(r.deliveryTime)}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 17, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace",
                        color: 'var(--text-1)', flexShrink: 0,
                      }}>
                        {fmtMoney(r.netAmount)}
                      </div>
                    </div>

                    <div
                      onClick={stopRowTap}
                      onKeyDown={stopRowTap}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                        padding: '10px 14px 14px',
                        borderTop: '1px solid ' + (selected ? 'var(--brand-border)' : 'var(--border)'),
                        background: selected ? 'rgba(255,255,255,0.55)' : 'var(--surface-2)',
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Payment
                      </span>
                      <select
                        value={r.paymentMode}
                        onChange={e => {
                          const mode = e.target.value
                          patchRow(r.salesId, {
                            paymentMode: mode,
                            paymentSplits: isMultiPaymentMode(mode) ? r.paymentSplits : null,
                            paidAmount: mode === 'CASH' ? r.netAmount.toFixed(2) : r.paidAmount,
                          })
                        }}
                        style={{
                          height: 40, borderRadius: 10, border: '1.5px solid var(--border)',
                          padding: '0 12px', fontSize: 12, fontWeight: 700, minWidth: 110,
                          background: '#fff',
                        }}
                      >
                        {DELIVERY_SETTLEMENT_PAY_MODES.map(m => (
                          <option key={m.key} value={m.key}>{m.label}</option>
                        ))}
                      </select>
                      {isMultiPaymentMode(r.paymentMode) && (
                        <button
                          type="button"
                          onClick={() => setMultiRow(r)}
                          style={{
                            height: 40, padding: '0 14px', borderRadius: 10,
                            border: '1.5px solid var(--purple-border)', background: 'var(--purple-bg)',
                            color: 'var(--purple)', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                          }}
                        >
                          <Layers size={14} />
                          {r.paymentSplits?.length ? 'Edit Split' : 'Split'}
                        </button>
                      )}
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' }}>
                          Paid
                        </span>
                        {r.paymentMode === 'CASH' ? (
                          <input
                            value={r.paidAmount}
                            onChange={e => patchRow(r.salesId, { paidAmount: e.target.value })}
                            style={{
                              width: 100, height: 40, textAlign: 'right', borderRadius: 10,
                              border: '1.5px solid var(--border)', padding: '0 12px',
                              fontFamily: 'monospace', fontWeight: 800, fontSize: 14, background: '#fff',
                            }}
                          />
                        ) : isMultiPaymentMode(r.paymentMode) ? (
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', minWidth: 80, textAlign: 'right' }}>
                            {r.paymentSplits?.length ? fmtMoney(r.netAmount) : '—'}
                          </span>
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, minWidth: 80, textAlign: 'right' }}>
                            {fmtMoney(r.netAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Tap rows to select · scan barcode to pick one delivery
          </span>
          <button
            onClick={handleBulkSettle}
            disabled={settling || !selectedRows.length}
            style={{
              height: 48, minWidth: 180, padding: '0 28px', borderRadius: 12, border: 'none',
              cursor: settling || !selectedRows.length ? 'not-allowed' : 'pointer',
              background: settling || !selectedRows.length
                ? 'var(--surface-3)' : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: settling || !selectedRows.length ? 'var(--text-4)' : '#fff',
              fontWeight: 800, fontSize: 14, touchAction: 'manipulation',
              boxShadow: settling || !selectedRows.length ? 'none' : '0 4px 14px rgba(107,0,0,0.2)',
            }}
          >
            {settling ? 'Posting…' : `Settle (${selectedRows.length})`}
          </button>
        </div>
      </div>
      {success && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,13,10,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            minWidth: 280,
            maxWidth: '80vw',
            background: '#fff',
            borderRadius: 18,
            padding: '24px 28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
            border: '1.5px solid var(--brand-border)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56,
              height: 56,
              margin: '0 auto 12px',
              borderRadius: '50%',
              background: 'var(--brand-bg)',
              color: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle2 size={30} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>Settlement Done</div>
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>{success}</div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-4)' }}>Closing automatically...</div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>

    {multiRow && (
      <MultiPaymentModal
        billAmount={multiRow.netAmount}
        initialSplits={multiRow.paymentSplits}
        onConfirm={(splits) => {
          patchRow(multiRow.salesId, { paymentSplits: splits })
          setMultiRow(null)
        }}
        onClose={() => setMultiRow(null)}
      />
    )}
    </>
  )
}
