import { roundMoney } from './currencyFormat'
import { getGvTax } from './gvtax'
import { lineTaxableBeforeDiscount, sumBillTotals } from './cartLine'

export { lineTaxableBeforeDiscount } from './cartLine'

/** Bill taxable total after line discounts. */
export function billTaxableBeforeDiscount(cartItems) {
  const { subTotal } = sumBillTotals(cartItems ?? [])
  return subTotal
}

/**
 * Preview discount from % or amount input (discount always on taxable base).
 * @returns {{ discountAmt: number, pct: number, netTaxable: number, grossTotal: number }}
 */
export function previewLineDiscount(line, mode, pctStr, amtStr) {
  const taxableBase = lineTaxableBeforeDiscount(line)
  const vatPer = Number(line?.vatPer) || getGvTax()
  const { discountAmt, pct, netTaxable } = resolveDiscountOnTaxable(taxableBase, mode, pctStr, amtStr)
  const grossTotal = vatPer > 0
    ? roundMoney(netTaxable * (1 + vatPer / 100))
    : netTaxable
  return { discountAmt, pct, netTaxable, grossTotal }
}

export function previewBillDiscount(cartItems, mode, pctStr, amtStr) {
  const taxableBase = billTaxableBeforeDiscount(cartItems)
  const { discountAmt, pct, netTaxable } = resolveDiscountOnTaxable(taxableBase, mode, pctStr, amtStr)
  const { taxAmt } = sumBillTotals(cartItems ?? [])
  const ratio = taxableBase !== 0 ? netTaxable / taxableBase : 1
  const taxAfter = roundMoney(taxAmt * ratio)
  const grossTotal = roundMoney(netTaxable + taxAfter)
  return { discountAmt, pct, netTaxable, grossTotal, taxAfter }
}

export function resolveDiscountOnTaxable(taxableBase, mode, pctStr, amtStr) {
  const base = Number(taxableBase) || 0
  const absBase = Math.abs(base)
  const sign = base < 0 ? -1 : 1

  let discountAmt
  let pct

  if (mode === 'amt') {
    const raw = parseFloat(amtStr) || 0
    discountAmt = roundMoney(Math.min(Math.max(raw, 0), absBase))
    pct = absBase > 0 ? roundMoney((discountAmt / absBase) * 100) : 0
  } else {
    pct = Math.min(Math.max(parseFloat(pctStr) || 0, 0), 100)
    discountAmt = roundMoney(absBase * pct / 100)
  }

  const signedDisc = roundMoney(discountAmt * sign)
  const netTaxable = roundMoney(base - signedDisc)

  return {
    discountAmt: roundMoney(discountAmt),
    pct,
    netTaxable,
    signedDisc,
  }
}

/** Initial modal state from stored line. */
export function lineDiscountInitialState(item) {
  const taxable = lineTaxableBeforeDiscount(item)
  if (item?.discountMode === 'amt') {
    const amt = roundMoney(Number(item.discountAmt) || 0)
    return {
      mode: 'amt',
      discPct: taxable !== 0 && amt ? String(roundMoney((amt / Math.abs(taxable)) * 100)) : '',
      discAmt: amt ? String(amt) : '',
    }
  }
  const pct = Number(item?.discount) || 0
  return {
    mode: 'pct',
    discPct: pct > 0 ? String(pct) : '',
    discAmt: pct > 0 ? String(roundMoney(Math.abs(taxable) * pct / 100)) : '',
  }
}

export function billDiscountInitialState(cartItems, billDiscountAmt) {
  const taxable = billTaxableBeforeDiscount(cartItems)
  const amt = roundMoney(Number(billDiscountAmt) || 0)
  if (!amt) return { mode: 'pct', discPct: '', discAmt: '' }
  return {
    mode: 'amt',
    discPct: taxable !== 0 ? String(roundMoney((amt / Math.abs(taxable)) * 100)) : '',
    discAmt: String(amt),
  }
}
