import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../../../store/posStore'
import { api } from '../../../lib/api'
import { setGvTax } from '../../../lib/gvtax'
import { setAutoRoundOff } from '../../../lib/posSettings'
import { focusBarcodeScan } from '../../../lib/posFocus'
import { posNotifySuccess, posNotifyWarning, posPromptText } from '../../../lib/posNotify'
import { startOfflineSync } from '../../../lib/offlineSync'

/**
 * Shift start: no float, no bills and no drawer entries yet on this counter session →
 * ask once for the opening float (skippable; also available under Cash In/Out).
 */
async function askOpeningFloat() {
  const { accessToken, counterNo: cno, cashier: who } = usePosStore.getState()
  const askedKey = `pos-float-asked:${cno}:${who?.staffId ?? ''}`
  try {
    if (sessionStorage.getItem(askedKey)) return
    sessionStorage.setItem(askedKey, '1')
  } catch { /* storage blocked */ }
  let summary
  try {
    summary = await api.counterPos.counterSummary(cno, accessToken)
  } catch {
    return // no counter-reading access on this login: skip the prompt silently
  }
  try {
    const fresh = !Number(summary?.openingFloat) && !Number(summary?.billCount)
      && !(summary?.cashInOutList ?? []).length
    if (!fresh) return
    const raw = await posPromptText({
      title: 'Opening Float',
      message: 'Cash placed in the drawer at the start of this shift.',
      placeholder: '0.00',
      inputMode: 'decimal',
      confirmLabel: 'Save',
      cancelLabel: 'Skip',
    })
    const amount = parseFloat(raw)
    if (!(amount > 0)) return
    await api.counterPos.addCashInOut({
      counterNo: cno, transactionType: 'CASH_IN', category: 'OPENING_FLOAT',
      amount, remarks: 'Opening Float',
    }, accessToken)
    posNotifySuccess(`Opening float ${amount.toFixed(2)} saved`, { title: 'Opening Float', duration: 1200 })
  } catch (err) {
    if (err?.status !== 409) posNotifyWarning(err?.message ?? 'Opening float not saved', { title: 'Opening Float' })
  } finally {
    focusBarcodeScan(50)
  }
}

/**
 * POS screen start-up: bounce to login without a cashier, load the next bill
 * number and the tax / rounding / receipt / customer-display parameters.
 * Returns fetchNextBillNo so saving a bill can refresh it.
 */
export function usePosSession() {
  const navigate  = useNavigate()
  const cashier   = usePosStore(s => s.cashier)
  const setBillNo = usePosStore(s => s.setBillNo)

  const fetchNextBillNo = useCallback(async () => {
    const { accessToken } = usePosStore.getState()
    try {
      const { billNo } = await api.counterPos.nextBillNo(accessToken)
      setBillNo(String(billNo ?? ''))
    } catch {
      // ignore: bill number is best-effort (POS can still operate)
    }
  }, [setBillNo])

  useEffect(() => {
    if (!cashier) { navigate('/'); return }
    fetchNextBillNo()
    ;(async () => {
      try {
        const { accessToken } = usePosStore.getState()
        const [data, posParamsRes] = await Promise.all([
          api.appParameters.gvtax(accessToken),
          api.appParameters.posParams(accessToken).catch(() => null),
        ])
        setGvTax(data?.gvtax ?? 5)
        usePosStore.getState().setCurrencyPrecision(data?.currencyPrecision ?? 2)
        setAutoRoundOff(data?.autoRoundOff ?? 0)
        if (data?.receiptHeader) usePosStore.getState().setReceiptHeader(data.receiptHeader)
        const pos = posParamsRes?.parameters ?? posParamsRes?.data?.parameters ?? {}
        usePosStore.getState().setCustomerDisplayEnabled(Number(pos.customer_display_enabled) === 1)
        usePosStore.getState().recalc()
      } catch {
        setGvTax(5)
      }
    })()
    askOpeningFloat()
  }, [cashier, navigate, fetchNextBillNo])

  // Offline product cache + autosync of bills saved while the server was unreachable.
  useEffect(() => {
    if (!cashier) return
    return startOfflineSync()
  }, [cashier])

  return { fetchNextBillNo }
}
