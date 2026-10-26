import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle, CheckCircle2,
  Banknote, CreditCard, ArrowLeft,
  FileText,
} from 'lucide-react'
import CreditCustomerLookup from './CreditCustomerLookup'
import { CreditSettlementHistoryList, CreditSettlementReceiptDetail } from './CreditSettlementHistory'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmt3 } from '../lib/utils'
import { applyAmountKey, useAmountNumpadKeyboard } from '../lib/posNumpadKeys'
import { CREDIT_SETTLEMENT_PAY_MODES, PM, normalizePaymentMode } from '../lib/paymentModes'
import { printCreditReceiptVoucher, receiptFromSettlementResult } from '../lib/printCreditReceiptVoucher'

const STEP_TITLES = {
  list:    'Credit Settlement',
  settle:  'Credit Settlement',
  history: 'Settlement History',
  receipt: 'Receipt Details',
}

const PAY_MODE_ICONS ={ [PM.CASH]: Banknote, [PM.CREDITCARD]: CreditCard }
const PAY_MODE_STYLES = {
  [PM.CASH]:       { color: 'var(--brand)', bg: 'var(--brand-bg)', border: 'var(--brand-border)' },
  [PM.CREDITCARD]: { color: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'var(--blue-border)' },
}

export default function CreditSettlementModal({
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
    <Modal
      closeOnEsc={false}
      onClose={onClose}
      icon={FileText}
      title={STEP_TITLES[step]}
      leading={step !== 'list' && (
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
      width={step === 'settle' ? 680 : step === 'list' ? 940 : 760}
      maxHeight="92vh"
    >

        {step === 'list' ? (
          <CreditCustomerLookup
            customers={customers}
            loading={loading}
            error={error}
            onSearch={q => { setSearch(q); scheduleSearch(q) }}
            onOpen={openSettlement}
            onHistory={() => setStep('history')}
            onClose={onClose}
          />
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
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontFamily: 'inherit' }}>
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
                    fontFamily: 'inherit',
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
                      <span style={{ fontWeight: 800, fontFamily: 'inherit' }}>{fmt3(b.currentAmount)}</span>
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
                    fontSize: 22, fontWeight: 900, fontFamily: 'inherit',
                    color: 'var(--brand)',
                  }}
                />
              </div>

              <Numpad onKey={pressKey} showClear={false} btnHeight={48} fontSize={18} gap={5} />

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
    </Modal>
  )
}
