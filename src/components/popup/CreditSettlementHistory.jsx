import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, History, Calendar, User, Search, X, ChevronDown, Printer } from 'lucide-react'
import { normalizePaymentMode, PM } from '../../lib/paymentModes'
import { api } from '../../lib/api'
import { fmt3 } from '../../lib/utils'
import { usePosStore } from '../../store/posStore'
import { printCreditReceiptVoucher } from '../../lib/printCreditReceiptVoucher'

function fmtDateTime(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function resolveMode(dbMode) {
  return normalizePaymentMode(dbMode)
}

function creditCustomersOnly(list) {
  return (list ?? []).filter(c => resolveMode(c.paymentMode) === PM.CREDIT)
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
      setResults(creditCustomersOnly(customers))
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
        const c = creditCustomersOnly(r.customers).find(x => String(x.customerId) === String(customerId))
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
    : 'All credit customers'

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
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 20,
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
            All credit customers
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: 14, textAlign: 'center', fontSize: 11, color: 'var(--text-4)' }}>
                <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              </div>
            )}
            {!loading && results.length === 0 && (
              <div style={{ padding: 14, textAlign: 'center', fontSize: 11, color: 'var(--text-4)' }}>No credit customers found</div>
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

export function CreditSettlementHistoryList({ accessToken, onSelectReceipt }) {
  const [customerId, setCustomerId] = useState('')
  const [dateFrom, setDateFrom]       = useState(daysAgoISO(30))
  const [dateTo, setDateTo]           = useState(todayISO())
  const [receipts, setReceipts]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { receipts: list } = await api.counterPos.settlementHistory({
        customerId: customerId || undefined,
        dateFrom:   dateFrom || undefined,
        dateTo:     dateTo || undefined,
        limit:      150,
      }, accessToken)
      setReceipts(list ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, customerId, dateFrom, dateTo])

  useEffect(() => { loadHistory() }, [loadHistory])

  return (
    <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', minHeight: 420 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
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
      </div>

      <button onClick={loadHistory} style={{
        height: 36, borderRadius: 8, border: '1.5px solid var(--brand-border)',
        background: 'var(--brand-bg)', color: 'var(--brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <History size={14} /> Refresh History
      </button>

      <div style={{ flex: 1, overflow: 'hidden', border: '1.5px solid var(--brand-border)', borderRadius: 10 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '110px 1fr 90px 80px 80px',
          background: 'var(--brand-bg)', padding: '8px 12px', borderBottom: '1px solid var(--brand-border)',
        }}>
          {['Receipt', 'Customer', 'Date', 'Paid', 'O/S After'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 300 }}>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
              <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Loading…
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: 16, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>{error}</div>
          )}
          {!loading && !error && receipts.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>No receipts found</div>
          )}
          {!loading && receipts.map(r => (
            <div
              key={r.transactionId}
              onClick={() => onSelectReceipt(r.transactionId)}
              style={{
                display: 'grid', gridTemplateColumns: '110px 1fr 90px 80px 80px',
                padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                alignItems: 'center', transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{r.receiptNo}</span>
              <span style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.customerName}</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{fmtDateTime(r.transactionDate)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{fmt3(r.paidAmount)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: r.osAfter > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt3(r.osAfter)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CreditSettlementReceiptDetail({ accessToken, transactionId, onBack }) {
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const shopName  = usePosStore(s => s.shopName)
  const cashier   = usePosStore(s => s.cashier)
  const counterNo = usePosStore(s => s.counterNo)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.counterPos.settlementReceipt(transactionId, accessToken)
      .then(setReceipt)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [accessToken, transactionId])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}><Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} /></div>
  }
  if (error) return <div style={{ padding: 20, color: 'var(--red)', fontWeight: 600 }}>{error}</div>
  if (!receipt) return null

  const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }
  const labelStyle = { color: 'var(--text-3)', fontWeight: 600 }
  const valueStyle = { fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto', minHeight: 420 }}>
      <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4 }}>Receipt</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--brand)' }}>{receipt.receiptNo}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{fmtDateTime(receipt.transactionDate)}</div>
      </div>

      <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={rowStyle}><span style={labelStyle}>Customer</span><span style={{ fontWeight: 700 }}>{receipt.customerName}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Code</span><span style={valueStyle}>{receipt.customerCode}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Payment Mode</span><span style={{ fontWeight: 700 }}>{normalizePaymentMode(receipt.paymentMode)}</span></div>
        {receipt.voucher && (
          <div style={rowStyle}>
            <span style={labelStyle}>Voucher</span>
            <span style={valueStyle}>{receipt.voucher.voucherPrefix}{receipt.voucher.autoVoucherNo}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'O/S Before', value: receipt.osBefore, color: 'var(--red)' },
          { label: 'Paid Amount', value: receipt.paidAmount, color: 'var(--green)' },
          { label: 'O/S After', value: receipt.osAfter, color: receipt.osAfter > 0 ? 'var(--red)' : 'var(--green)' },
        ].map(b => (
          <div key={b.label} style={{
            padding: 12, borderRadius: 10, textAlign: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4 }}>{b.label}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: b.color, fontFamily: "'JetBrains Mono', monospace" }}>{fmt3(b.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 6 }}>Cleared Bills</div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px 70px',
          background: 'var(--brand-bg)', padding: '8px 10px', fontSize: 9, fontWeight: 700, color: 'var(--brand)',
        }}>
          {['Invoice', 'Bill Amt', 'O/S Before', 'Paid', 'O/S After'].map(h => (
            <span key={h} style={{ textAlign: h === 'Invoice' ? 'left' : 'right' }}>{h}</span>
          ))}
        </div>
        {(receipt.clearedBills ?? []).length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>No bill lines</div>
        ) : receipt.clearedBills.map(b => (
          <div key={b.transactionChildId} style={{
            display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px 70px',
            padding: '8px 10px', borderTop: '1px solid var(--border)', fontSize: 11,
          }}>
            <div>
              <div style={{ fontWeight: 700 }}>{b.invoiceNo}</div>
              <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                {b.billDate ? new Date(b.billDate).toLocaleDateString('en-GB') : '—'}
              </div>
            </div>
            <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{fmt3(b.invoiceAmount)}</span>
            <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{fmt3(b.osBefore)}</span>
            <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--green)' }}>{fmt3(b.paidAmount)}</span>
            <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: b.osAfter > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt3(b.osAfter)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={() => printCreditReceiptVoucher(receipt, {
            companyName: shopName,
            cashierName: cashier?.staffName,
            counterNo: receipt.counterNo ?? counterNo,
          })}
          style={{
            flex: 1, height: 40, borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
            color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Printer size={14} /> Print Receipt
        </button>
        <button onClick={onBack} style={{
          flex: 1, height: 40, borderRadius: 8,
          border: '1.5px solid var(--border)', background: '#fff',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          Back to History
        </button>
      </div>
    </div>
  )
}
