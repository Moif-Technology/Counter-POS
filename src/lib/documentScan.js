/**
 * Document numbers & barcode scan helpers (invoice / hold / delivery).
 * Barcodes encode digits only — no H-/D-/B- prefix on the slip.
 */

export const DOC_TYPE = {
  INVOICE: 'invoice',
  HOLD: 'hold',
  DELIVERY: 'delivery',
}

/** Strip Code39 start/stop asterisks and whitespace from scanner input. */
export function cleanBarcodeScan(raw) {
  return String(raw ?? '').trim().replace(/^\*+|\*+$/g, '')
}

/** Minimum digits in barcode — short codes (14) fail on many scanners without padding. */
export const DOC_BARCODE_MIN_DIGITS = 6

/** Barcode payload — zero-padded numeric (e.g. 000014). Scanners read this; UI shows plain number. */
export function formatDocBarcode(docNo) {
  const n = Number(docNo)
  if (!Number.isFinite(n) || n <= 0) return ''
  return String(Math.floor(n)).padStart(DOC_BARCODE_MIN_DIGITS, '0')
}

/** Plain document number from scan or keypad (digits only). */
export function parseDocNumber(input) {
  const s = cleanBarcodeScan(input)
  if (!s) return null
  if (!/^\d+$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseLegacyHoldScan(input) {
  const s = cleanBarcodeScan(input)
  const m = s.match(/^[Hh]-?(\d+)$/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseLegacyDeliveryScan(input) {
  const s = cleanBarcodeScan(input)
  const m = s.match(/^[Dd]-?(\d+)$/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseLegacyInvoiceScan(input) {
  const s = cleanBarcodeScan(input)
  const m = s.match(/^[BbRr]-?(\d+)$/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Plain number for UI labels (strips legacy B-/H-/D- prefixes). */
export function formatDocNumberDisplay(input) {
  const s = cleanBarcodeScan(input)
  if (!s) return ''
  const legacy =
    parseLegacyInvoiceScan(s) ??
    parseLegacyHoldScan(s) ??
    parseLegacyDeliveryScan(s)
  if (legacy) return String(legacy)
  const n = parseDocNumber(s)
  return n != null ? String(n) : s
}

/**
 * Resolve a numeric scan to hold or delivery (checks open lists).
 * @returns {{ type: 'hold'|'delivery', number: number }|null}
 */
export async function resolveNumericDocumentScan(number, accessToken, api) {
  const n = Number(number)
  if (!Number.isFinite(n) || n <= 0) return null

  const [held, deliveries] = await Promise.all([
    api.counterPos.getHeldBills(accessToken).catch(() => []),
    api.counterPos.getDeliveryBills(accessToken).catch(() => []),
  ])

  const holdList = Array.isArray(held) ? held : []
  const delList = Array.isArray(deliveries) ? deliveries : []

  if (holdList.some(h => String(h.hold_no) === String(n))) {
    return { type: DOC_TYPE.HOLD, number: n }
  }
  if (delList.some(d => String(d.hold_no) === String(n))) {
    return { type: DOC_TYPE.DELIVERY, number: n }
  }
  return null
}
