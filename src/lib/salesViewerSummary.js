import { roundMoney } from './currencyFormat'

/** Derive line-level totals from sales-viewer items (fallback when header fields are missing). */
export function salesViewerLineTotals(items) {
  let lineDisc = 0
  let lineTaxable = 0
  let lineTaxableBefore = 0
  let lineTax = 0

  for (const it of items ?? []) {
    const disc = Number(it.discount) || 0
    let sub = Number(it.subTotal) || 0
    if (!sub) {
      const lineTotal = Number(it.lineTotal) || 0
      const vat = Number(it.vatAmt) || 0
      if (lineTotal || vat) sub = roundMoney(lineTotal - vat)
    }
    lineDisc += disc
    lineTaxable += sub
    lineTaxableBefore += sub + disc
    lineTax += Number(it.vatAmt) || 0
  }

  return {
    lineDisc: roundMoney(lineDisc),
    lineTaxable: roundMoney(lineTaxable),
    lineTaxableBefore: roundMoney(lineTaxableBefore),
    lineTax: roundMoney(lineTax),
  }
}

/**
 * Summary rows for Bill With Details.
 * Line discount appears only in the line DISC column — bill discount only here.
 */
export function salesViewerSummaryRows(bill) {
  const items = bill?.items ?? []
  const { lineDisc, lineTaxable, lineTaxableBefore, lineTax } = salesViewerLineTotals(items)

  const headerDisc = roundMoney(Number(bill?.discountAmt) || 0)
  const billDisc = roundMoney(Math.max(0, headerDisc - lineDisc))

  const taxableAfter = roundMoney(
    Number(bill?.taxableAmt) ||
    (lineTaxable > 0 ? lineTaxable - billDisc : 0) ||
    Number(bill?.subTotal) ||
    0,
  )

  const taxableBefore = lineTaxableBefore > lineTaxable
    ? lineTaxableBefore
    : (billDisc > 0 && lineTaxable > 0 ? lineTaxable : taxableAfter)

  const taxAmt = roundMoney(Number(bill?.taxAmt) || lineTax)
  const roundOff = roundMoney(Number(bill?.roundOff) || 0)

  const rows = [['Taxable (before discount)', taxableBefore]]
  if (billDisc > 0) rows.push(['Bill Discount', billDisc])
  rows.push(
    ['Taxable (after discount)', taxableAfter],
    ['Tax', taxAmt],
    ['Round Off', roundOff],
  )
  return rows
}
