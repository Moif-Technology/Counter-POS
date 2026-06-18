import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Archive, Calendar, RefreshCw, Loader2 } from 'lucide-react'
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

function CloseDetailModal({ closeId, accessToken, onClose }) {
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const overlayRef = useRef()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.counterPos.counterCloseDetail(closeId, accessToken)
      .then(data => { if (!cancelled) setDetail(data) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [closeId, accessToken])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rows = detail ? [
    { label: 'Close No',       value: detail.closeNo ?? `#${detail.closeId}` },
    { label: 'Close Date',     value: fmtDateTime(detail.closeDate) },
    { label: 'Report Type',    value: detail.reportType },
    { label: 'Counter',        value: detail.counterNo },
    { label: 'Total Cash',     value: fmt3(detail.totalCash) },
    { label: 'Total Credit',   value: fmt3(detail.totalCredit) },
    { label: 'Total Card',     value: fmt3(detail.totalCard) },
    { label: 'Credit Receipt (Cash)', value: fmt3(detail.creditReceiptCash), accent: 'green' },
    { label: 'Credit Receipt (Card)', value: fmt3(detail.creditReceiptCard), accent: 'green' },
    { label: 'Credit Receipts',       value: detail.creditReceiptCount ?? 0, accent: 'green' },
    { label: 'Total Discount', value: fmt3(detail.totalDiscount) },
    { label: 'Refund',         value: fmt3(detail.totalRefund) },
    { label: 'Round Off',      value: fmt3(detail.totalRoundOff) },
    { label: 'Tax',            value: fmt3(detail.totalTax) },
    { label: 'Total Sales',    value: fmt3(detail.grossAmount) },
    { label: 'Cash In',        value: fmt3(detail.cashIn), accent: 'green' },
    { label: 'Cash Out',       value: fmt3(detail.cashOut), accent: 'red' },
    { label: 'Cash To Collect', value: fmt3(detail.cashToBeCollected), accent: 'brand' },
    { label: 'Collected Cash', value: fmt3(detail.collectedCash) },
    { label: 'Cash Difference', value: fmt3(detail.cashDifference) },
    { label: 'Bill Count',     value: detail.billCount },
    { label: 'Bill Range',     value: detail.startBillNo != null ? `${detail.startBillNo} – ${detail.endBillNo}` : '—' },
  ] : []

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
        width: 480, maxWidth: '96vw', maxHeight: '90vh',
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
              Counter close details
            </p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>
              {detail?.closeNo ?? `Close #${closeId}`}
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
              <Loader2 size={20} style={{ animation: 'ccv-spin 0.8s linear infinite' }} />
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: 16, color: 'var(--red)', fontWeight: 600, fontSize: 13 }}>{error}</div>
          )}
          {!loading && detail && rows.map(row => {
            const valueColor = row.accent === 'green' ? 'var(--green)'
              : row.accent === 'red' ? 'var(--red)'
              : row.accent === 'brand' ? 'var(--brand)'
              : 'var(--text-1)'
            const labelColor = row.accent === 'green' ? 'var(--green)'
              : row.accent === 'red' ? 'var(--red)'
              : row.accent ? 'var(--brand)' : 'var(--text-3)'
            const rowBg = row.accent === 'green' ? 'rgba(34,197,94,0.06)'
              : row.accent === 'red' ? 'rgba(239,68,68,0.06)'
              : undefined
            return (
            <div
              key={row.label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', borderBottom: '1px solid var(--border)',
                fontSize: 12,
                background: rowBg,
              }}
            >
              <span style={{
                fontWeight: row.accent ? 700 : 600,
                color: labelColor,
              }}>{row.label}</span>
              <span style={{
                fontWeight: 800, color: valueColor,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {row.value}
              </span>
            </div>
            )
          })}
          {!loading && detail?.cashInOutList?.length > 0 && (
            <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                padding: '8px 10px', background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Cash In / Out Transactions ({detail.cashInOutList.length})
              </div>
              {detail.cashInOutList.map((row, i) => {
                const isIn = row.transactionType === 'CASH_IN'
                return (
                  <div
                    key={row.id ?? i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', gap: 8,
                      borderBottom: i < detail.cashInOutList.length - 1 ? '1px solid var(--border)' : 'none',
                      background: i % 2 === 0 ? '#fff' : 'var(--surface-2)',
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
                      <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 6 }}>
                        {row.remarks || '—'}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 800, flexShrink: 0,
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

        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', textAlign: 'right' }}>
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

const GRID_COLS = '130px 1fr 52px 52px 72px 72px 72px 72px'

export default function CounterCloseViewerModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)

  const [dateFrom, setDateFrom] = useState(daysAgoISO(30))
  const [dateTo, setDateTo]     = useState(todayISO())
  const [closes, setCloses]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [detailId, setDetailId] = useState(null)
  const overlayRef = useRef()

  const loadCloses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { closes: list } = await api.counterPos.counterHistory({
        counterNo,
        dateFrom,
        dateTo,
        limit: 150,
      }, accessToken)
      setCloses(list ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, counterNo, dateFrom, dateTo])

  useEffect(() => { loadCloses() }, [loadCloses])

  useEffect(() => {
    const onKey = e => {
      if (detailId) return
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, detailId])

  return (
    <>
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
      <style>{`@keyframes ccv-spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{
        width: 860, maxWidth: '96vw', maxHeight: '90vh',
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
              <Archive size={17} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', margin: 0 }}>
                Reports
              </p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>Counter Close Viewer</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
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
            <button onClick={loadCloses} style={{
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
            {['Close Date', 'Close No', 'Type', 'Bills', 'Gross', 'To Collect', 'Collected', 'Diff'].map(h => (
              <span key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</span>
            ))}
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', border: '1.5px solid var(--border)',
            borderRadius: '0 0 10px 10px', minHeight: 280,
          }}>
            {loading && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                <Loader2 size={18} style={{ animation: 'ccv-spin 0.8s linear infinite', display: 'inline-block' }} /> Loading…
              </div>
            )}
            {!loading && error && (
              <div style={{ padding: 16, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>{error}</div>
            )}
            {!loading && !error && closes.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                No counter closes found for selected dates
              </div>
            )}
            {!loading && !error && closes.map((c, i) => (
              <button
                key={c.closeId}
                type="button"
                onClick={() => setDetailId(c.closeId)}
                style={{
                  width: '100%', display: 'grid', gridTemplateColumns: GRID_COLS,
                  padding: '9px 10px', border: 'none', borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                  fontSize: 11, textAlign: 'left', cursor: 'pointer', color: 'var(--text-1)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : 'var(--surface-2)' }}
              >
                <span>{fmtDateTime(c.closeDate)}</span>
                <span style={{ fontWeight: 700 }}>{c.closeNo ?? `#${c.closeId}`}</span>
                <span>{c.reportType}</span>
                <span style={{ textAlign: 'right' }}>{c.billCount}</span>
                <span style={{ textAlign: 'right', fontWeight: 700 }}>{fmt3(c.grossAmount)}</span>
                <span style={{ textAlign: 'right' }}>{fmt3(c.cashToBeCollected)}</span>
                <span style={{ textAlign: 'right' }}>{fmt3(c.collectedCash)}</span>
                <span style={{
                  textAlign: 'right', fontWeight: 700,
                  color: Number(c.cashDifference) >= 0 ? 'var(--green)' : 'var(--red)',
                }}>
                  {fmt3(c.cashDifference)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
            {closes.length} close{closes.length !== 1 ? 's' : ''} found
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-4)' }}>Click a row for full details</span>
          <button onClick={onClose} style={{
            height: 34, padding: '0 18px', borderRadius: 9,
            border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
            color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <X size={13} /> Close
          </button>
        </div>
      </div>
    </div>

    {detailId != null && (
      <CloseDetailModal
        closeId={detailId}
        accessToken={accessToken}
        onClose={() => setDetailId(null)}
      />
    )}
    </>
  )
}
