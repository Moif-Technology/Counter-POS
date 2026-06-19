import { usePosStore } from '../store/posStore'

/** Request focus on the barcode scan field (main billing screen). */
export function focusBarcodeScan(delayMs = 0) {
  const run = () => usePosStore.getState().focusBarcodeScan()
  if (delayMs > 0) {
    setTimeout(run, delayMs)
  } else {
    requestAnimationFrame(run)
  }
}

/** Run modal close handler, then return focus to barcode. */
export function closeAndFocusBarcode(closeFn) {
  return (...args) => {
    closeFn?.(...args)
    focusBarcodeScan(50)
  }
}

/** True when click target should not steal focus back to barcode. */
export function shouldSkipBarcodeRefocus(target) {
  if (!target || !(target instanceof Element)) return true
  if (target.closest('[data-pos-overlay]')) return true
  if (target.closest('[data-pos-customer-dropdown]')) return true
  if (target.closest('input, textarea, select, button, [role="button"]')) return true
  return false
}
