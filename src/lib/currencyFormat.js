/**
 * Currency display precision.
 * Default: 2 decimals (e.g. 10.75).
 * Future: call setCurrencyPrecision() from company/branch parameter table on login.
 */

const DEFAULT_PRECISION = 2

let currencyPrecision = DEFAULT_PRECISION

export function getCurrencyPrecision() {
  return currencyPrecision
}

/** Set from parameter table (e.g. currency_precision / currencyPrecession). */
export function setCurrencyPrecision(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 6) return
  currencyPrecision = Math.trunc(n)
}

export function fmtMoney(value) {
  const n = Number(value)
  return (Number.isFinite(n) ? n : 0).toFixed(currencyPrecision)
}

export function roundMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const factor = 10 ** currencyPrecision
  return Math.round(n * factor) / factor
}

/** Regex for cash-tender / amount input matching current precision. */
export function moneyInputRegex() {
  const p = currencyPrecision
  if (p <= 0) return /^\d+$/
  return new RegExp(`^\\d+(\\.\\d{0,${p}})?$`)
}
