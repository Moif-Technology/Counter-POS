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

/** Set from gvtax currencyPrecision (Company Profile → Decimal Places), clamped to 0–3. */
export function setCurrencyPrecision(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return
  currencyPrecision = Math.min(3, Math.max(0, Math.trunc(n)))
}

export function fmtMoney(value) {
  return roundMoney(value).toFixed(currencyPrecision)
}

/** Alias — all money display should use fmtMoney / fmtAmount. */
export const fmtAmount = fmtMoney

export function roundMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  // Half away from zero; exponent shift avoids 1.005 * 100 = 100.4999… float error.
  const p = currencyPrecision
  const abs = Math.abs(n)
  const r = String(abs).includes('e')
    ? Math.round(abs * 10 ** p) / 10 ** p
    : Number(`${Math.round(Number(`${abs}e${p}`))}e-${p}`)
  return n < 0 ? -r : r
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
