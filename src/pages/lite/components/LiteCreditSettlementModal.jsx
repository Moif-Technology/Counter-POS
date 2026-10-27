import { useCallback, useEffect, useRef, useState } from 'react'
import {
  X, Loader2, AlertCircle, CheckCircle2,
  Banknote, CreditCard, ArrowLeft, Receipt, History,
} from 'lucide-react'
import { CreditSettlementHistoryList, CreditSettlementReceiptDetail } from '../../../components/popup/CreditSettlementHistory'
import { api } from '../../../lib/api'
import { usePosStore } from '../../../store/posStore'
import { fmt3 } from '../../../lib/utils'
import { applyAmountKey, useAmountNumpadKeyboard } from '../../../lib/posNumpadKeys'
import { CREDIT_SETTLEMENT_PAY_MODES, PM, normalizePaymentMode } from '../../../lib/paymentModes'
import { printCreditReceiptVoucher, receiptFromSettlementResult } from '../../../lib/printCreditReceiptVoucher'
import NeumorphicNumpad from './common/NeumorphicNumpad'

const PAY_MODE_ICONS = { [PM.CASH]: Banknote, [PM.CREDITCARD]: CreditCard }
const PAY_MODE_STYLES = {
  [PM.CASH]:       { color: 'var(--brand)', bg: 'var(--brand-bg)', border: 'var(--brand-border)' },
  [PM.CREDITCARD]: { color: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'var(--blue-border)' },
}

export default function LiteCreditSettlementModal({
  onClose, loadCustomersFn = null, loadBillsFn = null, settleFn = null,
  historyFn = null, receiptFn = null, customerSearchFn = null,
}) {
  const [step, setStep]           = useState('list')
  const [search, setSearch]       = useState('')
  const [customers, setCustomers] = useState([])
  const [selected, setSelected]   = useState(null)
  const [billData, setBillData]   = useState(null)
  const [amountStr, setAmountStr] = useState('')
  const [payMode, setPayMode]     = useState(PM.CASH)
  const [loading, setLoading]     = useState(false)
  const [loadingBills, setLoadingBills] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(null)
  const [viewReceiptId, setViewReceiptId] = useState(null)
  const overlayRef  = useRef()
  const debounceRef = useRef(null)
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const shopName    = usePosStore(s => s.shopName)
  const cashier     = usePosStore(s => s.cashier)

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return
      if (step === 'receipt') { setStep('history'); setViewReceiptId(null); return }
      if (step === 'history') { setStep('list'); return }
      if (step === 'list') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step])

  const loadCustomers = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const doLoad = loadCustomersFn ?? ((qq) => api.counterPos.creditCustomers(qq, 200, accessToken))
      const { customers: list } = await doLoad(q)
      setCustomers(list ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, loadCustomersFn])

  useEffect(() => { loadCustomers('') }, [loadCustomers])

  const scheduleSearch = (q) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadCustomers(q), 300)
  }

  const openSettlement = async (c) => {
    setSelected(c)
    setStep('settle')
    setAmountStr('')
    setPayMode('CASH')
    setError(null)
    setSuccess(null)
    setLoadingBills(true)
    try {
      const doLoadBills = loadBillsFn ?? ((id) => api.counterPos.customerOutstandingBills(id, accessToken))
      const data = await doLoadBills(c.customerId)
      setBillData(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingBills(false)
    }
  }

  const pressKey = (k) => setAmountStr(v => applyAmountKey(v, k))

  const handleAmountChange = (e) => {
    const val = e.target.value
    if (val === '' || /^\d*\.?\d*$/.test(val)) setAmountStr(val)
  }

  const handleSettle = useCallback(async () => {
    if (!selected || saving) return
    const amount = parseFloat(amountStr)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid settlement amount')
      return
    }
    const maxOs = billData?.billsTotal ?? billData?.osAmount ?? 0
    if (amount > maxOs + 0.02) {
      setError(`Amount cannot exceed outstanding bills total (${fmt3(maxOs)})`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const doSettle = settleFn ?? ((payload) => api.counterPos.saveCreditSettlement(payload, accessToken))
      const result = await doSettle({
        customerId: selected.customerId,
        amount,
        paymentMode: payMode,
        counterNo,
      })
      setSuccess(result)
      try {
        await printCreditReceiptVoucher(receiptFromSettlementResult(result), {
          companyName: shopName,
          cashierName: cashier?.staffName,
          counterNo,
        })
      } catch (printErr) {
        setError(`Settlement saved, but printing failed: ${printErr.message ?? printErr}`)
      }
      setAmountStr('')
      const doLoadBills = loadBillsFn ?? ((id) => api.counterPos.customerOutstandingBills(id, accessToken))
      const data = await doLoadBills(selected.customerId)
      setBillData(data)
      loadCustomers(search)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [selected, saving, amountStr, billData, payMode, counterNo, accessToken, search, loadCustomers, shopName, cashier, settleFn, loadBillsFn])

  useAmountNumpadKeyboard(setAmountStr, {
    onEnter: handleSettle,
    enabled: step === 'settle',
  })

  const billsTotal = billData?.billsTotal ?? billData?.osAmount ?? selected?.osAmount ?? 0

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: step === 'list' || step === 'history' || step === 'receipt' ? 760 : 680,
        maxWidth: '96vw', maxHeight: '92vh',
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          {(step === 'settle' || step === 'history' || step === 'receipt') && (
            <button
              onClick={() => {
                if (step === 'receipt') { setStep('history'); setViewReceiptId(null); return }
                if (step === 'history') { setStep('list'); return }
                setStep('list'); setSelected(null); setBillData(null); setSuccess(null); setError(null)
              }}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            ><ArrowLeft size={16} /></button>
          )}
          <Receipt size={18} color="#fff" />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', flex: 1 }}>
            {step === 'list' && 'Credit Settlement'}
            {step === 'settle' && 'Credit Settlement'}
            {step === 'history' && 'Settlement History'}
            {step === 'receipt' && 'Receipt Details'}
          </span>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={14} /></button>
        </div>

        {step === 'list' && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {[
              { key: 'settle', label: 'Settle', icon: Receipt },
              { key: 'history', label: 'History', icon: History },
            ].map(tab => {
              const Icon = tab.icon
              const active = tab.key === 'settle'
              return (
                <button
                  key={tab.key}
                  onClick={() => tab.key === 'history' && setStep('history')}
                  style={{
                    flex: 1, height: 42, border: 'none', cursor: 'pointer',
                    background: active ? 'var(--brand-bg)' : '#fff',
                    color: active ? 'var(--brand)' : 'var(--text-3)',
                    fontWeight: active ? 800 : 600, fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
                  }}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {step === 'list' ? (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 380 }}>
            <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); scheduleSearch(e.target.value) }}
                placeholder="Search code or name…"
                style={{
                  height: 40, padding: '0 12px', borderRadius: 8, border: '1.5px solid var(--border)',
                  fontSize: 13, fontWeight: 600, outline: 'none',
                }}
              />
              <div style={{ flex: 1, overflow: 'hidden', border: '1.5px solid var(--brand-border)', borderRadius: 10 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '100px 1fr 100px',
                  background: 'var(--brand-bg)', padding: '8px 12px', borderBottom: '1px solid var(--brand-border)',
                }}>
                  {['Code', 'Customer Name', 'O/S Balance'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 340 }}>
                  {loading && (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                      <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Loading…
                    </div>
                  )}
                  {!loading && error && (
                    <div style={{ padding: 16, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>{error}</div>
                  )}
                  {!loading && !error && customers.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                      No credit customers with outstanding balance
                    </div>
                  )}
                  {!loading && customers.map(c => (
                    <div
                      key={c.customerId}
                      onClick={() => openSettlement(c)}
                      style={{
                        display: 'grid', gridTemplateColumns: '100px 1fr 100px',
                        padding: '12px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                        alignItems: 'center', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                    >
                      <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{c.customerCode}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{c.customerName}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 800, textAlign: 'right',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: c.osAmount > 0 ? 'var(--red)' : 'var(--green)',
                      }}>{fmt3(c.osAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : step === 'history' ? (
          <CreditSettlementHistoryList
            accessToken={accessToken}
            onSelectReceipt={(id) => { setViewReceiptId(id); setStep('receipt') }}
            historyFn={historyFn}
            customerSearchFn={customerSearchFn}
          />
        ) : step === 'receipt' ? (
          <CreditSettlementReceiptDetail
            accessToken={accessToken}
            transactionId={viewReceiptId}
            onBack={() => { setStep('history'); setViewReceiptId(null) }}
            receiptFn={receiptFn}
          />
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'auto', minHeight: 0 }}>
            {/* Left — customer + bills */}
            <div style={{ flex: 1, padding: 14, borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
              <div style={{
                padding: 14, borderRadius: 12, background: 'var(--surface-2)',
                border: '1px solid var(--border)', marginBottom: 12,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 4 }}>Customer</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{selected?.customerName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  Code: {selected?.customerCode}
                </div>
                <div style={{
                  marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8,
                  background: billsTotal > 0 ? 'var(--red-bg)' : 'var(--green-bg)',
                  border: `1px solid ${billsTotal > 0 ? 'var(--red-border)' : 'var(--green-border)'}`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: billsTotal > 0 ? 'var(--red)' : 'var(--green)' }}>
                    Outstanding (Ledger)
                  </span>
                  <span style={{
                    fontSize: 20, fontWeight: 900,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: billsTotal > 0 ? 'var(--red)' : 'var(--green)',
                  }}>{fmt3(billsTotal)}</span>
                  {(billData?.bills ?? []).length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4, display: 'block' }}>
                      Bills listed: {fmt3(billData?.billsSum ?? (billData?.bills ?? []).reduce((s, b) => s + Number(b.currentAmount || 0), 0))}
                      {' '}(FIFO — pay up to ledger)
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: 6 }}>
                Outstanding Bills (oldest first)
              </div>
              {loadingBills ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>Loading bills…</div>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  {(billData?.bills ?? []).length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>No open bills</div>
                  ) : (billData?.bills ?? []).map(b => (
                    <div key={b.billId} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto',
                      padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11,
                    }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{b.invoiceNo}</div>
                        <div style={{ color: 'var(--text-4)', fontSize: 10 }}>
                          {b.billDate ? new Date(b.billDate).toLocaleDateString('en-GB') : '—'}
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{fmt3(b.currentAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right — amount + payment + settle */}
            <div style={{ width: 280, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', display: 'block', marginBottom: 4 }}>
                  Settlement Amount
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={handleAmountChange}
                  placeholder="0"
                  autoComplete="off"
                  style={{
                    width: '100%', height: 48, boxSizing: 'border-box',
                    borderRadius: 8, border: '2px solid var(--brand-border)',
                    background: 'var(--brand-bg)', textAlign: 'right',
                    padding: '0 12px', outline: 'none',
                    fontSize: 22, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--brand)',
                  }}
                />
              </div>

              <NeumorphicNumpad onKey={pressKey} showClear={false} btnHeight={48} fontSize={18} gap={5} />

              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' }}>Payment Mode</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CREDIT_SETTLEMENT_PAY_MODES.map(m => {
                  const Icon = PAY_MODE_ICONS[m.key]
                  const style = PAY_MODE_STYLES[m.key]
                  const active = payMode === m.key
                  return (
                    <button
                      key={m.key}
                      onClick={() => setPayMode(m.key)}
                      style={{
                        padding: '14px 8px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${active ? style.border : 'var(--border)'}`,
                        background: active ? style.bg : '#fff',
                        color: active ? style.color : 'var(--text-3)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        fontWeight: active ? 800 : 600, fontSize: 12,
                      }}
                    >
                      <Icon size={20} />
                      {m.label}
                    </button>
                  )
                })}
              </div>

              {error && (
                <div style={{
                  padding: '8px 10px', borderRadius: 8, background: 'var(--red-bg)',
                  border: '1px solid var(--red-border)', color: 'var(--red)',
                  fontSize: 11, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'flex-start',
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: '10px 12px', borderRadius: 8, background: 'var(--green-bg)',
                  border: '1px solid var(--green-border)', color: 'var(--green)', fontSize: 11,
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 800, marginBottom: 4 }}>
                    <CheckCircle2 size={14} /> Settled — RCV #{success.transactionNo}
                  </div>
                  <div>Paid: {fmt3(success.amount)} ({normalizePaymentMode(success.paymentMode)})</div>
                  <div>Remaining O/S: {fmt3(success.remainingOs)}</div>
                  {success.billsCleared?.length > 0 && (
                    <div style={{ marginTop: 4, opacity: 0.85 }}>
                      {success.billsCleared.map(b => (
                        <div key={b.billId}>{b.invoiceNo}: {fmt3(b.paidAmount)}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSettle}
                disabled={saving || loadingBills || !amountStr}
                style={{
                  marginTop: 'auto', height: 48, borderRadius: 10, border: 'none',
                  background: saving || !amountStr
                    ? 'var(--border)'
                    : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
                  color: saving || !amountStr ? 'var(--text-4)' : '#fff',
                  fontSize: 14, fontWeight: 800, cursor: saving || !amountStr ? 'not-allowed' : 'pointer',
                  letterSpacing: 0.5,
                }}
              >
                {saving ? 'Settling…' : 'Settle'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
