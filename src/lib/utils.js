import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  fmtMoney,
  fmtAmount,
  getCurrencyPrecision,
  setCurrencyPrecision,
  roundMoney,
  parseMoney,
  moneyPlaceholder,
  moneyInputRegex,
  CurrencyPrecision,
  DEFAULT_CURRENCY_PRECISION,
} from './currencyFormat'

export const QTY_PRECISION = 3

/** Quantity display (separate from currency precision). */
export function fmtQty(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return n % 1 === 0 ? String(n) : n.toFixed(QTY_PRECISION)
}

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** @deprecated Use fmtMoney — kept for existing imports. */
export const fmt3 = fmtMoney
export const fmt2 = fmtMoney

export {
  fmtMoney,
  fmtAmount,
  getCurrencyPrecision,
  setCurrencyPrecision,
  roundMoney,
  parseMoney,
  moneyPlaceholder,
  moneyInputRegex,
  CurrencyPrecision,
  DEFAULT_CURRENCY_PRECISION,
}
