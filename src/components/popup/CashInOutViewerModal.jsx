import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Wallet, Calendar, RefreshCw, Loader2 } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { api } from '../../lib/api'
import { fmt3 } from '../../lib/utils'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const GRID_COLS = '118px 52px 48px 100px 1fr 80px'

export default function CashInOutViewerModal({ onClose, reportFn = null }) {
  const accessToken = usePosStore(s => s.accessToken)
  const storeCounter = usePosStore(s => s.counterNo)

  const [dateFrom, setDateFrom]       = useState(daysAgoISO(30))
  const [dateTo, setDateTo]           = useState(todayISO())
  const [counterNo, setCounterNo]     = useState(String(storeCounter || '1'))
  const [closeNo, setCloseNo]         = useState('')
  const [rows, setRows]               = useState([])
  const [summary, setSummary]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const overlayRef = useRef()

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const doReport = reportFn ?? ((params) => api.counterPos.cashInOutReport(params, accessToken))
      const data = await doReport({
        dateFrom,
        dateTo,
        counterNo: counterNo.trim() || undefined,
        closeNo:   closeNo.trim() || undefined,
        limit:     500,
      })
      setRows(data.transactions ?? [])
      setSummary(data.summary ?? null)
    } catch (e) {
      setError(e.message)
      setRows([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken, counterNo, closeNo, dateFrom, dateTo, reportFn])

  useEffect(() => { loadReport() }, [loadReport])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.45)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <style>{`@keyframes cio-spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{
        width: 920, maxWidth: '96vw', maxHeight: '90vh',
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
              <Wallet size={17} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', margin: 0 }}>
                Reports
              </p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>Cash In / Out Viewer</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px 1fr auto', gap: 8, alignItems: 'end' }}>
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
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                Counter
              </label>
              <input type="number" min={1} value={counterNo} onChange={e => setCounterNo(e.target.value)}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12, padding: '0 8px', boxSizing: 'border-box', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                Counter Close No
              </label>
              <input type="text" value={closeNo} onChange={e => setCloseNo(e.target.value)}
                placeholder="e.g. Z-C1-0003 or PENDING"
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12, padding: '0 10px', boxSizing: 'border-box' }} />
            </div>
            <button onClick={loadReport} style={{
              height: 38, padding: '0 14px', borderRadius: 8,
              border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
              color: 'var(--brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>
              <RefreshCw size={14} /> Load
            </button>
          </div>
        </div>

        {summary && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)', flexShrink: 0,
          }}>
            {[
              { label: 'Total Cash In',  value: fmt3(summary.totalCashIn),  color: 'var(--green)' },
              { label: 'Total Cash Out', value: fmt3(summary.totalCashOut), color: 'var(--red)' },
              { label: 'Net (In − Out)', value: fmt3(summary.netCash),      color: summary.netCash >= 0 ? 'var(--green)' : 'var(--red)' },
              { label: 'Cash In Txns',   value: summary.cashInCount ?? 0,   color: 'var(--text-1)' },
              { label: 'Cash Out Txns',  value: summary.cashOutCount ?? 0,  color: 'var(--text-1)' },
            ].map(item => (
              <div key={item.label} style={{
                padding: '8px 10px', borderRadius: 8, background: '#fff',
                border: '1px solid var(--border)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800, marginTop: 4,
                  fontFamily: "'JetBrains Mono', monospace", color: item.color,
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 16px 12px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: GRID_COLS,
            background: 'var(--surface-2)', padding: '9px 10px', borderRadius: '10px 10px 0 0',
            border: '1.5px solid var(--border)', borderBottom: 'none', marginTop: 12,
          }}>
            {['Date / Time', 'Type', 'Cntr', 'Close No', 'Remarks', 'Amount'].map(h => (
              <span key={h} style={{
                fontSize: 9, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4,
                textAlign: h === 'Amount' ? 'right' : 'left',
              }}>{h}</span>
            ))}
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', border: '1.5px solid var(--border)',
            borderRadius: '0 0 10px 10px', minHeight: 260,
          }}>
            {loading && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                <Loader2 size={18} style={{ animation: 'cio-spin 0.8s linear infinite', display: 'inline-block' }} /> Loading…
              </div>
            )}
            {!loading && error && (
              <div style={{ padding: 16, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>{error}</div>
            )}
            {!loading && !error && rows.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                No cash in/out entries for selected filters
              </div>
            )}
            {!loading && !error && rows.map((r, i) => {
              const isIn = r.transactionType === 'CASH_IN'
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'grid', gridTemplateColumns: GRID_COLS,
                    padding: '9px 10px', borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                    fontSize: 11, alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'var(--text-2)' }}>{fmtDateTime(r.createdAt)}</span>
                  <span style={{
                    fontWeight: 800, fontSize: 10, letterSpacing: 0.4,
                    color: isIn ? 'var(--green)' : 'var(--red)',
                  }}>
                    {isIn ? 'IN' : 'OUT'}
                  </span>
                  <span style={{ textAlign: 'center' }}>{r.counterNo}</span>
                  <span style={{
                    fontWeight: 700, fontSize: 10,
                    color: r.counterCloseNo === 'PENDING' ? 'var(--amber)' : 'var(--text-2)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.counterCloseNo ?? '—'}
                  </span>
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: 'var(--text-2)',
                  }} title={r.remarks || ''}>
                    {r.remarks || '—'}
                  </span>
                  <span style={{
                    textAlign: 'right', fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isIn ? 'var(--green)' : 'var(--red)',
                  }}>
                    {fmt3(r.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
            {summary?.entryCount ?? 0} transaction{(summary?.entryCount ?? 0) !== 1 ? 's' : ''}
          </span>
          <button onClick={onClose} style={{
            height: 34, padding: '0 18px', borderRadius: 9,
            border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
            color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
