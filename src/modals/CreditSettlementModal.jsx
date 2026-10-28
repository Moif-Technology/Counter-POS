import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
import CreditCustomerLookup from './CreditCustomerLookup'
import CreditReceiptVoucher, { ReceiptSummaryDates } from './CreditReceiptVoucher'
import { printOutstandingBills, printOsBalance, printReceiptSummary } from '../lib/printCreditStatements'
import { CreditSettlementHistoryList, CreditSettlementReceiptDetail } from './CreditSettlementHistory'
import Modal from '../components/common/Modal'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmt3 } from '../lib/utils'
import { applyAmountKey, useAmountNumpadKeyboard } from '../lib/posNumpadKeys'
import { PM } from '../lib/paymentModes'
import { printCreditReceiptVoucher, receiptFromSettlementResult } from '../lib/printCreditReceiptVoucher'
import { posNotifySuccess } from '../lib/posNotify'

const STEP_TITLES = {
  list:    'Credit Settlement',
  settle:  'Receipt Voucher',
  history: 'Settlement History',
  receipt: 'Receipt Details',
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
  const [summaryOpen, setSummaryOpen] = useState(false)
  const debounceRef = useRef(null)
  const backToList = () => { setStep('list'); setSelected(null); setBillData(null); setSuccess(null); setError(null) }
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const shopName    = usePosStore(s => s.shopName)
  const cashier     = usePosStore(s => s.cashier)

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape' || summaryOpen) return
      if (step === 'receipt') { setStep('history'); setViewReceiptId(null); return }
      if (step === 'history') { setStep(selected ? 'settle' : 'list'); return }
      if (step === 'settle') { backToList(); return }
      if (step === 'list') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step, selected, summaryOpen])

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

  const printMeta = { companyName: shopName, cashierName: cashier?.staffName, counterNo }
  const runPrint = (fn) => { try { setError(null); fn() } catch (e) { setError(e.message ?? String(e)) } }
  const printSummary = async (dateFrom, dateTo) => {
    const doLoad = historyFn ?? ((params) => api.counterPos.settlementHistory(params, accessToken))
    const { receipts } = await doLoad({ dateFrom, dateTo, limit: 1000 })
    printReceiptSummary(receipts, { dateFrom, dateTo }, printMeta)
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
      posNotifySuccess(`Settled — RCV #${result.transactionNo ?? ''}`, { title: 'Receipt', duration: 1500 })
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
    <>
    <Modal
      closeOnEsc={false}
      onClose={onClose}
      icon={FileText}
      title={STEP_TITLES[step]}
      leading={step !== 'list' && (
        <button
          onClick={() => {
            if (step === 'receipt') { setStep('history'); setViewReceiptId(null); return }
            if (step === 'history') { setStep(selected ? 'settle' : 'list'); return }
            backToList()
          }}
          style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        ><ArrowLeft size={16} /></button>
      )}
      width={step === 'settle' ? 820 : step === 'list' ? 940 : 760}
      maxHeight="92vh"
    >

        {step === 'list' ? (
          <CreditCustomerLookup
            customers={customers}
            loading={loading}
            error={error}
            onSearch={q => { setSearch(q); scheduleSearch(q) }}
            onOpen={openSettlement}
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
          <CreditReceiptVoucher
            customer={selected}
            osBalance={billsTotal}
            billCount={(billData?.bills ?? []).length}
            loadingBills={loadingBills}
            amountStr={amountStr}
            onAmountKey={pressKey}
            payMode={payMode}
            setPayMode={setPayMode}
            saving={saving}
            error={error}
            success={success}
            onSettle={handleSettle}
            onPrintBills={() => runPrint(() => printOutstandingBills(selected, billData, printMeta))}
            onPrintOs={() => runPrint(() => printOsBalance(selected, billsTotal, printMeta))}
            onSummary={() => setSummaryOpen(true)}
            onDetails={() => setStep('history')}
          />
        )}
    </Modal>
    {summaryOpen && <ReceiptSummaryDates onPrint={printSummary} onClose={() => setSummaryOpen(false)} />}
    </>
  )
}
