/** Canonical bill payment_mode values — must match API storage. */
export const PM = {
  CASH: 'CASH',
  CREDITCARD: 'CREDITCARD',
  CREDIT: 'CREDIT',
  MULTIPAYMENT: 'MULTIPAYMENT',
}

export function normalizePaymentMode(mode) {
  const m = String(mode ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (m === 'CARD' || m === 'CC' || m === 'CREDITCARD') return PM.CREDITCARD
  if (m === 'MULTI' || m === 'MULTIPAYMENT' || m === 'MULTIPAY') return PM.MULTIPAYMENT
  if (m === 'CREDIT') return PM.CREDIT
  if (m === 'PENDING') return 'PENDING'
  return PM.CASH
}

export function isCreditCardMode(mode) {
  return normalizePaymentMode(mode) === PM.CREDITCARD
}

export function isMultiPaymentMode(mode) {
  return normalizePaymentMode(mode) === PM.MULTIPAYMENT
}

export function isCashTenderMode(mode) {
  const n = normalizePaymentMode(mode)
  return n === PM.CASH || n === PM.CREDITCARD
}

export const BILL_PAYMENT_MODES = [
  { key: PM.CASH, label: PM.CASH },
  { key: PM.CREDITCARD, label: PM.CREDITCARD },
  { key: PM.CREDIT, label: PM.CREDIT },
  { key: PM.MULTIPAYMENT, label: PM.MULTIPAYMENT },
]

export const SPLIT_PAY_MODES = [
  { key: PM.CASH, label: PM.CASH },
  { key: PM.CREDITCARD, label: PM.CREDITCARD },
  { key: 'ONLINE', label: 'ONLINE' },
  { key: 'VOUCHER', label: 'VOUCHER' },
]

export const CREDIT_SETTLEMENT_PAY_MODES = [
  { key: PM.CASH, label: PM.CASH },
  { key: PM.CREDITCARD, label: PM.CREDITCARD },
]

export const DELIVERY_SETTLEMENT_PAY_MODES = [
  { key: PM.CREDITCARD, label: PM.CREDITCARD },
  { key: PM.CASH, label: PM.CASH },
  { key: PM.CREDIT, label: PM.CREDIT },
  { key: PM.MULTIPAYMENT, label: PM.MULTIPAYMENT },
]
