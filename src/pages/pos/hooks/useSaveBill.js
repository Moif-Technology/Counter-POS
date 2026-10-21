import { useCallback, useState } from 'react'
import { usePosStore } from '../../../store/posStore'
import { api } from '../../../lib/api'
import { enrichCartItemsForSave } from '../../../lib/cartLine'
import { broadcastSaved } from '../../../lib/customerDisplay'
import { formatDocNumberDisplay } from '../../../lib/documentScan'
import { isMultiPaymentMode } from '../../../lib/paymentModes'
import { focusBarcodeScan } from '../../../lib/posFocus'
import { posNotifyError, posNotifySuccess, posNotifyWarning } from '../../../lib/posNotify'
import { printBillReceipts } from '../../../lib/printBillReceipt'

/**
 * Save (and optionally print) the current bill. Handles mixed sale+return
 * bills, the customer display "saved" broadcast and the next bill number.
 */
export function useSaveBill({ fetchNextBillNo }) {
  const clearAll = usePosStore(s => s.clearAll)
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async (andPrint = false) => {
    const state = usePosStore.getState()
    if (!state.cartItems.length) {
      posNotifyWarning('Cart is empty', { title: 'Save Bill' })
      return
    }

    const payResult = state.applyPaymentForSettlement()
    if (!payResult.ok) {
      posNotifyError(payResult.error, { title: 'Payment' })
      focusBarcodeScan(30)
      return
    }

    setSaving(true)
    try {
      const fresh = usePosStore.getState()
      const cartItems = enrichCartItemsForSave(fresh.cartItems)
      const hasSale   = cartItems.some(i => Number(i.qty) > 0)
      const hasReturn = cartItems.some(i => Number(i.qty) < 0)
      const isReturn = fresh.returnMode && !hasSale && hasReturn
      const result = await api.counterPos.saveBill({
        cartItems,
        paymentMode:  fresh.paymentMode,
        paymentSplits: isMultiPaymentMode(fresh.paymentMode) ? (fresh.paymentSplits ?? []) : undefined,
        counterNo:    fresh.counterNo,
        subTotal:     fresh.subTotal,
        discountAmt:  fresh.discountAmt,
        taxableAmt:   fresh.taxableAmt,
        taxAmt:       fresh.taxAmt,
        roundOff:     fresh.roundOff,
        netAmount:    fresh.netAmount,
        paidAmount:   fresh.paidAmount,
        balanceAmount: fresh.balanceAmount,
        customerId:   fresh.customerId ?? null,
        remarks:      fresh.billComment?.trim() || null,
        isReturn,
        recalledHoldSalesId: fresh.recalledHoldSalesId ?? null,
        recalledDeliverySalesId: fresh.recalledDeliverySalesId ?? null,
      }, fresh.accessToken)

      if (result?.isMixed) {
        posNotifySuccess(
          `Saved: ${formatDocNumberDisplay(result.sale?.billNoDisplay ?? result.sale?.billNo)} (Sale) + ${formatDocNumberDisplay(result.return?.billNoDisplay ?? result.return?.billNo)} (Return)`,
          { title: 'Bill Saved', duration: 1200 },
        )
      } else {
        const savedLabel = formatDocNumberDisplay(result.billNoDisplay ?? result.billNo ?? result.salesId)
        posNotifySuccess(
          result?.isReturn ? `Return ${savedLabel} saved!` : `Bill ${savedLabel} saved!`,
          { title: 'Bill Saved', duration: 1200 },
        )
      }
      usePosStore.setState({ recalledHoldSalesId: null })
      const { accessToken, counterNo, shopName, netAmount: net, paidAmount: paid, balanceAmount: change, currency, customerDisplayEnabled } = usePosStore.getState()
      if (customerDisplayEnabled) broadcastSaved(net, paid, change, currency)
      clearAll()
      await fetchNextBillNo()

      if (andPrint) {
        const printMeta = { companyName: shopName, counterNo }
        const ids = result?.isMixed
          ? [result.sale?.salesId, result.return?.salesId]
          : [result.salesId]
        try {
          await printBillReceipts(ids, accessToken, printMeta)
        } catch (printErr) {
          posNotifyError(printErr.message ?? 'Print failed', { title: 'Print' })
        }
      }
    } catch (err) {
      posNotifyError(err.message ?? 'Save failed', { title: 'Save Bill' })
    } finally {
      setSaving(false)
      focusBarcodeScan(80)
    }
  }, [clearAll, fetchNextBillNo])

  return { saving, handleSave }
}
