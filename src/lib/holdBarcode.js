import { buildCode39Svg } from './barcodeSvg'
import {
  cleanBarcodeScan,
  formatDocBarcode,
  parseDocNumber,
  parseLegacyHoldScan,
} from './documentScan'

export const formatHoldBarcode = (holdNo) => formatDocBarcode(holdNo, 'H')

export function parseHoldBarcodeScan(input) {
  return parseLegacyHoldScan(input) ?? parseDocNumber(input)
}

export function parseHoldBarcode(input) {
  return parseHoldBarcodeScan(input)
}

export function buildHoldBarcodeSvg(holdNo, opts = {}) {
  const text = formatHoldBarcode(holdNo)
  if (!text) return ''
  return buildCode39Svg(text, { height: 64, printWidthMm: 68, ...opts })
}

export { cleanBarcodeScan }
