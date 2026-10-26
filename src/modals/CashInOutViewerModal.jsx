import { useCallback, useEffect, useState } from 'react'
import { Wallet, RefreshCw } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { api } from '../lib/api'
import { fmt3 } from '../lib/utils'
import Modal from '../components/common/Modal'
import Table from '../components/common/Table'
import DateRangePicker from '../components/common/DateRangePicker'

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

  return (
    <Modal onClose={onClose} icon={Wallet} kicker="Reports" title="Cash In / Out Viewer" width={920}>

      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px 1fr auto', gap: 8, alignItems: 'end' }}>
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
            style={{ gridColumn: 'span 2' }}
          />
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Counter
            </label>
            <input className="ui-input" data-system-keyboard type="number" min={1} value={counterNo} onChange={e => setCounterNo(e.target.value)}
              style={{ width: '100%', height: 38, borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 12, padding: '0 8px', boxSizing: 'border-box', textAlign: 'center' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Counter Close No
            </label>
            <input className="ui-input" data-system-keyboard type="text" value={closeNo} onChange={e => setCloseNo(e.target.value)}
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
                fontFamily: 'inherit', color: item.color,
              }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 16px' }}>
        <Table
          columns={[
            { key: 'createdAt', label: 'Date / Time', width: 130, render: v => fmtDateTime(v) },
            {
              key: 'transactionType', label: 'Type', width: 56,
              render: v => <b style={{ fontSize: 10, letterSpacing: 0.4, color: v === 'CASH_IN' ? 'var(--green)' : 'var(--red)' }}>{v === 'CASH_IN' ? 'IN' : 'OUT'}</b>,
            },
            { key: 'counterNo', label: 'Cntr', width: 48, align: 'center' },
            {
              key: 'counterCloseNo', label: 'Close No', width: 110,
              render: v => <b style={{ fontSize: 11, color: v === 'PENDING' ? 'var(--amber)' : 'var(--text-2)' }}>{v ?? '—'}</b>,
            },
            { key: 'remarks', label: 'Remarks', render: v => <span title={v || ''}>{v || '—'}</span> },
            {
              key: 'amount', label: 'Amount', width: 90, align: 'right', mono: true,
              render: (v, r) => <b style={{ color: r.transactionType === 'CASH_IN' ? 'var(--green)' : 'var(--red)' }}>{fmt3(v)}</b>,
            },
          ]}
          rows={rows}
          rowKey="id"
          loading={loading}
          error={error}
          emptyText="No cash in/out entries for selected filters"
          minHeight={260}
        />
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
    </Modal>
  )
}
