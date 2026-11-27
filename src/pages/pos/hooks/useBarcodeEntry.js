import { useCallback, useEffect, useRef, useState } from 'react'
import { usePosStore } from '../../../store/posStore'
import { api } from '../../../lib/api'
import { focusBarcodeScan } from '../../../lib/posFocus'
import { resetReturnQty, finishPosQtyEntry } from '../../../lib/posNumpadKeys'
import { posConfirm, posNotifyError, posNotifySuccess } from '../../../lib/posNotify'
import { IS_ANDROID, scanSunmiBarcode } from '../../../lib/sunmiCameraScanner'
import { confirmStockForAdd } from '../../../lib/stockCheck'
import { isOffline } from '../../../lib/offlineCache'
import {
  parseLegacyDeliveryScan,
  parseLegacyHoldScan,
  parseDocNumber,
  parseLegacyInvoiceScan,
  isDocBarcodeScan,
  resolveNumericDocumentScan,
  DOC_TYPE,
} from '../../../lib/documentScan'

const clearScanAndRefocus = () => {
  usePosStore.getState().setBarcodeBuffer('')
  focusBarcodeScan(30)
}

/** Confirm replacing a non-empty cart, then recall a hold/delivery document. */
async function recallDocument(setScanning, { confirmTitle, confirmMessage, recall, successMessage, title, notFoundMessage }) {
  const state = usePosStore.getState()
  if (state.cartItems.length > 0) {
    const ok = await posConfirm({
      title: confirmTitle,
      message: confirmMessage,
      confirmLabel: confirmTitle,
      cancelLabel: 'Cancel',
    })
    if (!ok) {
      clearScanAndRefocus()
      return
    }
  }
  setScanning(true)
  try {
    await recall()
    state.resetAfterLineScan()
    posNotifySuccess(successMessage, { title, duration: 1200 })
    focusBarcodeScan(30)
  } catch (err) {
    posNotifyError(err.message ?? notFoundMessage, { title, onClose: clearScanAndRefocus })
  } finally {
    setScanning(false)
  }
}

/**
 * Barcode / Enter handling for the POS screen. A scan is either a hold or
 * delivery document (recalled into the cart) or a product barcode (added).
 * Also drives the Sunmi camera-scanner app on Android.
 */
export function useBarcodeEntry() {
  const addItem          = usePosStore(s => s.addItem)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const [scanning, setScanning]           = useState(false)
  const [sunmiScanOpen, setSunmiScanOpen] = useState(false)
  const [scannedBillId, setScannedBillId] = useState(null)

  // Ref lets the Sunmi scanner-app callback feed the normal barcode-enter path.
  const handleEnterRef = useRef(null)

  const handleEnter = useCallback(async () => {
    const state = usePosStore.getState()
    const { barcodeBuffer, qtyBuffer, accessToken } = state
    const term = barcodeBuffer.trim()
    // ENTER while typing a qty finishes the qty; the next scan uses it.
    if (state.inputMode === 'qty' && !term) { finishPosQtyEntry(); return }
    if (!term || scanning) return

    const holdNo = parseLegacyHoldScan(term)
    if (holdNo != null) {
      await recallDocument(setScanning, {
        confirmTitle: 'Recall Hold',
        confirmMessage: `Cart has items. Recall hold ${holdNo} and replace the current bill?`,
        recall: () => usePosStore.getState().recallHoldByNo(holdNo),
        successMessage: `Hold ${holdNo} recalled`,
        title: 'Hold Recall',
        notFoundMessage: 'Hold not found',
      })
      return
    }

    const deliveryNo = parseLegacyDeliveryScan(term)
    if (deliveryNo != null) {
      await recallDocument(setScanning, {
        confirmTitle: 'Recall Delivery',
        confirmMessage: `Cart has items. Recall delivery ${deliveryNo} to counter and replace the current bill?`,
        recall: () => usePosStore.getState().recallDeliveryByNo(deliveryNo),
        successMessage: `Delivery ${deliveryNo} recalled to counter`,
        title: 'Delivery Recall',
        notFoundMessage: 'Delivery not found',
      })
      return
    }

    setScanning(true)
    let added = false
    try {
      const { product } = await api.counterPos.productSearch(term, accessToken)
      const { parseScanQty, resetAfterLineScan } = usePosStore.getState()
      const qty = parseScanQty(qtyBuffer)
      if (!(await confirmStockForAdd(product, qty))) {
        clearScanAndRefocus()
        return
      }
      addItem({
        productId:   product.productId,
        barcode:     product.barcode,
        productCode: product.productCode,
        description: product.description ?? product.productName,
        qty,
        unitPrice: product.unitPrice,
        discount:  0,
        vatPer:    product.vatPer ?? 0,
      })
      resetAfterLineScan()
      resetReturnQty()   // return mode stays on; next return line is qty 1 again
      added = true
    } catch (err) {
      // Not a product: maybe a printed slip. New slips print B-/R-32 (H-/D- handled above);
      // older slips printed zero-padded digits (000032). Products are tried first, so a
      // product barcode like 000032 always adds the product.
      const padded = err.status === 404 && isDocBarcodeScan(term) ? parseDocNumber(term) : null
      // Return mode: a slip is a receipt (bill), never an open hold/delivery with the same no.
      if (padded != null && !state.returnMode && !isOffline()) {
        const resolved = await resolveNumericDocumentScan(padded, accessToken, api)
        if (resolved) {
          const isHold = resolved.type === DOC_TYPE.HOLD
          await recallDocument(setScanning, {
            confirmTitle: isHold ? 'Recall Hold' : 'Recall Delivery',
            confirmMessage: `Cart has items. Recall ${isHold ? 'hold' : 'delivery'} ${resolved.number} and replace the current bill?`,
            recall: () => (isHold
              ? usePosStore.getState().recallHoldByNo(resolved.number)
              : usePosStore.getState().recallDeliveryByNo(resolved.number)),
            successMessage: `${isHold ? 'Hold' : 'Delivery'} ${resolved.number} recalled`,
            title: isHold ? 'Hold Recall' : 'Delivery Recall',
            notFoundMessage: 'Document not found',
          })
          return
        }
      }
      // Receipt "Scan for reprint" barcode = bill no (= sales_id); tried as a bill of this counter.
      const billNo = err.status === 404 ? parseLegacyInvoiceScan(term) ?? padded : null
      if (billNo != null && usePosStore.getState().returnMode) {
        // Return mode: scanned receipt = load that bill as return lines (same as typing the bill no + Return).
        try {
          const bill = await usePosStore.getState().loadReturnBill(String(billNo))
          posNotifySuccess(`Bill ${bill.billNoDisplay} loaded for return`, { title: 'Return', duration: 1200 })
          focusBarcodeScan(30)
        } catch (retErr) {
          posNotifyError(retErr.message ?? 'Bill not found', { title: 'Return', onClose: clearScanAndRefocus })
        }
        return
      }
      if (billNo != null) {
        try {
          await api.counterPos.salesViewerBill(billNo, accessToken)
          setBarcodeBuffer('')
          setScannedBillId(billNo)
          return
        } catch (billErr) {
          if (billErr.status !== 404) {
            posNotifyError(billErr.message ?? 'Bill not found', { title: 'Bill', onClose: clearScanAndRefocus })
            return
          }
        }
      }
      posNotifyError(err.message ?? 'Product not found', { title: 'Scan', onClose: clearScanAndRefocus })
    } finally {
      setScanning(false)
      if (added) focusBarcodeScan(30)
    }
  }, [addItem, scanning, setBarcodeBuffer])

  // Keep ref current so the Sunmi scanner-app callback invokes the latest handleEnter.
  useEffect(() => { handleEnterRef.current = handleEnter }, [handleEnter])

  const handleSunmiScan = useCallback(async () => {
    if (sunmiScanOpen || scanning) return
    if (!IS_ANDROID) {
      posNotifyError('Sunmi scanner is only available on the Android device', { title: 'Scan' })
      return
    }

    setSunmiScanOpen(true)
    try {
      const barcode = await scanSunmiBarcode()
      if (!barcode) return
      setBarcodeBuffer(barcode)
      await handleEnterRef.current?.()
    } catch (err) {
      const message = err?.message ?? String(err ?? '')
      if (message.toLowerCase() === 'cancelled') return
      posNotifyError(message || 'Scanner app/result not available', {
        title: 'Scan',
        onClose: () => focusBarcodeScan(30),
      })
    } finally {
      setSunmiScanOpen(false)
      focusBarcodeScan(30)
    }
  }, [scanning, setBarcodeBuffer, sunmiScanOpen])

  return {
    scanning, sunmiScanOpen, handleEnter, handleSunmiScan,
    scannedBillId, closeScannedBill: () => setScannedBillId(null),
  }
}
