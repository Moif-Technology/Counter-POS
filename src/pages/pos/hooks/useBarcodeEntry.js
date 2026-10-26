import { useCallback, useEffect, useRef, useState } from 'react'
import { usePosStore } from '../../../store/posStore'
import { api } from '../../../lib/api'
import { focusBarcodeScan } from '../../../lib/posFocus'
import { endOneShotReturn, finishPosQtyEntry } from '../../../lib/posNumpadKeys'
import { posConfirm, posNotifyError, posNotifySuccess } from '../../../lib/posNotify'
import { IS_ANDROID, scanSunmiBarcode } from '../../../lib/sunmiCameraScanner'
import {
  parseLegacyDeliveryScan,
  parseLegacyHoldScan,
  parseDocNumber,
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

    const docNo = parseDocNumber(term)
    if (docNo != null && isDocBarcodeScan(term)) {
      const resolved = await resolveNumericDocumentScan(docNo, accessToken, api)
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

    setScanning(true)
    let added = false
    try {
      const { product } = await api.counterPos.productSearch(term, accessToken)
      const { parseScanQty, resetAfterLineScan } = usePosStore.getState()
      const qty = parseScanQty(qtyBuffer)
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
      endOneShotReturn()   // like Qty: return covers this one item, then back to sale
      added = true
    } catch (err) {
      posNotifyError(err.message ?? 'Product not found', { title: 'Scan', onClose: clearScanAndRefocus })
    } finally {
      setScanning(false)
      if (added) focusBarcodeScan(30)
    }
  }, [addItem, scanning])

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

  return { scanning, sunmiScanOpen, handleEnter, handleSunmiScan }
}
