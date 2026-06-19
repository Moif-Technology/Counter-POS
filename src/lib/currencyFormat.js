/**
 * Global currency display precision for Counter-POS.
 * Default: 2 decimals (0.00).
 * Loaded from parameter table via setCurrencyPrecision() on POS login.
 */

export const DEFAULT_CURRENCY_PRECISION = 2

/** Public read-only view of current precision (use get/setCurrencyPrecision to change). */
export const CurrencyPrecision = {
  get value() {
    return currencyPrecision
  },
}

let currencyPrecision = DEFAULT_CURRENCY_PRECISION

export function getCurrencyPrecision() {
  return currencyPrecision
}

/** Set from parameter table (currency_precision / currencyPrecession). */
export function setCurrencyPrecision(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 6) return
  currencyPrecision = Math.trunc(n)
}

export function fmtMoney(value) {
  const n = Number(value)
  return (Number.isFinite(n) ? n : 0).toFixed(currencyPrecision)
}

/** Alias — all money display should use fmtMoney / fmtAmount. */
export const fmtAmount = fmtMoney

export function roundMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const factor = 10 ** currencyPrecision
  return Math.round(n * factor) / factor
}

/** Parse user/API money input to rounded number. */
export function parseMoney(value) {
  return roundMoney(Number(value))
}

/** Placeholder for empty money fields, e.g. "0.00". */
export function moneyPlaceholder() {
  return (0).toFixed(currencyPrecision)
}

/** Regex for cash-tender / amount input matching current precision. */
export function moneyInputRegex() {
  const p = currencyPrecision
  if (p <= 0) return /^\d+$/
  return new RegExp(`^\\d+(\\.\\d{0,${p}})?$`)
}
