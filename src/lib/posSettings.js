/** Auto round-off to nearest 0.25 — from parameter autoroundoff (1 = on, 0 = off). */
let autoRoundOff = 0

export function isAutoRoundOffEnabled() {
  return autoRoundOff === 1
}

export function setAutoRoundOff(value) {
  autoRoundOff = Number(value) === 1 ? 1 : 0
}

/** Bill net at/above this → ask "give a discount?" on BILLING. POS parameter discount_prompt_amount (ERP → Branch Management). 0 = off. */
let discountPromptAmount = 0

export function getDiscountPromptAmount() {
  return discountPromptAmount
}

export function setDiscountPromptAmount(value) {
  const n = Number(value)
  discountPromptAmount = Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Bill receipt layout — POS parameters set in Counter POS → Reports → Control Panel.
 * Header / footer: once blocks are saved there, they are drawn at print time (lib/receiptBlocks);
 * empty = company block / default footer. Before that, the old Heading 1–5 / Footer 1–2 lines apply.
 */
/**
 * Bill fields the Control Panel can restyle / hide (click the field on the preview bill).
 * size = printed px today (receiptPrintTheme RECEIPT_FONT). param = the older show/hide toggle
 * that stays the switch for that field.
 */
export const BILL_FIELDS = {
  trn:        { label: 'TRN', size: 13 },
  title:      { label: 'Invoice title', size: 14 },
  titleAr:    { label: 'Arabic title', size: 13, param: 'receipt_show_arabic_title' },
  billNo:     { label: 'Bill number', size: 13 },
  date:       { label: 'Date & time', size: 13 },
  counter:    { label: 'Counter', size: 13 },
  cashier:    { label: 'Cashier', size: 13 },
  customer:   { label: 'Customer details', size: 13 },
  comments:   { label: 'Comments', size: 13 },
  itemHead:   { label: 'Item column titles', size: 12, line: 'lineItemHead' },
  items:      { label: 'Item lines', size: 13, line: 'lineItemRows' },
  itemSub:    { label: 'Item code & VAT', size: 12, param: 'receipt_show_item_code' },
  discount:   { label: 'Discount / round off', size: 13 },
  total:      { label: 'Total', size: 15 },
  settlement: { label: 'Settlement', size: 13 },
  itemCount:  { label: 'Items count', size: 13 },
  qtyTotal:   { label: 'Qty total', size: 13 },
  billAmount: { label: 'Bill amount', size: 13 },
  paidAmount: { label: 'Paid amount', size: 13 },
  balance:    { label: 'Balance amount', size: 13 },
  osBalance:  { label: 'O/S balance (credit bills)', size: 13 },
  tax:        { label: 'Tax details', size: 12, param: 'receipt_show_tax_summary', line: 'lineTaxHead' },
  barcode:    { label: 'Reprint barcode', size: 13, param: 'receipt_show_barcode' },
  printer:    { label: 'Printer name', size: 11 },
}

/** Dotted lines on the bill; each can be switched off. */
export const BILL_LINES = {
  lineTitleTop:    'Dotted line above invoice title',
  lineTitleBottom: 'Dotted line below invoice title',
  lineCustomer:    'Dotted line above customer',
  lineItemsTop:    'Dotted line above items',
  lineItemHead:    'Dotted line under item column titles',
  lineItemRows:    'Dotted lines between items',
  lineTotals:      'Dotted line above total',
  lineTax:         'Dotted line above tax details',
  lineTaxHead:     'Dotted line under tax titles',
  lineBarcode:     'Dotted line above barcode',
  lineFooter:      'Dotted line above footer',
}

export const FIELD_SIZE = { min: 8, max: 28 }
export const FIELD_WEIGHT = { min: 400, max: 800, step: 100, def: 700 }

const clampInt = (v, { min, max, step = 1 }) => Math.max(min, Math.min(max, Math.round(Number(v) / step) * step))

/**
 * receipt_bill_layout JSON → { fields: { key: { size?, weight?, hide? } }, lines: { key: false } }.
 * Known keys and clamped integers only: these values end up inside the print CSS.
 */
export function parseBillLayout(raw) {
  let v
  try { v = JSON.parse(raw || '{}') } catch { v = {} }
  const fields = {}
  for (const key of Object.keys(BILL_FIELDS)) {
    const f = v?.fields?.[key]
    if (!f || typeof f !== 'object') continue
    const o = {}
    if (Number.isFinite(f.size)) o.size = clampInt(f.size, FIELD_SIZE)
    if (Number.isFinite(f.weight)) o.weight = clampInt(f.weight, FIELD_WEIGHT)
    if (f.hide === true) o.hide = true
    if (Object.keys(o).length) fields[key] = o
  }
  const lines = {}
  for (const key of Object.keys(BILL_LINES)) if (v?.lines?.[key] === false) lines[key] = false
  return { fields, lines }
}

/** Field style after the layout + old toggles: { size, weight, hidden }. */
export function billField(rs, key) {
  const def = BILL_FIELDS[key]
  const f = rs.layout?.fields?.[key] ?? {}
  const toggleOff = def.param ? !rs.toggles?.[def.param] : false
  return { size: f.size ?? def.size, weight: f.weight ?? FIELD_WEIGHT.def, hidden: !!f.hide || toggleOff }
}

export const billLineOn = (rs, key) => rs.layout?.lines?.[key] !== false

let receiptParams = {}
let receipt = parseReceiptSettings({})

/** Saved Control Panel blocks; image blocks only with a PNG/JPEG data URL (drawn on a canvas at print). */
function parseBlocks(raw) {
  try {
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.filter(b => b && (b.type !== 'image' || /^data:image\/(png|jpeg);base64,/.test(String(b.src ?? ''))))
  } catch {
    return []
  }
}

export function parseReceiptSettings(p = {}) {
  const on = (k) => p[k] == null || p[k] === '' || Number(p[k]) !== 0
  const lines = (nums) => nums.map(n => String(p[`heading${n}_counter`] ?? '').trim()).filter(Boolean)
  const custom = (which) => String(p[`receipt_${which}_blocks`] ?? '').trim() !== ''
  const headerCustom = custom('header')
  const footerCustom = custom('footer')
  return {
    headerBlocks: headerCustom ? parseBlocks(p.receipt_header_blocks) : [],
    footerBlocks: footerCustom ? parseBlocks(p.receipt_footer_blocks) : [],
    copies: Math.max(1, Math.min(10, Math.floor(Number(p.receipt_copies) || 1))),
    headings: headerCustom ? [] : lines([1, 2, 3, 4, 5]),
    footers: footerCustom ? [] : lines([6, 7]),
    showArabicTitle: on('receipt_show_arabic_title'),
    showItemCode: on('receipt_show_item_code'),
    showTaxSummary: on('receipt_show_tax_summary'),
    showBarcode: on('receipt_show_barcode'),
    toggles: Object.fromEntries(Object.values(BILL_FIELDS).filter(f => f.param).map(f => [f.param, on(f.param)])),
    layout: parseBillLayout(p.receipt_bill_layout),
  }
}

export function setReceiptSettings(params) {
  receiptParams = params ?? {}
  receipt = parseReceiptSettings(receiptParams)
}

export function getReceiptSettings() {
  return receipt
}

/** Raw parameter values (keys as stored) — for the Control Panel form. */
export function getReceiptParams() {
  return receiptParams
}
