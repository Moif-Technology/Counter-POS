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

/** Resolve line VAT % — group / gross-entry lines always use gvtax; explicit 0 is zero-rated. */
export function lineVatRate(line) {
  if (line?.groupId != null || line?.priceIsGross) return getGvTax()
  const n = Number(line?.vatPer)
  return Number.isFinite(n) ? n : getGvTax()
}

/** VAT-inclusive unit price — stable when qty changes (10 × 2 = 20, not 19.99). */
export function resolveUnitPriceGross(line) {
  const storedGross = Number(line.unitPriceGross)
  if (Number.isFinite(storedGross) && storedGross > 0) return storedGross
  if (line?.priceIsGross || line?.groupId != null) {
    return roundMoney(Number(line.unitPrice) || 0)
  }
  const unitPrice = Number(line.unitPrice) || 0
  const vatPer = lineVatRate(line)
  return netToGross(unitPrice, vatPer)
}

/**
 * Line totals — discount on taxable (pre-VAT); VAT on discounted taxable.
 */
export function lineTaxableBeforeDiscount(line) {
  const qty = Number(line.qty) || 0
  const vatPer = lineVatRate(line)
  const unitGross = resolveUnitPriceGross(line)
  const grossBase = roundMoney(unitGross * qty)
  if (vatPer <= 0) return grossBase
  return roundMoney(grossBase / (1 + vatPer / 100))
}

export function calcLineTotals(line) {
  const vatPer = lineVatRate(line)
  const discPct = Number(line.discount) || 0
  const taxableBase = lineTaxableBeforeDiscount(line)
  const absBase = Math.abs(taxableBase)
  const sign = taxableBase < 0 ? -1 : 1

  let discountAmt
  if (line.discountMode === 'amt') {
    discountAmt = roundMoney(Math.min(Math.abs(Number(line.discountAmt) || 0), absBase))
  } else if (discPct > 0) {
    discountAmt = roundMoney(absBase * discPct / 100)
  } else {
    discountAmt = roundMoney(Math.abs(Number(line.discountAmt) || 0))
    if (discountAmt > absBase) discountAmt = absBase
  }

  const signedDisc = roundMoney(discountAmt * sign)
  const subTotal = roundMoney(taxableBase - signedDisc)
  const vatAmt = vatPer > 0 ? roundMoney(subTotal * vatPer / 100) : 0
  const lineTotal = roundMoney(subTotal + vatAmt)
  const unitGross = resolveUnitPriceGross(line)
  const unitNet = vatPer > 0
    ? roundMoney(unitGross / (1 + vatPer / 100))
    : roundMoney(unitGross)

  return {
    vatPer,
    vatAmt,
    lineTotal,
    discountAmt: roundMoney(discountAmt),
    subTotal,
    unitPriceGross: unitGross,
    unitPrice: unitNet,
  }
}

/** Bill summary aggregates — sum grid subtotal / VAT columns (not line totals). */
export function sumBillTotals(items) {
  let subTotal = 0
  let taxAmt = 0
  let discountAmt = 0

  for (const item of items) {
    const line = { ...item, ...calcLineTotals(item) }
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
    /** Sum of taxable per line before line-level discount. */
    taxableBeforeLineDisc: roundMoney(
      items.reduce((s, item) => {
        const line = { ...item, ...calcLineTotals(item) }
        const disc = Number(line.discountAmt) || 0
        return s + (Number(line.subTotal) || 0) + disc
      }, 0),
    ),
  }
}

/** Merge fresh line totals onto cart row (keeps ids; updates money fields). */
export function normalizeCartLine(item) {
  const totals = calcLineTotals(item)
  return { ...item, ...totals }
}

/** Ensure each line has computed discountAmt / subTotal before save or hold. */
export function enrichCartItemsForSave(items) {
  return (items ?? []).map((item) => {
    const line = normalizeCartLine(item)
    const productId = line.productId != null && Number(line.productId) > 0
      ? Number(line.productId)
      : null
    const groupId = line.groupId != null && Number(line.groupId) > 0
      ? Number(line.groupId)
      : null
    return {
      ...line,
      productId,
      groupId,
      productCode: line.productCode ?? line.groupCode ?? null,
      description: line.description ?? line.short_description ?? '',
    }
  })
}
