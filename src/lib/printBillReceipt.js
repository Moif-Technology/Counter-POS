import { api } from './api'
import { fmtMoney } from './currencyFormat'
import { fmtQty } from './utils'
import { PM, isMultiPaymentMode, normalizePaymentMode } from './paymentModes'
import { getReceiptPrinterName } from './posPrinter'
import {
  buildReceiptDocumentHtml,
  escReceipt as esc,
  fmtReceiptDateTime,
  openReceiptPrintWindow,
  parseBillSalesId,
  buildReceiptDiscountAdjustmentHtml,
  buildReceiptBarcodeBlockHtml,
  buildReceiptItemDescHtml,
  buildReceiptItemsTableHeadHtml,
  buildReceiptTotalLineHtml,
  buildReceiptSettlementLineHtml,
  buildReceiptBillSummaryHtml,
  buildReceiptItemsQtySummaryHtml,
  buildReceiptTaxDetailsHtml,
  buildReceiptBiLabel,
  RECEIPT_LABELS,
  RECEIPT_BARCODE_EXTRA_CSS,
} from './receiptPrintTheme'
import { buildCode39Svg } from './barcodeSvg'
import { formatDocBarcode } from './documentScan'

export { parseBillSalesId } from './receiptPrintTheme'

function isWalkInCustomer(bill) {
  const c = bill?.customer
  if (!c?.customerId) return true
  const name = String(c.customerName ?? '').trim().toLowerCase()
  return !name || name === 'walk-in' || name === 'walkin' || name === 'walk in'
}

function resolveCompanyHeader(bill, meta) {
  const co = bill.company ?? {}
  return {
    name: co.companyName ?? meta.companyName ?? 'MOIF TECHNOLOGY',
    address: co.companyAddress ?? meta.address ?? '',
    phone: co.companyPhone ?? meta.phone ?? '',
    branch: co.branchName ?? meta.branchName ?? '',
    trn: co.taxRegistrationNo ?? meta.trn ?? '',
  }
}

function lineUnitDisplay(it) {
  const qty = Math.abs(Number(it.qty) || 1)
  const total = Number(it.lineTotal) || 0
  if (qty > 0 && total) return fmtMoney(total / qty)
  return fmtMoney(it.unitPrice)
}

/**
 * Build thermal tax invoice HTML (retail receipt layout).
 * @param {object} bill — from GET /counter-pos/sales/viewer/:salesId
 */
export function buildBillReceiptHtml(bill, meta = {}) {
  const co = resolveCompanyHeader(bill, meta)
  const isReturn = String(bill.transactionType ?? '').toUpperCase() === 'RETURN'
  const invoiceTitle = isReturn ? 'Return Invoice' : 'Tax Invoice'
  const invoiceTitleAr = isReturn ? 'فاتورة مرتجع' : 'فاتورة ضريبية'
  const printerNote = getReceiptPrinterName()

  const billNoLabel = String(bill.billNo ?? bill.salesId ?? '')
  const barcodeText = formatDocBarcode(billNoLabel)
  const barcodeSvg = barcodeText ? buildCode39Svg(barcodeText, { height: 64, printWidthMm: 68 }) : ''

  const items = bill.items ?? []
  const itemCount = items.length
  const qtyTotal = items.reduce((s, it) => s + Math.abs(Number(it.qty) || 0), 0)

  const payMode = normalizePaymentMode(bill.paymentMode)
  const settlement = isMultiPaymentMode(bill.paymentMode) ? 'MULTIPAYMENT' : payMode

  const taxableAmt = Number(bill.taxableAmt) || 0
  const taxAmt = Number(bill.taxAmt) || 0
  const billAmount = Number(bill.amount) || 0
  const paidAmount = Number(bill.paidAmount ?? bill.amount) || 0
  const balAmount = Number(bill.balanceAmount) || 0
  const discountAmt = Number(bill.discountAmt) || 0
  const roundOff = bill.roundOff != null ? Number(bill.roundOff) : 0

  const itemRows = items.map((it, idx) => {
    const vatPer = Number(it.vatPer) || Number(bill.taxRate) || 5
    const vatAmt = Number(it.vatAmt) || 0
    const code = it.productCode || (it.productId ? String(it.productId) : '')
    const isLast = idx === items.length - 1
    return `
      <tr class="item-main">
        <td class="desc">${buildReceiptItemDescHtml(it, esc)}</td>
        <td class="c">${fmtQty(it.qty)}</td>
        <td class="r">${lineUnitDisplay(it)}</td>
        <td class="r b">${fmtMoney(it.lineTotal)}</td>
      </tr>
      <tr class="item-sub${isLast ? ' item-sub-last' : ''}">
        <td colspan="2" class="sub">${esc(code)}</td>
        <td colspan="2" class="r sub">VAT@${vatPer}% (${fmtMoney(vatAmt)})</td>
      </tr>
    `
  }).join('')

  let customerBlock = ''
  if (!isWalkInCustomer(bill)) {
    const c = bill.customer
    const phone = [c.mobileNo, c.telephone].filter(Boolean).join(' / ')
    customerBlock = `
      <div class="dash"></div>
      <div class="row"><span class="lbl">Customer</span><span class="val">${esc(c.customerName)}</span></div>
      ${c.customerCode ? `<div class="row"><span class="lbl">Code</span><span class="val">${esc(c.customerCode)}</span></div>` : ''}
      ${c.taxRegNo ? `<div class="row"><span class="lbl">TRN</span><span class="val">${esc(c.taxRegNo)}</span></div>` : ''}
      ${phone ? `<div class="row"><span class="lbl">Tel</span><span class="val">${esc(phone)}</span></div>` : ''}
      ${c.address ? `<div class="row addr"><span class="lbl">Address</span><span class="val">${esc(c.address)}</span></div>` : ''}
    `
  }

  let creditBlock = ''
  if (payMode === PM.CREDIT && bill.customer?.customerId) {
    const os = Number(bill.customerOsBalance) || Number(bill.outstandingBalance) || 0
    creditBlock = `
      <div class="pair-row">
        <span></span>
        <span class="pair">${buildReceiptBiLabel(RECEIPT_LABELS.osBalance, ` : ${fmtMoney(os)}`)}</span>
      </div>
    `
  }

  let splitBlock = ''
  if (isMultiPaymentMode(bill.paymentMode) && (bill.paymentSplits ?? []).length) {
    splitBlock = (bill.paymentSplits).map(s => `
      <div class="pair-row small">
        <span class="lbl">${esc(s.payMode)}</span>
        <span class="val">${fmtMoney(s.amount)}</span>
      </div>
    `).join('')
  }

  const phoneLine = co.phone
    ? `<div class="meta-line">Ph: ${esc(co.phone)}</div>`
    : ''

  const bodyHtml = `
  <div class="store-name">${esc(co.name)}</div>
  ${co.branch ? `<div class="meta-line">${esc(co.branch)}</div>` : ''}
  ${phoneLine}
  ${co.address ? `<div class="meta-line">${esc(co.address)}</div>` : ''}
  ${co.trn ? `<div class="meta-line">TRN: ${esc(co.trn)}</div>` : ''}

  <hr class="dash" />
  <div class="title-row">
    <span>${invoiceTitle}</span>
    <span class="title-ar">${invoiceTitleAr}</span>
  </div>
  <hr class="dash" />

  <div class="row">
    <span class="row-left"><span class="lbl">BILL #</span> : ${esc(billNoLabel)}</span>
    <span class="row-right">${fmtReceiptDateTime(bill.billTime ?? bill.billDate)}</span>
  </div>
  <div class="row">
    <span class="row-left"><span class="lbl">COUNTER</span> : ${esc(bill.counterNo)}</span>
    <span class="row-right"><span class="lbl">CASHIER</span> : ${esc(bill.staffName ?? 'CASHIER')}</span>
  </div>
  ${customerBlock}
  ${bill.remarks?.trim() ? `<div class="row"><span class="lbl">Comments</span><span class="val">${esc(bill.remarks.trim())}</span></div>` : ''}

  <hr class="dash" />
  <table class="items">
    <thead>
      ${buildReceiptItemsTableHeadHtml({ withPrice: true })}
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="4" class="center">No items</td></tr>'}
    </tbody>
  </table>

  <hr class="dash" />
  ${buildReceiptDiscountAdjustmentHtml({ taxableAmt, discountAmt, roundOff, fmtMoney })}
  ${buildReceiptTotalLineHtml(billAmount, fmtMoney)}
  ${buildReceiptSettlementLineHtml(settlement, esc)}
  ${splitBlock}
  ${buildReceiptBillSummaryHtml({ itemCount, qtyTotal, billAmount, paidAmount, balAmount, fmtMoney, fmtQty })}
  ${creditBlock}

  <hr class="dash" />
  ${buildReceiptTaxDetailsHtml(taxableAmt, taxAmt, billAmount, fmtMoney)}

  <hr class="dash" />
  ${buildReceiptBarcodeBlockHtml({
    label: 'Scan for reprint',
    barcodeText,
    barcodeSvg,
    displayText: billNoLabel,
    esc,
  })}

  <hr class="dash" />
  <div class="footer">Thank You......Visit Again</div>
  ${printerNote ? `<div class="printer-note">Printer: ${esc(printerNote)}</div>` : ''}
  `

  return buildReceiptDocumentHtml({
    title: barcodeText || billNoLabel || 'Receipt',
    bodyHtml,
    extraCss: RECEIPT_BARCODE_EXTRA_CSS,
  })
}

export function printBillFromData(bill, meta = {}) {
  if (!bill) throw new Error('No bill data to print')
  openReceiptPrintWindow(buildBillReceiptHtml(bill, meta))
}

export async function printBillReceipt(salesId, accessToken, meta = {}) {
  const bill = await api.counterPos.salesViewerBill(salesId, accessToken)
  printBillFromData(bill, meta)
  return bill
}

export async function printBillReceipts(salesIds, accessToken, meta = {}) {
  const ids = (salesIds ?? []).filter(id => id != null && Number(id) > 0)
  for (const id of ids) {
    await printBillReceipt(id, accessToken, meta)
    if (ids.length > 1) {
      await new Promise(r => setTimeout(r, 600))
    }
  }
}

/** Bill reprint by bill number (66, B-66, etc.) — uses same receipt theme */
export async function printBillReprintByNo(billNoInput, accessToken, meta = {}) {
  const salesId = parseBillSalesId(billNoInput)
  if (!salesId) throw new Error('Enter a valid bill number')
  return printBillReceipt(salesId, accessToken, meta)
}
