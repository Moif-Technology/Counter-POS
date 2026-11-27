import { LITE_GROUPS } from './data/liteProducts'
import { roundMoney } from '../../lib/currencyFormat'

export const PRICE_LEVELS = { Retail: 1, Wholesale: 0.9, VIP: 0.85 }
export const PRICE_LEVEL_ORDER = ['Retail', 'Wholesale', 'VIP']

/** Same shape the normal POS's GroupModal expects (groupId/groupDescription/keyShift).
 *  keyShift=0 → price-entry mode (same as normal POS default): pick a group, type an
 *  amount, Done adds a group-priced line to the cart. */
export const LITE_GROUP_OBJECTS = LITE_GROUPS.map((name, i) => ({ groupId: i + 1, groupDescription: name, keyShift: 0 }))

export const roundAmt = (n) => roundMoney(n)

/** Same item shape the normal POS's Sales Viewer / Bill Detail expect. */
export const buildLiteReceiptItems = (cartItems) => cartItems.map((i, idx) => ({
  productCode: i.barcode ?? '', description: i.description, qty: i.qty,
  unitPrice: i.unitPrice, vatPer: i.vatPer, vatAmt: i.vatAmt ?? 0,
  discount: i.discountAmt ?? 0, subTotal: i.subTotal ?? i.lineTotal,
  lineTotal: i.lineTotal, salesChildId: idx,
}))

/** Short item list for hold slips / delivery notes. */
export const buildSlipItems = (cartItems) => cartItems.map(i => ({
  description: i.description, qty: i.qty, unitPrice: i.unitPrice, vatPer: i.vatPer, lineTotal: i.lineTotal,
}))

// Document numbers for the Lite session (bills, holds, deliveries…). Module
// level so they keep counting if the page remounts.
const seq = { bill: 1, hold: 1, delivery: 1, settlement: 1, close: 1 }

/** nextSeq('bill') → 1, 2, 3… */
export const nextSeq = (kind) => seq[kind]++

/** Error with an HTTP-like status, matching what the shared modals expect from the API. */
export function notFound(message) {
  const e = new Error(message)
  e.status = 404
  return e
}
