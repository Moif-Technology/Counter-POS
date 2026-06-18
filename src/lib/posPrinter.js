/**
 * Receipt printer config.
 * v1: browser default printer via print dialog.
 * Future: load printer name from core.app_parameter (e.g. default_printer).
 *
 * Receipt font, sizes, and layout: see ./receiptPrintTheme.js
 */

const STORAGE_KEY = 'pos_receipt_printer'

/** @returns {string|null} Printer name when configured; null = system default */
export function getReceiptPrinterName() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v && String(v).trim() ? String(v).trim() : null
  } catch {
    return null
  }
}

export function setReceiptPrinterName(name) {
  try {
    if (name && String(name).trim()) {
      localStorage.setItem(STORAGE_KEY, String(name).trim())
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* ignore */ }
}
