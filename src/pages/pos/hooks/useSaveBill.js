import { useCallback, useState } from 'react'
import { usePosStore } from '../../../store/posStore'
import { api } from '../../../lib/api'
import { enrichCartItemsForSave } from '../../../lib/cartLine'
import { broadcastSaved } from '../../../lib/customerDisplay'
import { formatDocNumberDisplay } from '../../../lib/documentScan'
import { isMultiPaymentMode, isCreditCardMode } from '../../../lib/paymentModes'
import { focusBarcodeScan } from '../../../lib/posFocus'
import { posNotifyError, posNotifySuccess, posNotifyWarning, posPromptText } from '../../../lib/posNotify'
import { printBillReceipts, printBillFromData } from '../../../lib/printBillReceipt'
import { notifyStockChanged } from '../../../lib/stockCheck'
import { isOffline } from '../../../lib/offlineCache'
import {
  isNetworkError, newClientUuid, offlineBlockReason, queueOfflineBill, offlineReceiptBill,
} from '../../../lib/offlineSync'

/**
 * Server unreachable: queue the bill on this terminal (cash / card sales only),
 * print it with its offline number and clear the screen. Autosync uploads it later.
 */
async function saveBillOffline(payload, andPrint) {
  const blocked = offlineBlockReason(payload)
  if (blocked) {
    posNotifyError(`No connection to the server. ${blocked} — bill kept on screen.`, { title: 'Not available offline' })
    return
  }
  const rec = await queueOfflineBill(payload, payload.clientUuid)
  const receipt = offlineReceiptBill(rec)
  const st = usePosStore.getState()
  posNotifySuccess(`No connection — saved offline as ${rec.offlineBillNo}. It will sync automatically.`, {
    title: 'Saved Offline', duration: 1800,
  })
  usePosStore.setState({ recalledHoldSalesId: null })
  if (st.customerDisplayEnabled) broadcastSaved(st.netAmount, st.paidAmount, st.balanceAmount, st.currency)
  st.clearAll()
  st.setBillNo('OFFLINE')
  notifyStockChanged()
  if (andPrint) {
    try {
      await printBillFromData(receipt, { companyName: st.shopName, counterNo: st.counterNo })
    } catch (printErr) {
      posNotifyError(printErr.message ?? 'Print failed', { title: 'Print' })
    }
  }
}

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

    // Card bill: bank slip / approval reference is mandatory.
    let cardRefNo = null
    if (isCreditCardMode(state.paymentMode)) {
      cardRefNo = await posPromptText({
        title: 'Card Payment',
        message: 'Enter the bank receipt / approval reference number.',
        placeholder: 'Approval / ref no',
        required: true,
        confirmLabel: 'Save Bill',
      })
      if (!cardRefNo) {
        posNotifyWarning('Card reference is required to save a card bill', { title: 'Card Payment' })
        focusBarcodeScan(30)
        return
      }
    }

    setSaving(true)
    try {
      const fresh = usePosStore.getState()
      const cartItems = enrichCartItemsForSave(fresh.cartItems)
      const hasSale   = cartItems.some(i => Number(i.qty) > 0)
      const hasReturn = cartItems.some(i => Number(i.qty) < 0)
      // A bill of only returned lines is a return bill. Return switches itself
      // off after each item, so the lines decide this, not the Return key.
      const isReturn = !hasSale && hasReturn
      const payload = {
        cartItems,
        paymentMode:  fresh.paymentMode,
        paymentSplits: isMultiPaymentMode(fresh.paymentMode) ? (fresh.paymentSplits ?? []) : undefined,
        cardRefNo:    cardRefNo ?? undefined,
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
        // Same id is reused if this save is queued offline, so a lost response can't double-post.
        clientUuid:   newClientUuid(),
      }
      if (isOffline()) {
        await saveBillOffline(payload, andPrint)
        return
      }
      let result
      try {
        result = await api.counterPos.saveBill(payload, fresh.accessToken)
      } catch (err) {
        if (!isNetworkError(err)) throw err
        await saveBillOffline(payload, andPrint)
        return
      }

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
      notifyStockChanged()
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
