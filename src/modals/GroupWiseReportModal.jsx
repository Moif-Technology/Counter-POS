import { useCallback, useEffect, useState } from 'react'
import { X, Grid, RefreshCw, Download } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { api } from '../lib/api'
import { fmt3 } from '../lib/utils'
import { buildReportPrintFontCss, escReceipt, openReceiptPrintWindow } from '../lib/receiptPrintTheme'
import { IS_ANDROID_POS } from '../lib/androidPosPrinter'
import Modal from '../components/common/Modal'

export default function GroupWiseReportModal({ onClose, reportFn = null }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const authStaff   = usePosStore(s => s.authStaff)

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const doReport = reportFn ?? (() => api.counterPos.groupWiseReport(counterNo, accessToken))
      const data = await doReport()
      // Accept a plain list or a list wrapped in an object; anything else = no rows (never crash).
      setRows(Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : Array.isArray(data?.data) ? data.data : []))
    } catch (err) {
      setError(err.message ?? 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [counterNo, accessToken, reportFn])

  useEffect(() => { fetchData() }, [fetchData])

  const grandTotal = rows.reduce((s, r) => s + (r.netAmount ?? r.totalAmount ?? 0), 0)
  const grandQty   = rows.reduce((s, r) => s + (r.qtySold ?? r.quantity ?? 0), 0)

  async function handleDownloadPdf() {
    const now     = new Date()
    const dateStr = now.toLocaleDateString()
    const timeStr = now.toLocaleTimeString()
    const companyName = authStaff?.company_name ?? 'Company'
    const branchName  = authStaff?.branch_name  ?? ''

    const tableRows = rows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fa'}">
        <td>${i + 1}</td>
        <td>${escReceipt(r.groupName ?? r.categoryName ?? 'Unassigned')}</td>
        <td style="text-align:center">${fmt3(r.qtySold ?? r.quantity ?? 0)}</td>
        <td style="text-align:right">${fmt3(r.grossAmount ?? 0)}</td>
        <td style="text-align:right">${fmt3(r.totalDiscount ?? r.discount ?? 0)}</td>
        <td style="text-align:right;font-weight:700">${fmt3(r.netAmount ?? r.totalAmount ?? 0)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Group Wise Sales Report</title>
  <style>
    ${buildReportPrintFontCss()}
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 18px; font-weight: 800; }
    .header h2 { font-size: 13px; font-weight: 700; color: #333; margin-top: 2px; }
    .meta { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 12px; flex-wrap: nowrap; white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f2f2f2; color: #000; padding: 7px 8px; font-size: 12px; font-weight: 700; text-align: left; border-top: 1px solid #bbb; border-bottom: 1px solid #bbb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    td { padding: 6px 8px; border-bottom: 1px solid #ccc; font-size: 13px; }
    .tfoot td { background: #f2f2f2; color: #000; font-weight: 800; padding: 7px 8px; border-top: 1.5px solid #888; border-bottom: 1px solid #bbb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .tfoot td.right { text-align: right; }
    .tfoot td.center { text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escReceipt(companyName)}</h1>
    <h2>${escReceipt(branchName)}</h2>
    <h2 style="margin-top:6px;font-size:14px">Group Wise Sales Report</h2>
  </div>
  <div class="meta">
    <span>Counter No: ${escReceipt(counterNo)}</span>
    <span>Date: ${escReceipt(dateStr)} ${escReceipt(timeStr)}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product Group</th>
        <th class="center">Qty Sold</th>
        <th class="right">Gross Amt</th>
        <th class="right">Discount</th>
        <th class="right">Net Amount</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr class="tfoot">
        <td colspan="2">TOTAL</td>
        <td class="center">${fmt3(grandQty)}</td>
        <td class="right">${fmt3(rows.reduce((s, r) => s + (r.grossAmount ?? 0), 0))}</td>
        <td class="right">${fmt3(rows.reduce((s, r) => s + (r.totalDiscount ?? r.discount ?? 0), 0))}</td>
        <td class="right">${fmt3(grandTotal)}</td>
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

    openReceiptPrintWindow(html, { width: 800, height: 600 })
  }

  return (
    <Modal
      onClose={onClose}
      icon={Grid}
      kicker="Reports"
      title="Group Wise Sales Report"
      headerRight={<>
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
          <Download size={13} /> {IS_ANDROID_POS ? 'Print' : 'Download PDF'}
        </button>
      </>}
      zIndex={1100}
      width={760}
      maxHeight="88vh"
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

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
              <Grid size={32} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>No group sales data for current session</p>
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Total Groups', value: rows.length, unit: 'product categories' },
                  { label: 'Total Qty Sold', value: fmt3(grandQty), unit: 'items sold' },
                  { label: 'Grand Total', value: fmt3(grandTotal), unit: 'net revenue' },
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
                    <tr style={{ background: 'var(--table-head-bg)' }}>
                      {['#', 'Product Group', 'Qty Sold', 'Gross Amt', 'Discount', 'Net Amount'].map((h, i) => (
                        <th key={h} style={{
                          padding: '9px 10px', fontWeight: 700, fontSize: 10.5,
                          color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5,
                          textAlign: i <= 1 ? 'left' : (i === 2 ? 'center' : 'right'), borderBottom: '1.5px solid var(--border)',
                          whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.groupId ?? r.id ?? i} style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface)' }}>
                        <td style={{ padding: '8px 10px', color: 'var(--text-4)', fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-1)' }}>{r.groupName ?? r.categoryName ?? 'Unassigned'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-2)' }}>{fmt3(r.qtySold ?? r.quantity ?? 0)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-2)' }}>{fmt3(r.grossAmount ?? 0)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--red)' }}>{fmt3(r.totalDiscount ?? r.discount ?? 0)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--text-1)' }}>{fmt3(r.netAmount ?? r.totalAmount ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
                      <td colSpan={2} style={{ padding: '9px 10px', fontWeight: 800, fontSize: 12, color: 'var(--text-1)' }}>TOTAL</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 800 }}>{fmt3(grandQty)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800 }}>{fmt3(rows.reduce((s, r) => s + (r.grossAmount ?? 0), 0))}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--red)' }}>{fmt3(rows.reduce((s, r) => s + (r.totalDiscount ?? r.discount ?? 0), 0))}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--text-1)' }}>{fmt3(grandTotal)}</td>
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
    </Modal>
  )
}