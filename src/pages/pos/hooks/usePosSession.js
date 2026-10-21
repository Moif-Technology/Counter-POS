import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../../../store/posStore'
import { api } from '../../../lib/api'
import { setGvTax } from '../../../lib/gvtax'
import { setAutoRoundOff } from '../../../lib/posSettings'

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
  }, [cashier, navigate, fetchNextBillNo])

  return { fetchNextBillNo }
}
