import { roundMoney } from './currencyFormat'

/** Government VAT % — loaded from parameter table (default 5). */
let gvtax = 5

export function getGvTax() {
  return gvtax
}

export function setGvTax(value) {
  const n = Number(value)
  gvtax = Number.isFinite(n) && n >= 0 ? n : 5
}

/** Store net unit price with extra precision (reverse from gross). */
function round6(n) {
  return +Number(n).toFixed(6)
}

/** VAT-inclusive unit price for display / line scaling. */
export function netToGross(net, ratePct = getGvTax()) {
  const netNum = Number(net)
  const rate = Number(ratePct) || getGvTax()
  if (!Number.isFinite(netNum)) return 0
  return roundMoney(netNum * (1 + rate / 100))
}

export function grossToNet(gross, ratePct = getGvTax()) {
  const grossNum = Number(gross)
  const rate = Number(ratePct) || getGvTax()
  if (!Number.isFinite(grossNum)) return 0
  if (rate <= 0) return round6(grossNum)
  return round6(grossNum / (1 + rate / 100))
}

export function unitVatAmount(net, ratePct = getGvTax()) {
  const netNum = Number(net)
  const rate = Number(ratePct) || getGvTax()
  if (!Number.isFinite(netNum)) return 0
  return roundMoney(netNum * rate / 100)
}
