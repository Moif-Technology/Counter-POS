import { buildCode39Svg } from './barcodeSvg'
import {
  formatDocBarcode,
  parseDocNumber,
  parseLegacyDeliveryScan,
} from './documentScan'

export const formatDeliveryBarcode = formatDocBarcode

export function parseDeliveryBarcodeScan(input) {
  return parseLegacyDeliveryScan(input) ?? parseDocNumber(input)
}

export function parseDeliveryBarcode(input) {
  return parseDeliveryBarcodeScan(input)
}

export function buildDeliveryBarcodeSvg(deliveryNo, opts = {}) {
  const text = formatDeliveryBarcode(deliveryNo)
  if (!text) return ''
  return buildCode39Svg(text, { height: 64, printWidthMm: 68, ...opts })
}

export function parseDeliveryRemarks(remarks) {
  const raw = String(remarks ?? '').trim()
  if (!raw) return { billComment: '', deliveryAddress: '', deliveryPhone: '' }
  const parts = raw.split('|').map(p => p.trim()).filter(Boolean)
  let deliveryAddress = ''
  let deliveryPhone = ''
  const commentParts = []
  for (const p of parts) {
    if (p.startsWith('Addr:')) deliveryAddress = p.slice(5).trim()
    else if (p.startsWith('Tel:')) deliveryPhone = p.slice(4).trim()
    else commentParts.push(p)
  }
  return {
    billComment: commentParts.join(' | '),
    deliveryAddress,
    deliveryPhone,
  }
}
