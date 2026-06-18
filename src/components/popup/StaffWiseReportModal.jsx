import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Users, RefreshCw, Download } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { api } from '../../lib/api'
import { fmt3 } from '../../lib/utils'
import { buildReportPrintFontCss, escReceipt, openReceiptPrintWindow } from '../../lib/receiptPrintTheme'

export default function StaffWiseReportModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const authStaff   = usePosStore(s => s.authStaff)

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const overlayRef = useRef()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.counterPos.staffWiseReport(counterNo, accessToken)
      setRows(data)
    } catch (err) {
      setError(err.message ?? 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [counterNo, accessToken])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const grandTotal = rows.reduce((s, r) => s + r.netAmount, 0)
  const grandBills = rows.reduce((s, r) => s + r.billCount, 0)

  function handleDownloadPdf() {
    const now    = new Date()
    const dateStr = now.toLocaleDateString()
    const timeStr = now.toLocaleTimeString()
    const companyName = authStaff?.company_name ?? 'Company'
    const branchName  = authStaff?.branch_name  ?? ''

    const tableRows = rows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fa'}">
        <td>${i + 1}</td>
        <td>${escReceipt(r.staffName)}</td>
        <td style="text-align:center">${r.billCount}</td>
        <td style="text-align:right">${fmt3(r.grossAmount)}</td>
        <td style="text-align:right">${fmt3(r.totalDiscount)}</td>
        <td style="text-align:right">${fmt3(r.totalRoundOff)}</td>
        <td style="text-align:right;font-weight:700">${fmt3(r.netAmount)}</td>
        <td style="text-align:right">${fmt3(r.totalCash)}</td>
        <td style="text-align:right">${fmt3(r.totalCard)}</td>
        <td style="text-align:right">${fmt3(r.totalCredit)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Staff Wise Report</title>
  <style>
    ${buildReportPrintFontCss()}
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 18px; font-weight: 800; }
    .header h2 { font-size: 13px; font-weight: 700; color: #333; margin-top: 2px; }
    .meta { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 12px; flex-wrap: nowrap; white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #000; color: #fff; padding: 7px 8px; font-size: 12px; font-weight: 700; text-align: left; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    td { padding: 6px 8px; border-bottom: 1px solid #ccc; font-size: 13px; }
    .tfoot td { background: #000; color: #fff; font-weight: 700; padding: 7px 8px; border: none; }
    .tfoot td.right { text-align: right; }
    .tfoot td.center { text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escReceipt(companyName)}</h1>
    <h2>${escReceipt(branchName)}</h2>
    <h2 style="margin-top:6px;font-size:14px">Staff Wise Sales Report</h2>
  </div>
  <div class="meta">
    <span>Counter No: ${escReceipt(counterNo)}</span>
    <span>Date: ${escReceipt(dateStr)} ${escReceipt(timeStr)}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Staff Name</th>
        <th class="center">Bills</th>
        <th class="right">Gross Amt</th>
        <th class="right">Discount</th>
        <th class="right">Round Off</th>
        <th class="right">Net Amount</th>
        <th class="right">Cash</th>
        <th class="right">Card</th>
        <th class="right">Credit</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr class="tfoot">
        <td colspan="2">TOTAL</td>
        <td class="center">${grandBills}</td>
        <td class="right">${fmt3(rows.reduce((s, r) => s + r.grossAmount, 0))}</td>
        <td class="right">${fmt3(rows.reduce((s, r) => s + r.totalDiscount, 0))}</td>
        <td class="right">${fmt3(rows.reduce((s, r) => s + r.totalRoundOff, 0))}</td>
        <td class="right">${fmt3(grandTotal)}</td>
        <td class="right">${fmt3(rows.reduce((s, r) => s + r.totalCash, 0))}</td>
        <td class="right">${fmt3(rows.reduce((s, r) => s + r.totalCard, 0))}</td>
        <td class="right">${fmt3(rows.reduce((s, r) => s + r.totalCredit, 0))}</td>
      </tr>
    </tfoot>
  </table>
  <script>
    window.onload = function() {
      setTimeout(function() { window.focus(); window.print(); }, 400);
    };
  </script>
</body>
</html>`

    openReceiptPrintWindow(html, { width: 900, height: 650 })
  }

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(15,13,10,0.50)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'swfade 0.15s ease',
      }}
    >
      <style>{`@keyframes swfade { from { opacity:0 } to { opacity:1 } }`}</style>

      <div style={{
        width: 860, maxWidth: '96vw', maxHeight: '88vh',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.20)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '13px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', margin: 0 }}>
                Reports
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1, margin: 0 }}>
                Staff Wise Sales Report
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                height: 32, padding: '0 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={loading || rows.length === 0}
              style={{
                height: 32, padding: '0 14px', borderRadius: 8,
                background: rows.length === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.20)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: rows.length === 0 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Download size={13} /> Download PDF
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-3)', fontSize: 13 }}>
              <RefreshCw size={18} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
              Loading report...
            </div>
          )}

          {error && !loading && (
            <div style={{
              padding: 16, borderRadius: 10, background: 'var(--red-bg)',
              border: '1px solid var(--red-border)', color: 'var(--red)',
              fontSize: 13, fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-4)', gap: 8 }}>
              <Users size={32} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>No sales data for current session</p>
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Total Staff', value: rows.length, unit: 'staff members' },
                  { label: 'Total Bills', value: grandBills, unit: 'transactions' },
                  { label: 'Grand Total', value: fmt3(grandTotal), unit: 'net sales' },
                ].map(c => (
                  <div key={c.label} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--surface)', border: '1.5px solid var(--border)',
                    boxShadow: 'var(--shadow-xs)',
                  }}>
                    <p style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.6, margin: 0 }}>{c.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', margin: '2px 0 0', lineHeight: 1 }}>{c.value}</p>
                    <p style={{ fontSize: 9, color: 'var(--text-4)', margin: '3px 0 0' }}>{c.unit}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      {['#', 'Staff Name', 'Bills', 'Gross Amt', 'Discount', 'Round Off', 'Net Amount', 'Cash', 'Card', 'Credit'].map((h, i) => (
                        <th key={h} style={{
                          padding: '9px 10px', fontWeight: 700, fontSize: 10.5,
                          color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5,
                          textAlign: i <= 1 ? 'left' : 'right', borderBottom: '1.5px solid var(--border)',
                          whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.staffId} style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface)' }}>
                        <td style={{ padding: '8px 10px', color: 'var(--text-4)', fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-1)' }}>{r.staffName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-2)' }}>{r.billCount}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-2)' }}>{fmt3(r.grossAmount)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--red)' }}>{fmt3(r.totalDiscount)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)' }}>{fmt3(r.totalRoundOff)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--text-1)' }}>{fmt3(r.netAmount)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--green)' }}>{fmt3(r.totalCash)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--blue)' }}>{fmt3(r.totalCard)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--amber)' }}>{fmt3(r.totalCredit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
                      <td colSpan={2} style={{ padding: '9px 10px', fontWeight: 800, fontSize: 12, color: 'var(--text-1)' }}>TOTAL</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800 }}>{grandBills}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800 }}>{fmt3(rows.reduce((s, r) => s + r.grossAmount, 0))}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--red)' }}>{fmt3(rows.reduce((s, r) => s + r.totalDiscount, 0))}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800 }}>{fmt3(rows.reduce((s, r) => s + r.totalRoundOff, 0))}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--text-1)' }}>{fmt3(grandTotal)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--green)' }}>{fmt3(rows.reduce((s, r) => s + r.totalCash, 0))}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--blue)' }}>{fmt3(rows.reduce((s, r) => s + r.totalCard, 0))}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--amber)' }}>{fmt3(rows.reduce((s, r) => s + r.totalCredit, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '10px 18px', borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)', flexShrink: 0, gap: 8,
        }}>
          <button
            onClick={onClose}
            style={{
              height: 34, padding: '0 20px', borderRadius: 9,
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
          >
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
