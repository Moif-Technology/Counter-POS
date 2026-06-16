import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  fmtMoney,
  getCurrencyPrecision,
  setCurrencyPrecision,
  roundMoney,
  moneyInputRegex,
} from './currencyFormat'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Format money for display — uses currency precision (default 2). */
export const fmt3 = fmtMoney
export const fmt2 = fmtMoney

export {
  fmtMoney,
  getCurrencyPrecision,
  setCurrencyPrecision,
  roundMoney,
  moneyInputRegex,
}
