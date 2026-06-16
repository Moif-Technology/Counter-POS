import { roundMoney } from './currencyFormat'
import { getGvTax, grossToNet, netToGross } from './gvtax'

export function getCartRowKey(item) {
  if (!item) return null
  return item._key ?? (item.productId != null ? `pid_${item.productId}` : `bc_${item.barcode}`)
}

export function findCartItemByKey(items, rowKey) {
  if (!rowKey || !items?.length) return null
  return items.find(i => getCartRowKey(i) === rowKey) ?? null
}

/**
 * Price-change input → stored unit prices (same logic for preview and apply).
 * @param {'net'|'gross'} editMode
 */
export function resolveUnitPricesFromInput(editMode, amount, vatPer = getGvTax()) {
  const rate = Number(vatPer) || getGvTax()
  const input = Number(amount)
  if (!Number.isFinite(input) || input <= 0) {
    return { unitPrice: 0, unitPriceGross: 0, unitVat: 0, unitNet: 0 }
  }

  const unitPriceGross = editMode === 'gross'
    ? roundMoney(input)
    : netToGross(input, rate)
  const unitPrice = editMode === 'gross'
    ? grossToNet(input, rate)
    : Number(input)

  const unitNet = rate > 0
    ? roundMoney(unitPriceGross / (1 + rate / 100))
    : roundMoney(unitPriceGross)
  const unitVat = roundMoney(unitPriceGross - unitNet)

  return { unitPrice, unitPriceGross, unitVat, unitNet }
}

/** Patch for updateLine from price-change modal. */
export function unitPricePatchFromInput(editMode, amount, vatPer = getGvTax()) {
  const { unitPrice, unitPriceGross } = resolveUnitPricesFromInput(editMode, amount, vatPer)
  if (!unitPrice || unitPrice <= 0) return null
  return {
    unitPrice,
    unitPriceGross,
    vatPer: Number(vatPer) || getGvTax(),
  }
}

/** VAT-inclusive unit price — stable when qty changes (10 × 2 = 20, not 19.99). */
export function resolveUnitPriceGross(line) {
  const stored = Number(line.unitPriceGross)
  if (Number.isFinite(stored) && stored > 0) return stored
  const unitPrice = Number(line.unitPrice) || 0
  const vatPer = Number(line.vatPer) || getGvTax()
  return netToGross(unitPrice, vatPer)
}

/**
 * Line totals — gross-first so qty × unit price with VAT stays consistent.
 * (qty × 9.52 net + VAT per line drifts; qty × 10.00 gross does not.)
 */
export function calcLineTotals(line) {
  const qty = Number(line.qty) || 0
  const unitPrice = Number(line.unitPrice) || 0
  const vatPer = Number(line.vatPer) || getGvTax()
  const discPct = Number(line.discount) || 0

  const unitGross = resolveUnitPriceGross(line)
  const grossBase = roundMoney(unitGross * qty)
  const discountAmt = discPct > 0
    ? roundMoney(grossBase * discPct / 100)
    : roundMoney(Number(line.discountAmt) || 0)

  const lineTotal = roundMoney(grossBase - discountAmt)
  const subTotal = vatPer > 0
    ? roundMoney(lineTotal / (1 + vatPer / 100))
    : lineTotal
  const vatAmt = roundMoney(lineTotal - subTotal)

  return {
    vatPer,
    vatAmt,
    lineTotal,
    discountAmt,
    subTotal,
    unitPriceGross: unitGross,
  }
}

/** Bill summary aggregates — sum grid subtotal / VAT columns (not line totals). */
export function sumBillTotals(items) {
  let subTotal = 0
  let taxAmt = 0
  let discountAmt = 0

  for (const item of items) {
    const line = item.subTotal != null && item.vatAmt != null
      ? item
      : { ...item, ...calcLineTotals(item) }
    subTotal += Number(line.subTotal) || 0
    taxAmt += Number(line.vatAmt) || 0
    discountAmt += Number(line.discountAmt) || 0
  }

  const sub = roundMoney(subTotal)
  const tax = roundMoney(taxAmt)
  const disc = roundMoney(discountAmt)

  return {
    subTotal: sub,
    taxAmt: tax,
    discountAmt: disc,
    taxableAmt: sub,
    gross: roundMoney(sub + tax),
  }
}
