import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ClipboardList, Printer, XCircle, RefreshCw } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { api } from '../../lib/api'
import { fmt3 } from '../../lib/utils'
import { fmtMoney, moneyPlaceholder } from '../../lib/currencyFormat'
import { printCounterReport } from '../../lib/printCounterReport'
import { getReceiptPrintMetaFromStore } from '../../lib/receiptPrintTheme'
import { posNotifyWarning } from '../../lib/posNotify'

const DENOMS = [
  { label: '1000', value: 1000  },
  { label: '500',  value: 500   },
  { label: '200',  value: 200   },
  { label: '100',  value: 100   },
  { label: '50',   value: 50    },
  { label: '20',   value: 20    },
  { label: '10',   value: 10    },
  { label: '5',    value: 5     },
  { label: '1',    value: 1     },
  { label: '.50',  value: 0.50  },
  { label: '.25',  value: 0.25  },
  { label: '.10',  value: 0.10  },
]

const initCounts = () => Object.fromEntries(DENOMS.map(d => [d.label, '']))

export default function CounterReadingModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const [summary,     setSummary]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [submitting,  setSubmitting]  = useState(null) // 'X' | 'Z' | null
  const [closeResult, setCloseResult] = useState(null) // last close response

  const [counts,       setCounts]      = useState(initCounts)
  const [activeDenom,  setActiveDenom] = useState('1000')
  const [manualInput,  setManualInput] = useState('')
  const overlayRef = useRef()

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.counterPos.counterSummary(counterNo, accessToken)
      setSummary(data)
    } catch (err) {
      setError(err.message ?? 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }, [counterNo, accessToken])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  useEffect(() => {
    const onKey = e => {
      // Don't close if user is typing in an input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const denomTotal = DENOMS.reduce((sum, d) => {
    return sum + d.value * (parseFloat(counts[d.label]) || 0)
  }, 0)

  // Manual input takes priority over denomination total
  const collectedAmount = manualInput !== '' ? (parseFloat(manualInput) || 0) : denomTotal

  const cashToCollect  = summary ? Number(summary.cashToBeCollected) : 0
  const cashDifference = collectedAmount - cashToCollect

  const handleKey = k => {
    if (k === 'C') { setCounts(c => ({ ...c, [activeDenom]: '' })); return }
    if (k === '⌫') { setCounts(c => ({ ...c, [activeDenom]: c[activeDenom].slice(0, -1) })); return }
    if (k === '.') {
      setCounts(c => {
        const cur = c[activeDenom]
        if (cur.includes('.')) return c
        return { ...c, [activeDenom]: cur + '.' }
      })
      return
    }
    setCounts(c => ({ ...c, [activeDenom]: c[activeDenom] + k }))
  }

  const handleReport = async (reportType) => {
    if (submitting || loading) return
    setSubmitting(reportType)
    setError(null)
    try {
      const result = await api.counterPos.counterClose({
        counterNo,
        reportType,
        collectedCash: collectedAmount,
      }, accessToken)
      const printPayload = { ...summary, ...result, collectedCash: collectedAmount, cashDifference: collectedAmount - (summary?.cashToBeCollected ?? 0) }
      try {
        await printCounterReport(printPayload, {
          ...getReceiptPrintMetaFromStore(),
          reportType,
          closeNo: result.closeNo ?? '',
          reportAt: new Date(),
        })
      } catch (printErr) {
        posNotifyWarning(printErr.message ?? `${reportType}-Report saved but print failed`, {
          title: `${reportType}-Report Print`,
        })
      }
      setCloseResult({ ...result, reportType })
      if (reportType === 'Z') {
        setCounts(initCounts())
        setManualInput('')
      }
      await fetchSummary()
    } catch (err) {
      setError(err.message ?? `${reportType}-Report failed`)
    } finally {
      setSubmitting(null)
    }
  }

  const press   = e => { e.currentTarget.style.transform = 'scale(0.91)' }
  const release = e => { e.currentTarget.style.transform = 'scale(1)' }

  const NumBtn = ({ label, keyVal, flex = 1, style = {}, onClick }) => (
    <button
      onClick={onClick ?? (() => handleKey(keyVal ?? label))}
      onMouseDown={press} onMouseUp={release}
      style={{
        flex, height: 50, borderRadius: 10,
        border: '1.5px solid var(--border)', background: '#fff',
        color: 'var(--text-1)', fontSize: 18, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        ...style,
      }}
      onMouseEnter={e => {
        if (style.background) { e.currentTarget.style.filter = 'brightness(0.92)'; return }
        e.currentTarget.style.background  = 'var(--brand-bg)'
        e.currentTarget.style.borderColor = 'var(--brand-border)'
        e.currentTarget.style.color       = 'var(--brand)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = 'brightness(1)'
        if (!style.background) {
          e.currentTarget.style.background  = '#fff'
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color       = 'var(--text-1)'
        }
      }}
    >
      {label}
    </button>
  )

  // Build summary rows from API data
  const summaryRows = summary ? [
    { label: 'Total Cash',              value: fmt3(summary.totalCash),          accent: false },
    { label: 'Total Credit',            value: fmt3(summary.totalCredit),         accent: false },
    { label: 'Total Card',              value: fmt3(summary.totalCard),           accent: false },
    { label: 'Credit Receipt (Cash)',   value: fmt3(summary.creditReceiptCash),   accent: 'green' },
    { label: 'Credit Receipt (Card)',   value: fmt3(summary.creditReceiptCard),   accent: 'green' },
    { label: 'Refund Amt',              value: fmt3(summary.totalRefund),         accent: false },
    { label: 'Total Cash IN',           value: fmt3(summary.cashIn),              accent: 'green' },
    { label: 'Total Cash Out',          value: fmt3(summary.cashOut),             accent: 'red' },
    { label: 'Cash To Be Collected',    value: fmt3(summary.cashToBeCollected), accent: 'brand', large: true },
    { label: 'Total Discount',          value: fmt3(summary.totalDiscount),       accent: false },
    { label: 'Tax Amount',              value: fmt3(summary.totalTax),            accent: false },
    { label: 'Total Sales',             value: fmt3(summary.grossAmount),         accent: 'brand', large: true },
  ] : []

  const billRows = summary ? [
    ['Bill Count',         summary.billCount],
    ['Cash Bill',          summary.cashBillCount],
    ['Credit Bill',        summary.creditBillCount],
    ['CREDITCARD',         summary.cardBillCount],
    ['MULTIPAYMENT',       summary.multiBillCount],
  ] : []

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(10,8,6,0.5)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'cr-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes cr-fade  { from{opacity:0} to{opacity:1} }
        @keyframes cr-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .denom-row:hover { background: var(--brand-bg) !important; }
        @media (max-width: 900px) {
          .cr-right { width: 200px !important; }
        }
        @media (max-width: 768px) {
          .cr-left { display: none !important; }
          .cr-right { width: 220px !important; }
        }
        @media (max-width: 640px) {
          .cr-body { flex-direction: column !important; overflow-y: auto !important; }
          .cr-mid { flex: none !important; width: 100% !important; max-width: 100% !important; border-right: none !important; min-height: 260px; }
          .cr-right { width: 100% !important; border-top: 1px solid var(--border) !important; max-height: 300px; overflow-y: auto; }
          .cr-footer { flex-wrap: wrap !important; }
          .cr-footer button { flex: 1 1 40% !important; }
        }
      `}</style>

      <div style={{
        width: 1080, maxWidth: '99vw', maxHeight: '95vh',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column',
        animation: 'cr-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ClipboardList size={17} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Reports</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Counter Reading</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={fetchSummary}
              disabled={loading}
              title="Refresh"
              style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={onClose} style={closeBtn}><X size={14} /></button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{
            background: 'var(--red-bg)', borderBottom: '1px solid var(--red-border)',
            padding: '8px 18px', fontSize: 12, color: 'var(--red)', fontWeight: 600,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}>
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── Close result banner ── */}
        {closeResult && (
          <div style={{
            background: closeResult.reportType === 'Z' ? 'var(--green-bg)' : 'rgba(59,130,246,0.08)',
            borderBottom: `1px solid ${closeResult.reportType === 'Z' ? 'var(--green-border)' : 'rgba(59,130,246,0.2)'}`,
            padding: '8px 18px', fontSize: 12,
            color: closeResult.reportType === 'Z' ? 'var(--green)' : '#2563eb',
            fontWeight: 700,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {closeResult.reportType === 'Z'
              ? `Z-Report saved — ${closeResult.closeNo || `#${closeResult.closeId}`} · ${closeResult.billsClosed ?? closeResult.billCount ?? 0} bill(s) closed`
              : 'X-Report — live snapshot (not saved)'
            }
            <button onClick={() => setCloseResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── Body ── */}
        <div className="cr-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT: summary ── */}
          <div className="cr-left" style={{
            flex: 1, minWidth: 260, borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--text-4)', fontSize: 12 }}>
                  Loading...
                </div>
              )}

              {!loading && summaryRows.map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: row.large ? '8px 10px' : '5px 10px',
                  borderRadius: 8,
                  background: row.accent === 'brand'
                    ? 'var(--brand-bg)'
                    : row.accent === 'green'
                    ? 'var(--green-bg)'
                    : row.accent === 'red'
                    ? 'var(--red-bg)'
                    : 'transparent',
                  border: row.accent === 'brand'
                    ? '1px solid var(--brand-border)'
                    : row.accent === 'green'
                    ? '1px solid var(--green-border)'
                    : row.accent === 'red'
                    ? '1px solid var(--red-border)'
                    : '1px solid transparent',
                  marginBlock: row.large ? 4 : 0,
                }}>
                  <span style={{
                    fontSize: row.large ? 11 : 10, fontWeight: 700,
                    color: row.accent === 'brand' ? 'var(--brand)' : row.accent === 'green' ? 'var(--green)' : row.accent === 'red' ? 'var(--red)' : 'var(--text-2)',
                  }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontSize: row.large ? 14 : 12, fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: row.accent === 'brand' ? 'var(--brand)' : row.accent === 'green' ? 'var(--green)' : row.accent === 'red' ? 'var(--red)' : 'var(--text-1)',
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {/* Bill count summary */}
              {!loading && summary && (
                <div style={{ marginTop: 8, padding: '10px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bill Count Summary</p>
                  {billRows.map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{l}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-1)', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                    </div>
                  ))}
                  {summary.creditReceiptCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 600 }}>Credit Receipts</span>
                      <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{summary.creditReceiptCount}</span>
                    </div>
                  )}
                  {summary.startBillNo && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 600 }}>Bill Range</span>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                        {summary.startBillNo} – {summary.endBillNo}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!loading && summary?.cashInOutList?.length > 0 && (
                <div style={{ marginTop: 8, padding: '10px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Cash In / Out ({summary.cashInOutList.length})
                  </p>
                  {summary.cashInOutList.map((row, i) => {
                    const isIn = row.transactionType === 'CASH_IN'
                    return (
                      <div
                        key={row.id ?? i}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '5px 0',
                          borderBottom: i < summary.cashInOutList.length - 1 ? '1px solid var(--border)' : 'none',
                          gap: 8,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: 0.4,
                            color: isIn ? 'var(--green)' : 'var(--red)',
                            textTransform: 'uppercase',
                          }}>
                            {isIn ? 'IN' : 'OUT'}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>
                            {row.remarks || '—'}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 800, flexShrink: 0,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: isIn ? 'var(--green)' : 'var(--red)',
                        }}>
                          {fmt3(row.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── MIDDLE: denomination entry (compact — fixed width) ── */}
          <div className="cr-mid" style={{
            flex: '0 0 228px', width: 228, maxWidth: 228,
            borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '58px 56px 82px', columnGap: 8,
              padding: '8px 12px', background: 'var(--brand-bg)',
              borderBottom: '1px solid rgba(0,0,0,0.1)', flexShrink: 0,
            }}>
              {['Denom', 'Count', 'Amount'].map((h, i) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: i === 2 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {DENOMS.map((d, i) => {
                const isActive = activeDenom === d.label
                const cnt      = parseFloat(counts[d.label]) || 0
                const amt      = fmtMoney(d.value * cnt)
                return (
                  <div
                    key={d.label}
                    className="denom-row"
                    style={{
                      display: 'grid', gridTemplateColumns: '58px 56px 82px', columnGap: 8,
                      padding: '6px 12px', alignItems: 'center',
                      borderBottom: i < DENOMS.length - 1 ? '1px solid var(--border)' : 'none',
                      borderLeft: `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
                      background: isActive ? 'rgba(107,0,0,0.06)' : '#fff',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span
                      onClick={() => setActiveDenom(d.label)}
                      style={{ fontSize: 13, fontWeight: 800, color: isActive ? 'var(--brand)' : 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {d.label}×
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={counts[d.label]}
                      placeholder="0"
                      onFocus={() => setActiveDenom(d.label)}
                      onChange={e => {
                        const v = e.target.value
                        if (v === '' || /^\d*$/.test(v)) {
                          setCounts(c => ({ ...c, [d.label]: v }))
                        }
                      }}
                      onKeyDown={e => e.stopPropagation()}
                      style={{
                        width: 56, maxWidth: 56, height: 32, borderRadius: 7,
                        border: `1.5px solid ${isActive ? 'var(--brand)' : 'var(--border)'}`,
                        background: isActive ? 'var(--brand-bg)' : 'var(--surface)',
                        padding: '0 6px', textAlign: 'center',
                        fontSize: 13, fontWeight: 700,
                        color: counts[d.label] ? 'var(--text-1)' : 'var(--text-4)',
                        fontFamily: "'JetBrains Mono', monospace",
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 700, color: cnt > 0 ? 'var(--green)' : 'var(--text-4)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                      {cnt > 0 ? amt : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT: totals + numpad ── */}
          <div className="cr-right" style={{ width: 240, flexShrink: 0, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Cash to be collected (from API) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={labelSt}>Cash To Collect</span>
              <div style={{
                height: 38, borderRadius: 9,
                border: '1.5px solid var(--brand-border)',
                background: 'var(--brand-bg)',
                display: 'flex', alignItems: 'center', padding: '0 12px',
                fontSize: 15, fontWeight: 900,
                color: 'var(--brand)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {loading ? '...' : fmt3(cashToCollect)}
              </div>
            </div>

            {/* Collected Amount — manual input or denom total */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={labelSt}>Collected Amount</span>
                {manualInput !== '' && (
                  <button
                    onClick={() => setManualInput('')}
                    title="Clear manual — use denomination total"
                    style={{ fontSize: 9, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    USE DENOM
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={manualInput !== '' ? manualInput : denomTotal > 0 ? fmtMoney(denomTotal) : ''}
                onChange={e => {
                  const v = e.target.value
                  // Allow only digits and one decimal point
                  if (v === '' || /^\d*\.?\d*$/.test(v)) setManualInput(v)
                }}
                onBlur={e => {
                  // Format to 3 decimal places on blur
                  const n = parseFloat(e.target.value)
                  if (!isNaN(n)) setManualInput(fmtMoney(n))
                }}
                onKeyDown={e => e.stopPropagation()} // prevent window keydown from firing
                placeholder={moneyPlaceholder()}
                style={{
                  height: 46, borderRadius: 9,
                  border: `1.5px solid ${collectedAmount > 0 ? 'var(--green-border)' : 'var(--border)'}`,
                  background: collectedAmount > 0 ? 'var(--green-bg)' : 'var(--surface)',
                  padding: '0 12px',
                  fontSize: 18, fontWeight: 900,
                  color: collectedAmount > 0 ? 'var(--green)' : 'var(--text-4)',
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none', width: '100%', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Cash Difference */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={labelSt}>Cash Difference</span>
              <div style={{
                height: 46, borderRadius: 9,
                border: `1.5px solid ${cashDifference >= 0 ? 'var(--brand-border)' : 'var(--red-border)'}`,
                background: cashDifference >= 0 ? 'var(--brand-bg)' : 'var(--red-bg)',
                display: 'flex', alignItems: 'center', padding: '0 12px',
                fontSize: 18, fontWeight: 900,
                color: cashDifference >= 0 ? 'var(--brand)' : 'var(--red)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {cashDifference >= 0 ? '+' : ''}{fmtMoney(cashDifference)}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Numpad */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['7','8','9'], ['4','5','6'], ['1','2','3']].map(row => (
                <div key={row[0]} style={{ display: 'flex', gap: 6 }}>
                  {row.map(d => <NumBtn key={d} label={d} />)}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6 }}>
                <NumBtn label="0" />
                <NumBtn label="." />
                <NumBtn
                  label={<XCircle size={18} />}
                  onClick={() => handleKey('C')}
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-3)' }}
                />
              </div>
              {/* Enter — move to next denom */}
              <button
                onClick={() => {
                  const idx = DENOMS.findIndex(d => d.label === activeDenom)
                  if (idx < DENOMS.length - 1) setActiveDenom(DENOMS[idx + 1].label)
                }}
                onMouseDown={press} onMouseUp={release}
                style={{
                  height: 50, borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
                  color: '#fff', fontSize: 15, fontWeight: 800,
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(107,0,0,0.2)',
                  transition: 'filter 0.1s, transform 0.07s',
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
              >
                Enter ↓
              </button>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="cr-footer" style={{
          display: 'flex', gap: 8, padding: '12px 18px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
        }}>
          {[
            { label: 'X-Report',  reportType: 'X', color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
            { label: 'Z-Report',  reportType: 'Z', color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
          ].map(btn => {
            const busy = submitting === btn.reportType
            return (
              <button
                key={btn.label}
                onClick={() => handleReport(btn.reportType)}
                disabled={!!submitting || loading}
                style={{
                  flex: 1, height: 40, borderRadius: 10,
                  border: `1.5px solid ${btn.border}`,
                  background: btn.bg, color: btn.color,
                  fontSize: 12, fontWeight: 800,
                  cursor: (submitting || loading) ? 'not-allowed' : 'pointer',
                  opacity: submitting && !busy ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!submitting && !loading) { e.currentTarget.style.filter = 'brightness(0.93)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)' }}
                onMouseDown={e => { if (!submitting && !loading) e.currentTarget.style.transform = 'scale(0.96)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {busy
                  ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Printer size={13} />
                }
                {busy ? 'Saving...' : btn.label}
              </button>
            )
          })}
          <button
            onClick={onClose}
            style={{
              height: 40, paddingInline: 20, borderRadius: 10,
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}

const closeBtn = {
  width: 32, height: 32, borderRadius: 9,
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
}

const labelSt = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
  letterSpacing: 0.7, textTransform: 'uppercase',
}
