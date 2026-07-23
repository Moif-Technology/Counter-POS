import { Capacitor, registerPlugin } from '@capacitor/core'
import { fmtMoney } from './currencyFormat'
import { fmtQty } from './utils'
import { PM, isMultiPaymentMode, normalizePaymentMode } from './paymentModes'
import { formatDocBarcode } from './documentScan'
import { formatHoldBarcode } from './holdBarcode'
import { formatDeliveryBarcode } from './deliveryBarcode'
import {
  fmtReceiptDateTime,
  resolveCashierName,
  resolveReceiptCompanyMeta,
} from './receiptPrintTheme'

const SunmiPrinter = registerPlugin('SunmiPrinter', {
  web: () => ({
    isAvailable: () => Promise.resolve({ available: false }),
    print: () => Promise.reject(new Error('Sunmi printer not available on web')),
    printHtml: () => Promise.reject(new Error('Sunmi printer not available on web')),
  }),
})

export const IS_ANDROID_POS = Capacitor.getPlatform() === 'android'
const SUNMI_80MM_BITMAP_WIDTH = 576

const LINE_WIDTH = 48
const FONT = {
  normal: 20,
  small: 18,
  title: 23,
  store: 24,
  total: 22,
}
const PAIR_WIDTHS = [20, 28]
const PAIR_ALIGNS = [0, 2]
const ITEM_WIDTHS = [24, 6, 8, 10]
const HOLD_ITEM_WIDTHS = [30, 6, 12]

function clean(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
}

function money(value) {
  return fmtMoney(Number(value) || 0)
}

function clip(value, width) {
  const safe = clean(value)
  return safe.length > width ? safe.slice(0, width) : safe
}

function padRight(value, width) {
  return clip(value, width).padEnd(width, ' ')
}

function padLeft(value, width) {
  return clip(value, width).padStart(width, ' ')
}

function center(value, width = LINE_WIDTH) {
  const safe = clip(value, width)
  const left = Math.floor((width - safe.length) / 2)
  return `${' '.repeat(Math.max(0, left))}${safe}`.padEnd(width, ' ')
}

function fixedColumns(parts) {
  return parts.map(part => {
    const value = part.value ?? ''
    const width = part.width ?? 0
    const align = part.align ?? 'left'
    if (align === 'right') return padLeft(value, width)
    if (align === 'center') return center(value, width).slice(0, width)
    return padRight(value, width)
  }).join('').slice(0, LINE_WIDTH)
}

function wrapLines(value, width = LINE_WIDTH) {
  const safe = clean(value)
  if (!safe) return []
  const words = safe.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    if (!line) {
      line = word
    } else if ((line.length + 1 + word.length) <= width) {
      line += ` ${word}`
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

function plainReceiptCommand(lines) {
  return textBitmapCommand(lines)
}

function textBitmapCommand(lines, opts = {}) {
  return {
    type: 'receiptTextBitmap',
    text: lines.join('\n'),
    width: opts.width ?? SUNMI_80MM_BITMAP_WIDTH,
    padding: opts.padding ?? 8,
    textSize: opts.textSize ?? 22,
  }
}

function ruleCommand(char = '-') {
  return textBitmapCommand([plainDivider(char)], { padding: 2 })
}

function plainDivider(char = '-') {
  return char.repeat(LINE_WIDTH)
}

function companyHeaderLines(meta = {}, billCompany = {}) {
  const resolved = resolveReceiptCompanyMeta(meta)
  const co = {
    ...resolved,
    name: billCompany.companyName ?? meta.companyName ?? resolved.name,
    address: billCompany.companyAddress ?? meta.address ?? resolved.address,
    phone: billCompany.companyPhone ?? meta.phone ?? resolved.phone,
    branch: billCompany.branchName ?? meta.branchName ?? resolved.branch,
    trn: billCompany.taxRegistrationNo ?? meta.trn ?? resolved.trn,
  }

  const lines = [center(co.name || 'MOIF TECHNOLOGY')]
  if (co.branch) lines.push(center(co.branch))
  if (co.phone) lines.push(center(`Ph: ${co.phone}`))
  for (const line of wrapLines(co.address, LINE_WIDTH)) lines.push(center(line))
  if (co.trn) lines.push(center(`TRN: ${co.trn}`))
  return lines
}

function pairLine(left, right, leftWidth = 22, rightWidth = 26) {
  return fixedColumns([
    { value: left, width: leftWidth },
    { value: right, width: rightWidth, align: 'right' },
  ])
}

function amountLine(label, value) {
  return pairLine(label, money(value), 24, 24)
}

function divider(char = '-') {
  return { type: 'text', text: char.repeat(LINE_WIDTH), size: FONT.small, align: 0 }
}

function text(value, align = 0, size = FONT.normal) {
  const safe = clean(value)
  return safe ? { type: 'text', text: safe, align, size } : null
}

function columns(texts, widths, aligns, size = FONT.normal) {
  return {
    type: 'columns',
    texts: texts.map(clean),
    widths,
    aligns,
    size,
  }
}

function pushText(commands, value, align = 0, size = FONT.normal) {
  const command = text(value, align, size)
  if (command) commands.push(command)
}

function pushWrapped(commands, value, align = 0, size = FONT.normal, width = LINE_WIDTH) {
  const safe = clean(value)
  if (!safe) return
  for (let i = 0; i < safe.length; i += width) {
    pushText(commands, safe.slice(i, i + width), align, size)
  }
}

function companyHeaderCommands(meta = {}, billCompany = {}) {
  const co = {
    ...resolveReceiptCompanyMeta(meta),
    name: billCompany.companyName ?? meta.companyName ?? resolveReceiptCompanyMeta(meta).name,
    address: billCompany.companyAddress ?? meta.address ?? resolveReceiptCompanyMeta(meta).address,
    phone: billCompany.companyPhone ?? meta.phone ?? resolveReceiptCompanyMeta(meta).phone,
    branch: billCompany.branchName ?? meta.branchName ?? resolveReceiptCompanyMeta(meta).branch,
    trn: billCompany.taxRegistrationNo ?? meta.trn ?? resolveReceiptCompanyMeta(meta).trn,
  }

  const commands = []
  pushWrapped(commands, co.name || 'MOIF TECHNOLOGY', 1, FONT.store)
  pushWrapped(commands, co.branch, 1, FONT.small)
  pushWrapped(commands, co.phone ? `Ph: ${co.phone}` : '', 1, FONT.small)
  pushWrapped(commands, co.address, 1, FONT.small)
  pushWrapped(commands, co.trn ? `TRN: ${co.trn}` : '', 1, FONT.small)
  return commands
}

function finishCommands(commands, barcodeText, displayText = '', scanLabel = 'Scan for reprint') {
  if (barcodeText) {
    commands.push(textBitmapCommand([plainDivider(), center(scanLabel)], { padding: 2 }))
    commands.push({ type: 'barcode', text: barcodeText, height: 64, width: 2, position: 0 })
    if (displayText) {
      commands.push(textBitmapCommand([center(displayText)], { padding: 0 }))
    }
  }
  commands.push(textBitmapCommand([plainDivider(), center('Thank You......Visit Again')], { padding: 2 }))
  commands.push({ type: 'feed', lines: 2 })
  commands.push({ type: 'cut' })
  return commands
}

function billNoLabel(bill) {
  return String(bill.billNo ?? bill.salesId ?? '')
}

function billLineUnitDisplay(it) {
  const qty = Math.abs(Number(it.qty) || 1)
  const total = Number(it.lineTotal) || 0
  if (qty > 0 && total) return money(total / qty)
  return money(it.unitPrice)
}

export function buildBillPrintCommands(bill, meta = {}) {
  if (!bill) throw new Error('No bill data to print')

  const isReturn = String(bill.transactionType ?? '').toUpperCase() === 'RETURN'
  const label = billNoLabel(bill)
  const items = bill.items ?? []
  const itemCount = items.length
  const qtyTotal = items.reduce((s, it) => s + Math.abs(Number(it.qty) || 0), 0)
  const payMode = normalizePaymentMode(bill.paymentMode)
  const settlement = isMultiPaymentMode(bill.paymentMode) ? 'MULTIPAYMENT' : payMode

  const lines = [
    ...companyHeaderLines(meta, bill.company ?? {}),
    plainDivider(),
    center(isReturn ? 'RETURN INVOICE' : 'TAX INVOICE'),
    plainDivider(),
    pairLine(`BILL # : ${label}`, fmtReceiptDateTime(bill.billTime ?? bill.billDate)),
    `COUNTER : ${clean(bill.counterNo)}`.slice(0, LINE_WIDTH),
    `CASHIER : ${clean(bill.staffName ?? 'CASHIER')}`.slice(0, LINE_WIDTH),
  ]

  const customerName = clean(bill.customer?.customerName)
  if (customerName && !/^(walk-?in|walk in)$/i.test(customerName)) {
    lines.push(plainDivider())
    lines.push(...wrapLines(`Customer: ${customerName}`))
    if (bill.customer?.customerCode) lines.push(...wrapLines(`Code: ${bill.customer.customerCode}`))
    if (bill.customer?.taxRegNo) lines.push(...wrapLines(`TRN: ${bill.customer.taxRegNo}`))
  }

  if (bill.remarks?.trim()) lines.push(...wrapLines(`Comments: ${bill.remarks}`))

  lines.push(plainDivider())
  lines.push(fixedColumns([
    { value: 'Description', width: 24 },
    { value: 'Qty', width: 5, align: 'right' },
    { value: 'Price', width: 9, align: 'right' },
    { value: 'Total', width: 10, align: 'right' },
  ]))
  lines.push(plainDivider('.'))
  for (const it of items) {
    lines.push(...wrapLines(it.description || 'Item'))
    const vatPer = Number(it.vatPer) || Number(bill.taxRate) || 5
    const vatAmt = Number(it.vatAmt) || 0
    lines.push(fixedColumns([
      { value: it.productCode || (it.productId ? String(it.productId) : ''), width: 24 },
      { value: fmtQty(it.qty), width: 5, align: 'right' },
      { value: billLineUnitDisplay(it), width: 9, align: 'right' },
      { value: money(it.lineTotal), width: 10, align: 'right' },
    ]))
    lines.push(pairLine('', `VAT@${vatPer}% (${money(vatAmt)})`, 18, 30))
  }

  const taxableAmt = Number(bill.taxableAmt) || 0
  const taxAmt = Number(bill.taxAmt) || 0
  const amount = Number(bill.amount) || 0
  const paidAmount = Number(bill.paidAmount ?? bill.amount) || 0
  const balanceAmount = Number(bill.balanceAmount) || 0
  const discountAmt = Number(bill.discountAmt) || 0
  const roundOff = bill.roundOff != null ? Number(bill.roundOff) : 0

  lines.push(plainDivider())
  if (discountAmt) lines.push(amountLine('DISCOUNT', discountAmt))
  if (roundOff) lines.push(amountLine('ROUND OFF', roundOff))
  lines.push(amountLine('TOTAL :', amount))
  lines.push(`SETTLEMENT : ${settlement}`.slice(0, LINE_WIDTH))

  if (isMultiPaymentMode(bill.paymentMode)) {
    for (const split of bill.paymentSplits ?? []) {
      lines.push(amountLine(split.payMode, split.amount))
    }
  }

  lines.push(pairLine(`ITEMS : ${itemCount}`, `BILL AMOUNT : ${money(amount)}`))
  lines.push(pairLine(`QTY : ${fmtQty(qtyTotal)}`, `PAID AMOUNT : ${money(paidAmount)}`))
  lines.push(pairLine('', `BAL. AMOUNT : ${money(balanceAmount)}`))

  if (payMode === PM.CREDIT && bill.customer?.customerId) {
    const os = Number(bill.customerOsBalance) || Number(bill.outstandingBalance) || 0
    lines.push(amountLine('O/S BALANCE', os))
  }

  lines.push(plainDivider())
  lines.push(center('Tax Details'))
  lines.push(fixedColumns([
    { value: 'Taxable Amount', width: 18 },
    { value: 'Tax Amount', width: 14, align: 'right' },
    { value: 'Bill Amount', width: 16, align: 'right' },
  ]))
  lines.push(fixedColumns([
    { value: money(taxableAmt), width: 18 },
    { value: money(taxAmt), width: 14, align: 'right' },
    { value: money(amount), width: 16, align: 'right' },
  ]))

  const commands = [plainReceiptCommand(lines)]
  return finishCommands(commands, formatDocBarcode(label), label, 'Scan for reprint')
}

export function buildHoldPrintCommands(hold, meta = {}, copies = 1) {
  if (!hold?.holdNo) throw new Error('No hold number to print')

  const oneCopy = [
    ...companyHeaderLines(meta),
    plainDivider(),
    center(hold.isReturn ? 'HELD RETURN' : 'HELD BILL'),
    plainDivider(),
    pairLine(`HOLD # : ${clean(hold.holdNo)}`, fmtReceiptDateTime(hold.billDate ?? new Date())),
    `COUNTER : ${clean(hold.counterNo ?? '')}`.slice(0, LINE_WIDTH),
    `CASHIER : ${clean(hold.cashierName ?? 'CASHIER')}`.slice(0, LINE_WIDTH),
  ]

  if (hold.customerName && !/^(walk-?in)$/i.test(hold.customerName)) {
    oneCopy.push(...wrapLines(`Customer: ${hold.customerName}`))
  }
  if (hold.remarks) oneCopy.push(...wrapLines(`Comments: ${hold.remarks}`))
  oneCopy.push(plainDivider())
  oneCopy.push(fixedColumns([
    { value: 'Description', width: 31 },
    { value: 'Qty', width: 5, align: 'right' },
    { value: 'Total', width: 12, align: 'right' },
  ]))
  oneCopy.push(plainDivider('.'))
  for (const it of hold.items ?? []) {
    oneCopy.push(...wrapLines(it.description || 'Item'))
    oneCopy.push(fixedColumns([
      { value: it.productCode ?? it.barcode ?? '', width: 31 },
      { value: fmtQty(it.qty), width: 5, align: 'right' },
      { value: money(it.lineTotal), width: 12, align: 'right' },
    ]))
  }
  const itemCount = (hold.items ?? []).length
  const qtyTotal = (hold.items ?? []).reduce((s, it) => s + Math.abs(Number(it.qty) || 0), 0)
  oneCopy.push(plainDivider())
  oneCopy.push(amountLine('TOTAL :', hold.netAmount))
  oneCopy.push(pairLine(`ITEMS : ${itemCount}`, `QTY : ${fmtQty(qtyTotal)}`))

  const commandCopies = repeatPlainCopies(oneCopy, copies)
  return finishCommands([plainReceiptCommand(commandCopies)], formatHoldBarcode(hold.holdNo), String(hold.holdNo ?? ''), 'Scan to recall')
}

export function buildDeliveryPrintCommands(delivery, meta = {}, copies = 1) {
  if (!delivery?.deliveryNo) throw new Error('No delivery number to print')

  const oneCopy = [
    ...companyHeaderLines(meta),
    plainDivider(),
    center('DELIVERY NOTE'),
    plainDivider(),
    `DELIVERY # : ${clean(delivery.deliveryNo)}`.slice(0, LINE_WIDTH),
    `DELIVER BY : ${fmtReceiptDateTime(delivery.deliveryTime)}`.slice(0, LINE_WIDTH),
    `COUNTER : ${clean(delivery.counterNo ?? '')}`.slice(0, LINE_WIDTH),
    `CASHIER : ${clean(delivery.cashierName ?? meta.cashierName ?? resolveCashierName(meta.cashier))}`.slice(0, LINE_WIDTH),
    plainDivider(),
    center('Customer Details'),
    ...wrapLines(`Customer: ${delivery.customerName ?? ''}`),
  ]
  if (delivery.customerCode) oneCopy.push(...wrapLines(`Code: ${delivery.customerCode}`))
  if (delivery.mobileNo) oneCopy.push(...wrapLines(`Tel: ${delivery.mobileNo}`))
  oneCopy.push(...wrapLines(`Deliver To: ${delivery.deliveryAddress ?? ''}`))
  if (delivery.deliveryPhone) oneCopy.push(...wrapLines(`Delivery Tel: ${delivery.deliveryPhone}`))
  if (delivery.remarks) oneCopy.push(...wrapLines(`Comments: ${delivery.remarks}`))
  oneCopy.push(plainDivider())
  oneCopy.push(fixedColumns([
    { value: 'Description', width: 24 },
    { value: 'Qty', width: 5, align: 'right' },
    { value: 'Price', width: 9, align: 'right' },
    { value: 'Total', width: 10, align: 'right' },
  ]))
  oneCopy.push(plainDivider('.'))
  for (const it of delivery.items ?? []) {
    oneCopy.push(...wrapLines(it.description || 'Item'))
    const vatPer = Number(it.vatPer) || Number(delivery.taxRate) || 5
    const vatAmt = Number(it.vatAmt) || 0
    oneCopy.push(fixedColumns([
      { value: it.productCode ?? it.barcode ?? '', width: 24 },
      { value: fmtQty(it.qty), width: 5, align: 'right' },
      { value: billLineUnitDisplay(it), width: 9, align: 'right' },
      { value: money(it.lineTotal), width: 10, align: 'right' },
    ]))
    oneCopy.push(pairLine('', `VAT@${vatPer}% (${money(vatAmt)})`, 18, 30))
  }

  const itemCount = (delivery.items ?? []).length
  const qtyTotal = (delivery.items ?? []).reduce((s, it) => s + Math.abs(Number(it.qty) || 0), 0)
  oneCopy.push(plainDivider())
  if (Number(delivery.discountAmt) || 0) oneCopy.push(amountLine('DISCOUNT', delivery.discountAmt))
  if (Number(delivery.roundOff) || 0) oneCopy.push(amountLine('ROUND OFF', delivery.roundOff))
  oneCopy.push(amountLine('TOTAL :', delivery.netAmount))
  oneCopy.push(pairLine(`ITEMS : ${itemCount}`, `QTY : ${fmtQty(qtyTotal)}`))
  oneCopy.push(plainDivider())
  oneCopy.push(center('Tax Details'))
  oneCopy.push(fixedColumns([
    { value: 'Taxable Amount', width: 18 },
    { value: 'Tax Amount', width: 14, align: 'right' },
    { value: 'Bill Amount', width: 16, align: 'right' },
  ]))
  oneCopy.push(fixedColumns([
    { value: money(delivery.taxableAmt), width: 18 },
    { value: money(delivery.taxAmt), width: 14, align: 'right' },
    { value: money(delivery.netAmount), width: 16, align: 'right' },
  ]))

  const commandCopies = repeatPlainCopies(oneCopy, copies)
  return finishCommands([plainReceiptCommand(commandCopies)], formatDeliveryBarcode(delivery.deliveryNo), String(delivery.deliveryNo ?? ''), 'Scan to recall')
}

function repeatCopies(commands, copies = 1) {
  const n = Math.max(1, Math.min(20, Math.floor(Number(copies) || 1)))
  return Array.from({ length: n }, () => commands).flat()
}

function repeatPlainCopies(lines, copies = 1) {
  const n = Math.max(1, Math.min(20, Math.floor(Number(copies) || 1)))
  return Array.from({ length: n }, () => lines).flatMap((copy, idx) => (
    idx === 0 ? copy : ['', ...copy]
  ))
}

export async function printAndroidCommands(commands) {
  if (!IS_ANDROID_POS) return false
  await SunmiPrinter.print({ commands })
  return true
}

function prepareAndroidReceiptHtml(html) {
  return String(html ?? '')
    .replace(/<script>[\s\S]*?window\.onload[\s\S]*?<\/script>/i, '')
    .replace('</head>', `
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      background: #fff !important;
    }
    body {
      padding: 10px 12px !important;
    }
    @page {
      size: auto !important;
      margin: 0 !important;
    }
  </style>
</head>`)
}

export async function printAndroidReceiptHtml(html) {
  if (!IS_ANDROID_POS) return false
  await SunmiPrinter.printHtml({
    html: prepareAndroidReceiptHtml(html),
    width: SUNMI_80MM_BITMAP_WIDTH,
  })
  return true
}

export async function printAndroidBill(bill, meta = {}) {
  return printAndroidCommands(buildBillPrintCommands(bill, meta))
}

export async function printAndroidHold(hold, meta = {}, copies = 1) {
  return printAndroidCommands(buildHoldPrintCommands(hold, meta, copies))
}

export async function printAndroidDelivery(delivery, meta = {}, copies = 1) {
  return printAndroidCommands(buildDeliveryPrintCommands(delivery, meta, copies))
}

function fmtBillDate(d) {
  if (!d) return '-'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).replace(/ /g, '/')
}

function voucherLabel(voucher) {
  if (!voucher) return ''
  const prefix = clean(voucher.voucherPrefix ?? 'RCV')
  const no = voucher.autoVoucherNo ?? voucher.manualVoucherNo
  if (no == null || no === '') return prefix
  return `${prefix}${no}`
}

export function buildCreditReceiptVoucherPrintCommands(receipt, meta = {}) {
  if (!receipt) throw new Error('No credit receipt voucher data to print')

  const payMode = normalizePaymentMode(receipt.paymentMode)
  const cleared = receipt.clearedBills ?? []
  const voucherNo = voucherLabel(receipt.voucher)
  const lines = [
    ...companyHeaderLines(meta),
    plainDivider(),
    center('RECEIPT VOUCHER'),
    plainDivider(),
    `RECEIPT # : ${clean(receipt.receiptNo ?? '-')}`.slice(0, LINE_WIDTH),
    `DATE      : ${fmtReceiptDateTime(receipt.transactionDate)}`.slice(0, LINE_WIDTH),
    `COUNTER   : ${clean(meta.counterNo ?? receipt.counterNo ?? '')}`.slice(0, LINE_WIDTH),
    `CASHIER   : ${clean(meta.cashierName ?? 'CASHIER')}`.slice(0, LINE_WIDTH),
  ]

  if (voucherNo) lines.push(`VOUCHER   : ${voucherNo}`.slice(0, LINE_WIDTH))

  lines.push(
    plainDivider(),
    center('Customer'),
    ...wrapLines(`Name: ${receipt.customerName ?? ''}`),
  )
  if (receipt.customerCode) lines.push(`Code: ${clean(receipt.customerCode)}`.slice(0, LINE_WIDTH))
  lines.push(`Payment: ${payMode}`.slice(0, LINE_WIDTH))

  lines.push(
    plainDivider(),
    amountLine('O/S BEFORE', receipt.osBefore),
    amountLine('PAID AMOUNT', receipt.paidAmount),
    amountLine('O/S AFTER', receipt.osAfter),
    plainDivider(),
    center('Cleared Bills'),
    fixedColumns([
      { value: 'Invoice', width: 18 },
      { value: 'O/S Bef', width: 10, align: 'right' },
      { value: 'Paid', width: 10, align: 'right' },
      { value: 'O/S Aft', width: 10, align: 'right' },
    ]),
    plainDivider('.'),
  )

  if (cleared.length === 0) {
    lines.push(center('No bills cleared'))
  } else {
    for (const bill of cleared) {
      lines.push(...wrapLines(bill.invoiceNo ?? '-', 18))
      lines.push(fixedColumns([
        { value: fmtBillDate(bill.billDate), width: 18 },
        { value: money(bill.osBefore), width: 10, align: 'right' },
        { value: money(bill.paidAmount), width: 10, align: 'right' },
        { value: money(bill.osAfter), width: 10, align: 'right' },
      ]))
    }
  }

  lines.push(
    plainDivider(),
    center('Customer Copy - Thank You'),
  )

  return [
    plainReceiptCommand(lines),
    { type: 'feed', lines: 2 },
    { type: 'cut' },
  ]
}

export async function printAndroidCreditReceiptVoucher(receipt, meta = {}) {
  return printAndroidCommands(buildCreditReceiptVoucherPrintCommands(receipt, meta))
}

function reportDate(d = new Date()) {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '-'
  const day = String(dt.getDate()).padStart(2, '0')
  const mon = dt.toLocaleString('en-GB', { month: 'short' }).toUpperCase()
  return `${day}/${mon}/${dt.getFullYear()}`
}

function reportTime(d = new Date()) {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function reportAmountLine(label, value) {
  return pairLine(label, money(value), 30, 18)
}

function reportCountAmountLine(label, count, amount = 0) {
  return fixedColumns([
    { value: label, width: 27 },
    { value: String(Number(count) || 0), width: 5, align: 'right' },
    { value: money(amount), width: 16, align: 'right' },
  ])
}

export function buildCounterReportPrintCommands(data = {}, meta = {}) {
  const reportType = String(meta.reportType ?? data.reportType ?? 'X').toUpperCase()
  const reportAt = meta.reportAt ? new Date(meta.reportAt) : new Date()

  const cashSales = Number(data.totalCash) || 0
  const creditReceived = Number(data.creditReceiptCash) || 0
  const advanceReceived = 0
  const cashIn = Number(data.cashIn) || 0
  const cashOut = Number(data.cashOut) || 0
  const subTotal = cashSales + creditReceived + advanceReceived
  const refund = Number(data.totalRefund) || 0
  const cashToCollect = Number(data.cashToBeCollected) || 0
  const collectedCash = Number(data.collectedCash) || 0
  const cashDifference = Number(data.cashDifference) || 0
  const creditSales = Number(data.totalCredit) || 0
  const cardSales = Number(data.totalCard) || 0
  const onlineSales = Number(data.totalOnline) || 0
  const receiptCard = Number(data.creditReceiptCard) || 0
  const voucherSales = Number(data.totalVoucher) || 0
  const cashSalesLessRefund = cashSales
  const totalDiscount = Number(data.totalDiscount) || 0
  const itemDiscount = Number(data.itemDiscountTotal) || 0
  const totalSales = Number(data.grossAmount) || 0
  const taxAmount = Number(data.totalTax) || 0
  const netCardAmt = cardSales

  const billCount = Number(data.billCount) || 0
  const cashBillCount = Number(data.cashBillCount) || 0
  const cardBillCount = Number(data.cardBillCount) || 0
  const creditBillCount = Number(data.creditBillCount) || 0
  const multiBillCount = Number(data.multiBillCount) || 0
  const complimentBillCount = Number(data.complimentBillCount) || 0

  const lines = [
    ...companyHeaderLines(meta),
    plainDivider(),
    center(`${reportType} - REPORT`),
    plainDivider(),
    pairLine('DATE', reportDate(reportAt), 18, 30),
    pairLine('TIME', reportTime(reportAt), 18, 30),
    pairLine('COUNTER CLOSE#', meta.closeNo ?? data.closeNo ?? '-', 24, 24),
    pairLine('COUNTER', meta.counterNo ?? data.counterNo ?? '', 18, 30),
    pairLine('BILL COUNT', billCount, 18, 30),
    plainDivider(),
    center('FIRST / LAST BILL'),
    pairLine('FIRST BILL', data.startBillNo ?? '-', 18, 30),
    pairLine('LAST BILL', data.endBillNo ?? '-', 18, 30),
    plainDivider(),
    fixedColumns([
      { value: 'Description', width: 30 },
      { value: 'Amount', width: 18, align: 'right' },
    ]),
    plainDivider('.'),
    reportAmountLine('CASH SALES', cashSales),
    reportAmountLine('CREDIT RECEIVED', creditReceived),
    reportAmountLine('ADVANCE RECEIVED', advanceReceived),
    reportAmountLine('TOTAL CASH IN', cashIn),
    reportAmountLine('TOTAL CASH OUT', cashOut),
    reportAmountLine('TOTAL', subTotal),
    reportAmountLine('REFUND', refund),
    reportAmountLine('CASH TO BE COLLECTED', cashToCollect),
    reportAmountLine('COLLECTED CASH', collectedCash),
    reportAmountLine('CASH DIFFERENCE', cashDifference),
    reportAmountLine('CREDIT SALES', creditSales),
    reportAmountLine('TOTAL CASH TIPS', 0),
    reportAmountLine('TOTAL CREDIT CARD TIPS', 0),
    reportAmountLine('TOTAL CREDIT CARD SALES', cardSales),
    reportAmountLine('NET CARD AMT (SALES+TIPS)', netCardAmt),
    reportAmountLine('ONLINE SALES', onlineSales),
    reportAmountLine('RECEIPT CREDIT CARD', receiptCard),
    reportAmountLine('VOUCHER SALES', voucherSales),
    reportAmountLine('COMPLIMENT SALES', 0),
    reportAmountLine('CASH SALES (LESS REFUND)', cashSalesLessRefund),
    reportAmountLine('TOTAL DISCOUNT AMOUNT', totalDiscount),
    reportAmountLine('ITEM DISCOUNT TOTAL', itemDiscount),
    reportAmountLine('TOTAL SALES', totalSales),
    reportAmountLine('TAX AMOUNT', taxAmount),
    plainDivider(),
    center('BILL CANCEL DETAILS'),
    fixedColumns([
      { value: 'Cancel Type', width: 27 },
      { value: 'Count', width: 5, align: 'right' },
      { value: 'Amount', width: 16, align: 'right' },
    ]),
    plainDivider('.'),
    reportCountAmountLine('BILL CANCELLED', 0, 0),
    reportCountAmountLine('ITEM CANCELLED', 0, 0),
    plainDivider(),
    center('BILL COUNT'),
    pairLine('CASH BILL', cashBillCount, 30, 18),
    pairLine('CREDIT CARD BILL', cardBillCount, 30, 18),
    pairLine('CREDIT BILL', creditBillCount, 30, 18),
    pairLine('MULTI PAYMENT BILL', multiBillCount, 30, 18),
    pairLine('COMPLIMENT BILL', complimentBillCount, 30, 18),
    plainDivider(),
    center('CARD SALES DETAILS'),
    fixedColumns([
      { value: 'Card', width: 27 },
      { value: 'Count', width: 5, align: 'right' },
      { value: 'Amount', width: 16, align: 'right' },
    ]),
    plainDivider('.'),
    reportCountAmountLine('OTHERS', cardBillCount + multiBillCount, cardSales),
    reportAmountLine('TOTAL CREDIT CARD SALES', cardSales),
    plainDivider(),
    center('CARD DETAILS (SPLITPAY / TIP)'),
    center('-'),
    plainDivider(),
    center(`${reportType} Report - End`),
  ]

  return [
    plainReceiptCommand(lines),
    { type: 'feed', lines: 2 },
    { type: 'cut' },
  ]
}

export async function printAndroidCounterReport(data, meta = {}) {
  return printAndroidCommands(buildCounterReportPrintCommands(data, meta))
}

export function buildStaffWiseReportPrintCommands(rows = [], meta = {}) {
  const reportAt = meta.reportAt ? new Date(meta.reportAt) : new Date()
  const list = Array.isArray(rows) ? rows : []
  const totals = list.reduce((acc, row) => ({
    billCount: acc.billCount + (Number(row.billCount) || 0),
    grossAmount: acc.grossAmount + (Number(row.grossAmount) || 0),
    totalDiscount: acc.totalDiscount + (Number(row.totalDiscount) || 0),
    totalRoundOff: acc.totalRoundOff + (Number(row.totalRoundOff) || 0),
    netAmount: acc.netAmount + (Number(row.netAmount) || 0),
    totalCash: acc.totalCash + (Number(row.totalCash) || 0),
    totalCard: acc.totalCard + (Number(row.totalCard) || 0),
    totalCredit: acc.totalCredit + (Number(row.totalCredit) || 0),
  }), {
    billCount: 0,
    grossAmount: 0,
    totalDiscount: 0,
    totalRoundOff: 0,
    netAmount: 0,
    totalCash: 0,
    totalCard: 0,
    totalCredit: 0,
  })

  const lines = [
    ...companyHeaderLines(meta),
    plainDivider(),
    center('STAFF WISE SALES REPORT'),
    plainDivider(),
    pairLine('DATE', `${reportDate(reportAt)} ${reportTime(reportAt)}`, 12, 36),
    pairLine('COUNTER', meta.counterNo ?? '', 18, 30),
    pairLine('TOTAL STAFF', list.length, 18, 30),
    pairLine('TOTAL BILLS', totals.billCount, 18, 30),
    amountLine('GRAND TOTAL', totals.netAmount),
    plainDivider(),
  ]

  if (list.length === 0) {
    lines.push(center('No sales data for current session'))
  } else {
    list.forEach((row, index) => {
      if (index > 0) lines.push(plainDivider('.'))
      lines.push(`${index + 1}. ${clean(row.staffName ?? 'Staff')}`.slice(0, LINE_WIDTH))
      lines.push(pairLine('Bills', Number(row.billCount) || 0, 30, 18))
      lines.push(reportAmountLine('Gross Amt', row.grossAmount))
      lines.push(reportAmountLine('Discount', row.totalDiscount))
      lines.push(reportAmountLine('Round Off', row.totalRoundOff))
      lines.push(reportAmountLine('Net Amount', row.netAmount))
      lines.push(reportAmountLine('Cash', row.totalCash))
      lines.push(reportAmountLine('Card', row.totalCard))
      lines.push(reportAmountLine('Credit', row.totalCredit))
    })
  }

  lines.push(
    plainDivider(),
    center('TOTAL'),
    pairLine('Bills', totals.billCount, 30, 18),
    reportAmountLine('Gross Amt', totals.grossAmount),
    reportAmountLine('Discount', totals.totalDiscount),
    reportAmountLine('Round Off', totals.totalRoundOff),
    reportAmountLine('Net Amount', totals.netAmount),
    reportAmountLine('Cash', totals.totalCash),
    reportAmountLine('Card', totals.totalCard),
    reportAmountLine('Credit', totals.totalCredit),
    plainDivider(),
    center('Staff Wise Report - End'),
  )

  return [
    plainReceiptCommand(lines),
    { type: 'feed', lines: 2 },
    { type: 'cut' },
  ]
}

export async function printAndroidStaffWiseReport(rows = [], meta = {}) {
  return printAndroidCommands(buildStaffWiseReportPrintCommands(rows, meta))
}

export { SunmiPrinter }
