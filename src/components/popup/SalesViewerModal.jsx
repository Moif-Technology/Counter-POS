import { useCallback, useEffect, useRef, useState } from 'react'
import {
  X, Receipt, Calendar, User, Search, RefreshCw, Loader2, ChevronDown, Printer,
} from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { api } from '../../lib/api'
import { fmtMoney } from '../../lib/currencyFormat'
import { fmtQty } from '../../lib/utils'
import { salesViewerSummaryRows } from '../../lib/salesViewerSummary'
import { printBillReceipt } from '../../lib/printBillReceipt'
import { posNotifyError } from '../../lib/posNotify'

import { isMultiPaymentMode, normalizePaymentMode } from '../../lib/paymentModes'

function isMultiPayment(mode) {
  return isMultiPaymentMode(mode)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function SearchableCustomerFilter({ accessToken, customerId, onSelect }) {
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(false)
  const wrapRef  = useRef()
  const debRef   = useRef()

  const doSearch = useCallback(async (q) => {
    setLoading(true)
    try {
      const { customers } = await api.counterPos.customerSearch(q, 200, accessToken)
      setResults(customers ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { doSearch('') }, [doSearch])

  useEffect(() => {
    if (!customerId) {
      setSelected(null)
      return
    }
    if (selected?.customerId === Number(customerId)) return
    api.counterPos.customerSearch('', 200, accessToken)
      .then(r => {
        const c = (r.customers ?? []).find(x => String(x.customerId) === String(customerId))
        if (c) setSelected(c)
      })
      .catch(() => {})
  }, [customerId, accessToken, selected?.customerId])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const scheduleSearch = (q) => {
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => doSearch(q), 280)
  }

  const pick = (c) => {
    setSelected(c)
    onSelect(c ? String(c.customerId) : '')
    setQuery('')
    setOpen(false)
  }

  const displayLabel = selected
    ? `${selected.customerCode} — ${selected.customerName}`
    : 'All customers'

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <User size={11} /> Customer
      </label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 38, boxSizing: 'border-box',
          borderRadius: 8, border: `1.5px solid ${open ? 'var(--brand)' : 'var(--border)'}`,
          background: open ? 'var(--brand-bg)' : '#fff',
          fontSize: 12, padding: '0 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
          textAlign: 'left', color: 'var(--text-1)', fontWeight: 600,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLabel}</span>
        <ChevronDown size={14} color="var(--text-3)" style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 30,
          background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <Search size={14} color="var(--text-3)" />
            <input
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); scheduleSearch(e.target.value) }}
              placeholder="Search code or name…"
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 12, fontWeight: 600,
                background: 'transparent', color: 'var(--text-1)',
              }}
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); scheduleSearch('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-3)' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div
            onClick={() => pick(null)}
            style={{
              padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              color: !customerId ? 'var(--brand)' : 'var(--text-2)',
              background: !customerId ? 'var(--brand-bg)' : '#fff',
              borderBottom: '1px solid var(--border)',
            }}
          >
            All customers
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: 14, textAlign: 'center', fontSize: 11, color: 'var(--text-4)' }}>
                <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              </div>
            )}
            {!loading && results.length === 0 && (
              <div style={{ padding: 14, textAlign: 'center', fontSize: 11, color: 'var(--text-4)' }}>No customers found</div>
            )}
            {!loading && results.map(c => {
              const active = String(c.customerId) === String(customerId)
              return (
                <div
                  key={c.customerId}
                  onClick={() => pick(c)}
                  style={{
                    padding: '9px 12px', cursor: 'pointer', fontSize: 12,
                    borderBottom: '1px solid var(--border)',
                    background: active ? 'var(--brand-bg)' : '#fff',
                    color: active ? 'var(--brand)' : 'var(--text-1)',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#fff' }}
                >
                  <div style={{ fontWeight: 700 }}>{c.customerName}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{c.customerCode}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function BillDetailModal({ salesId, accessToken, onClose }) {
  const shopName = usePosStore(s => s.shopName)
  const [bill, setBill]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [error, setError]     = useState(null)
  const overlayRef = useRef()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.counterPos.salesViewerBill(salesId, accessToken)
      .then(data => { if (!cancelled) setBill(data) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [salesId, accessToken])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handlePrint() {
    if (printing || loading) return
    setPrinting(true)
    try {
      await printBillReceipt(salesId, accessToken, { companyName: shopName })
    } catch (e) {
      posNotifyError(e.message ?? 'Print failed', { title: 'Print Invoice' })
    } finally {
      setPrinting(false)
    }
  }

  const gridCols = 'minmax(70px,1fr) minmax(120px,2fr) 60px 70px 60px 70px 80px'

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(15,13,10,0.5)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 720, maxWidth: '96vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>
              Bill with details
            </p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>
              {bill?.billNoDisplay ?? `Bill #${salesId}`}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: 16, color: 'var(--red)', fontWeight: 600, fontSize: 13 }}>{error}</div>
          )}
          {!loading && bill && (
            <>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14,
              }}>
                {[
                  ['Date', fmtDateTime(bill.billDate)],
                  ['Payment', normalizePaymentMode(bill.paymentMode)],
                  ['Customer', bill.customer?.customerName ?? 'Walk-in'],
                  ['Staff', bill.staffName ?? '—'],
                  ['Counter', bill.counterNo],
                  ['Close No', bill.counterCloseNo],
                  ...(bill.remarks?.trim()
                    ? [['Comments', bill.remarks.trim()]]
                    : []),
                ].map(([k, v]) => (
                  <div key={k} style={{
                    padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    gridColumn: k === 'Comments' ? '1 / -1' : undefined,
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginTop: 2,
                      whiteSpace: k === 'Comments' ? 'pre-wrap' : undefined,
                    }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: gridCols,
                  background: 'var(--surface-2)', padding: '8px 10px', borderBottom: '1.5px solid var(--border)',
                }}>
                  {['Code', 'Description', 'Qty', 'Price', 'VAT', 'Disc', 'Total'].map(h => (
                    <span key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
                  ))}
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {(bill.items ?? []).map((it, i) => (
                    <div
                      key={it.salesChildId ?? i}
                      style={{
                        display: 'grid', gridTemplateColumns: gridCols,
                        padding: '8px 10px', borderBottom: '1px solid var(--border)',
                        background: i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                        fontSize: 11,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{it.productCode}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.description}</span>
                      <span style={{ textAlign: 'right' }}>{fmtQty(it.qty)}</span>
                      <span style={{ textAlign: 'right' }}>{fmtMoney(it.unitPrice)}</span>
                      <span style={{ textAlign: 'right' }}>{fmtMoney(it.vatAmt)}</span>
                      <span style={{ textAlign: 'right' }}>{fmtMoney(it.discount)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(it.lineTotal)}</span>
                    </div>
                  ))}
                  {(bill.items ?? []).length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>No line items</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ minWidth: 220 }}>
                  {salesViewerSummaryRows(bill).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-3)' }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{fmtMoney(v)}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', padding: '8px 0 0',
                    borderTop: '2px solid var(--border)', marginTop: 6,
                    fontSize: 14, fontWeight: 800,
                  }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--brand)' }}>{fmtMoney(bill.amount)}</span>
                  </div>

                  {isMultiPayment(bill.paymentMode) && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <div style={{
                        fontSize: 9, fontWeight: 800, color: 'var(--purple)',
                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
                      }}>
                        Split Payment
                      </div>
                      {(bill.paymentSplits ?? []).length > 0 ? (
                        <div style={{
                          border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden',
                        }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '28px 1fr 72px 64px 52px',
                            gap: 6,
                            background: 'var(--surface-2)',
                            padding: '6px 8px',
                            borderBottom: '1px solid var(--border)',
                          }}>
                            {['#', 'Mode', 'Amount', 'Tip', 'Ref'].map(h => (
                              <span key={h} style={{
                                fontSize: 8, fontWeight: 700, color: 'var(--text-3)',
                                textTransform: 'uppercase',
                                textAlign: h === 'Amount' || h === 'Tip' ? 'right' : 'left',
                              }}>
                                {h}
                              </span>
                            ))}
                          </div>
                          {bill.paymentSplits.map(s => (
                            <div
                              key={s.payerNo}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '28px 1fr 72px 64px 52px',
                                gap: 6,
                                padding: '6px 8px',
                                borderBottom: '1px solid var(--border)',
                                fontSize: 10,
                                background: '#fff',
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>{s.payerNo}</span>
                              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.payMode}
                              </span>
                              <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                                {fmtMoney(s.amount)}
                              </span>
                              <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                                {fmtMoney(s.tip ?? 0)}
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-3)' }}>
                                {s.refNo || '—'}
                              </span>
                            </div>
                          ))}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '6px 8px', background: 'var(--purple-bg)',
                            fontSize: 10, fontWeight: 800, color: 'var(--purple)',
                          }}>
                            <span>Split total</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {fmtMoney(bill.paymentSplits.reduce((a, s) => a + Number(s.amount || 0), 0))}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          padding: '10px 12px', borderRadius: 8,
                          background: 'var(--surface-2)', border: '1px solid var(--border)',
                          fontSize: 11, color: 'var(--text-4)', fontWeight: 600,
                        }}>
                          No split rows recorded for this bill.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            disabled={loading || printing || !!error}
            onClick={handlePrint}
            style={{
              height: 34, padding: '0 18px', borderRadius: 9,
              border: 'none',
              background: loading || error ? 'var(--surface-3)' : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: loading || error ? 'var(--text-4)' : '#fff',
              fontSize: 12, fontWeight: 700, cursor: loading || error ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: loading || error ? 'none' : '0 2px 10px rgba(107,0,0,0.25)',
            }}
          >
            <Printer size={14} /> {printing ? 'Printing…' : 'Print Invoice'}
          </button>
          <button onClick={onClose} style={{
            height: 34, padding: '0 18px', borderRadius: 9,
            border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
            color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const GRID_COLS = '90px 70px 75px 85px 1fr 80px 80px'

export default function SalesViewerModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)

  const [dateFrom, setDateFrom]     = useState(todayISO())
  const [dateTo, setDateTo]         = useState(todayISO())
  const [customerId, setCustomerId] = useState('')
  const [bills, setBills]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [detailId, setDetailId]     = useState(null)
  const overlayRef = useRef()

  const loadBills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { bills: list } = await api.counterPos.salesViewerList({
        counterNo,
        dateFrom,
        dateTo,
        customerId: customerId || undefined,
        limit: 300,
      }, accessToken)
      setBills(list ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, counterNo, dateFrom, dateTo, customerId])

  useEffect(() => { loadBills() }, [loadBills])

  useEffect(() => {
    const onKey = e => {
      if (detailId) return
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, detailId])

  const totalAmount = bills.reduce((s, b) => s + Number(b.amount || 0), 0)

  return (
    <>
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.50)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{
        width: 820, maxWidth: '96vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.20)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Receipt size={17} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', margin: 0 }}>
                Reports
              </p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>Sales Viewer</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <SearchableCustomerFilter
              accessToken={accessToken}
              customerId={customerId}
              onSelect={setCustomerId}
            />
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Calendar size={11} /> From
              </label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12, padding: '0 8px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Calendar size={11} /> To
              </label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12, padding: '0 8px', boxSizing: 'border-box' }} />
            </div>
            <button onClick={loadBills} style={{
              height: 38, padding: '0 14px', borderRadius: 8,
              border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
              color: 'var(--brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>
              <RefreshCw size={14} /> Load
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 16px 12px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: GRID_COLS,
            background: 'var(--surface-2)', padding: '9px 10px', borderRadius: '10px 10px 0 0',
            border: '1.5px solid var(--border)', borderBottom: 'none', marginTop: 12,
          }}>
            {['Bill Date', 'Bill No', 'Bill Time', 'Payment', 'Customer', 'Amount', 'Close No'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
            ))}
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', border: '1.5px solid var(--border)',
            borderRadius: '0 0 10px 10px', minHeight: 280,
          }}>
            {loading && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Loading…
              </div>
            )}
            {!loading && error && (
              <div style={{ padding: 16, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>{error}</div>
            )}
            {!loading && !error && bills.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>No bills found for selected filters</div>
            )}
            {!loading && !error && bills.map((b, i) => (
              <button
                key={b.salesId}
                type="button"
                title={b.remarks ? `Comment: ${b.remarks}` : undefined}
                onClick={() => setDetailId(b.salesId)}
                style={{
                  width: '100%', display: 'grid', gridTemplateColumns: GRID_COLS,
                  padding: '9px 10px', border: 'none', borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                  fontSize: 11, textAlign: 'left', cursor: 'pointer', color: 'var(--text-1)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : 'var(--surface-2)' }}
              >
                <span>{fmtDate(b.billDate)}</span>
                <span style={{ fontWeight: 700 }}>{b.billNoDisplay ?? b.billNo}</span>
                <span>{fmtTime(b.billTime)}</span>
                <span>{normalizePaymentMode(b.paymentMode)}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.customerName}</span>
                <span style={{ fontWeight: 700, textAlign: 'right' }}>{fmtMoney(b.amount)}</span>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{b.counterCloseNo}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
            {bills.length} bill{bills.length !== 1 ? 's' : ''} · Total {fmtMoney(totalAmount)}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-4)' }}>Click a row to open bill with details</span>
          <button onClick={onClose} style={{
            height: 34, padding: '0 18px', borderRadius: 9,
            border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
            color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'background 0.12s, color 0.12s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
          >
            <X size={13} /> Close
          </button>
        </div>
      </div>
    </div>

    {detailId != null && (
      <BillDetailModal
        salesId={detailId}
        accessToken={accessToken}
        onClose={() => setDetailId(null)}
      />
    )}
    </>
  )
}
