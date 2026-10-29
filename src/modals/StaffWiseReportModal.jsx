import { useCallback, useEffect, useState } from 'react'
import { X, Users, RefreshCw, Printer } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { api } from '../lib/api'
import { fmt3 } from '../lib/utils'
import { buildReportPrintFontCss, escReceipt, openReceiptPrintWindow } from '../lib/receiptPrintTheme'
import { IS_ANDROID_POS, printAndroidStaffWiseReport } from '../lib/androidPosPrinter'
import Modal from '../components/common/Modal'
import Notice from '../components/common/Notice'
import './StaffWiseReportModal.css'

function fmtCloseDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function StaffWiseReportModal({ onClose, reportFn = null, historyFn = null }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const authStaff   = usePosStore(s => s.authStaff)

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [closes,  setCloses]  = useState([])
  const [noData,  setNoData]  = useState(false)   // "No data to print" notice
  const [closeId, setCloseId] = useState('')      // '' = current (open) session

  // Counter closes for the "Counter Close #" picker
  useEffect(() => {
    const doHistory = historyFn ?? ((params) => api.counterPos.counterHistory(params, accessToken))
    Promise.resolve(doHistory({ counterNo, limit: 100 }))
      .then(r => setCloses(Array.isArray(r?.closes) ? r.closes : []))
      .catch(() => setCloses([]))
  }, [counterNo, accessToken, historyFn])
  const pickedClose = closes.find(c => String(c.closeId) === String(closeId)) ?? null

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const doReport = reportFn ?? ((id) => api.counterPos.staffWiseReport(counterNo, accessToken, id))
      const data = await doReport(closeId || null)
      // Accept a plain list or a list wrapped in an object; anything else = no rows (never crash).
      setRows(Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : Array.isArray(data?.data) ? data.data : []))
    } catch (err) {
      setError(err.message ?? 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [counterNo, accessToken, reportFn, closeId])

  useEffect(() => { fetchData() }, [fetchData])

  const grandTotal = rows.reduce((s, r) => s + r.netAmount, 0)
  const grandBills = rows.reduce((s, r) => s + r.billCount, 0)

  async function handleDownloadPdf() {
    const now    = new Date()
    const dateStr = now.toLocaleDateString()
    const timeStr = now.toLocaleTimeString()
    const companyName = authStaff?.company_name ?? 'Company'
    const branchName  = authStaff?.branch_name  ?? ''

    if (IS_ANDROID_POS) {
      try {
        await printAndroidStaffWiseReport(rows, {
          companyName,
          branchName,
          counterNo,
          reportAt: now,
        })
      } catch (err) {
        setError(`Printing failed: ${err.message ?? err}`)
      }
      return
    }

    const tableRows = rows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fa'}">
        <td>${i + 1}</td>
        <td>${escReceipt(r.staffName)}</td>
        <td style="text-align:center">${r.billCount}</td>
        <td style="text-align:right">${fmt3(r.grossAmount)}</td>
        <td style="text-align:right">${fmt3(r.totalDiscount)}</td>
        <td style="text-align:right">${fmt3(r.totalRoundOff)}</td>
        <td style="text-align:right">${fmt3(r.returnAmount ?? 0)}</td>
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
        <th class="right">Returns</th>
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
        <td class="right">${fmt3(rows.reduce((s, r) => s + (r.returnAmount ?? 0), 0))}</td>
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
    <Modal
      onClose={onClose}
      icon={Users}
      kicker="Reports"
      title="Staff Wise Sales Report"
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
      </>}
      zIndex={1100}
      width={860}
      maxHeight="88vh"
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

        {/* Counter Close # */}
        <div className="sw-pick">
          <label htmlFor="sw-close">Counter Close #</label>
          <select id="sw-close" value={closeId} onChange={e => setCloseId(e.target.value)}>
            <option value="">Current session (open)</option>
            {closes.map(c => (
              <option key={c.closeId} value={c.closeId}>{c.closeNo ?? `#${c.closeId}`}</option>
            ))}
          </select>
          <div className="sw-pick-date">{pickedClose ? fmtCloseDate(pickedClose.closeDate) : 'Not closed yet'}</div>
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
              <p style={{ fontSize: 13, fontWeight: 600 }}>{closeId ? 'No sales data for this counter close' : 'No sales data for current session'}</p>
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
                    <tr style={{ background: 'var(--table-head-bg)' }}>
                      {['#', 'Staff Name', 'Bills', 'Gross Amt', 'Discount', 'Round Off', 'Returns', 'Net Amount', 'Cash', 'Card', 'Credit'].map((h, i) => (
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
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--red)' }}>{fmt3(r.returnAmount ?? 0)}</td>
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
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--red)' }}>{fmt3(rows.reduce((s, r) => s + (r.returnAmount ?? 0), 0))}</td>
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
          <button type="button" className="sw-print" onClick={() => (rows.length ? handleDownloadPdf() : setNoData(true))} disabled={loading}>
            <Printer size={15} /> Print
          </button>
          <button
            onClick={onClose}
            style={{
              height: 40, padding: '0 20px', borderRadius: 10,
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
    {noData && <Notice title="No data to print" message={closeId ? "There are no sales for this counter close." : "There are no sales in the current session."} onClose={() => setNoData(false)} />}
    </Modal>
  )
}
