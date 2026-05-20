import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const fmt3 = (v) => (parseFloat(v) || 0).toFixed(3)
export const fmt2 = (v) => (parseFloat(v) || 0).toFixed(2)
