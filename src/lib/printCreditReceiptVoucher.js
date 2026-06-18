import { fmtMoney } from './currencyFormat'
import { getReceiptPrinterName } from './posPrinter'
import { normalizePaymentMode } from './paymentModes'
import {
  buildReceiptDocumentHtml,
  escReceipt as esc,
  fmtReceiptDateTime,
  openReceiptPrintWindow,
} from './receiptPrintTheme'

function resolveCompanyHeader(meta) {
  return {
    name: meta.companyName ?? meta.shopName ?? 'MOIF TECHNOLOGY',
    branch: meta.branchName ?? '',
    phone: meta.phone ?? '',
    address: meta.address ?? '',
    trn: meta.trn ?? '',
  }
}

function fmtBillDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/')
}

function voucherLabel(voucher) {
  if (!voucher) return null
  const prefix = String(voucher.voucherPrefix ?? 'RCV').trim()
  const no = voucher.autoVoucherNo ?? voucher.manualVoucherNo
  if (no == null || no === '') return prefix || null
  return `${prefix}${no}`
}

/**
 * Map save-settlement API response to receipt print shape.
 */
export function receiptFromSettlementResult(result) {
  if (!result) return null
  return {
    receiptNo: result.receiptNo ?? (result.transactionNo != null ? `RCV-${result.transactionNo}` : '—'),
    transactionDate: new Date(),
    customerCode: result.customerCode,
    customerName: result.customerName,
    paidAmount: result.amount,
    paymentMode: result.paymentMode,
    osBefore: result.osBefore,
    osAfter: result.remainingOs ?? result.osAfter,
    counterNo: result.counterNo,
    clearedBills: (result.billsCleared ?? []).map((b, i) => ({
      transactionChildId: b.billId ?? i,
      invoiceNo: b.invoiceNo,
      billDate: b.billDate,
      invoiceAmount: b.invoiceAmount,
      osBefore: b.osBefore,
      paidAmount: b.paidAmount,
      osAfter: b.osAfter,
    })),
    voucher: null,
  }
}

/**
 * Build thermal credit receipt voucher HTML (80mm, shared receipt theme).
 * @param {object} receipt — settlement receipt (save result or GET /settlement/receipts/:id)
 * @param {object} meta — { companyName, branchName, cashierName, counterNo }
 */
export function buildCreditReceiptVoucherHtml(receipt, meta = {}) {
  const co = resolveCompanyHeader(meta)
  const printerNote = getReceiptPrinterName()
  const payMode = normalizePaymentMode(receipt.paymentMode)
  const cleared = receipt.clearedBills ?? []
  const voucherNo = voucherLabel(receipt.voucher)

  const billRows = cleared.map(b => `
    <tr>
      <td>
        <div>${esc(b.invoiceNo ?? '—')}</div>
        <div class="sub">${fmtBillDate(b.billDate)}</div>
      </td>
      <td class="r">${fmtMoney(b.osBefore)}</td>
      <td class="r">${fmtMoney(b.paidAmount)}</td>
      <td class="r">${fmtMoney(b.osAfter)}</td>
    </tr>
  `).join('')

  const bodyHtml = `
  <div class="store-name">${esc(co.name)}</div>
  ${co.branch ? `<div class="meta-line">${esc(co.branch)}</div>` : ''}
  ${co.phone ? `<div class="meta-line">Ph: ${esc(co.phone)}</div>` : ''}
  ${co.address ? `<div class="meta-line">${esc(co.address)}</div>` : ''}
  ${co.trn ? `<div class="meta-line">TRN: ${esc(co.trn)}</div>` : ''}

  <hr class="dash" />
  <div class="title-row">
    <span>Receipt Voucher</span>
    <span class="title-ar">سند قبض</span>
  </div>
  <hr class="dash" />

  <div class="row">
    <span class="row-left"><span class="lbl">RECEIPT #</span> : ${esc(receipt.receiptNo ?? '—')}</span>
  </div>
  <div class="row">
    <span class="row-left"><span class="lbl">DATE</span> : ${fmtReceiptDateTime(receipt.transactionDate)}</span>
  </div>
  <div class="row">
    <span class="row-left"><span class="lbl">COUNTER</span> : ${esc(meta.counterNo ?? receipt.counterNo ?? '')}</span>
    <span class="row-right"><span class="lbl">CASHIER</span> : ${esc(meta.cashierName ?? 'CASHIER')}</span>
  </div>
  ${voucherNo ? `<div class="row"><span class="lbl">VOUCHER</span><span class="val">${esc(voucherNo)}</span></div>` : ''}

  <hr class="dash" />
  <div class="section-head">Customer</div>
  <div class="row"><span class="lbl">Name</span><span class="val">${esc(receipt.customerName)}</span></div>
  ${receipt.customerCode ? `<div class="row"><span class="lbl">Code</span><span class="val">${esc(receipt.customerCode)}</span></div>` : ''}
  <div class="row"><span class="lbl">Payment</span><span class="val">${esc(payMode)}</span></div>

  <hr class="dash" />
  <div class="pair-row">
    <span><span class="lbl">O/S BEFORE</span> : ${fmtMoney(receipt.osBefore)}</span>
  </div>
  <div class="total-line">
    <span>PAID AMOUNT :</span>
    <span>${fmtMoney(receipt.paidAmount)}</span>
  </div>
  <div class="pair-row">
    <span><span class="lbl">O/S AFTER</span> : ${fmtMoney(receipt.osAfter)}</span>
  </div>

  <hr class="dash" />
  <div class="tax-head">Cleared Bills</div>
  <table class="tax bills">
    <thead>
      <tr>
        <th>Invoice</th>
        <th>O/S Bef</th>
        <th>Paid</th>
        <th>O/S Aft</th>
      </tr>
    </thead>
    <tbody>
      ${billRows || '<tr><td colspan="4" class="center">No bills cleared</td></tr>'}
    </tbody>
  </table>

  <hr class="dash" />
  <div class="footer">Customer Copy — Thank You</div>
  ${printerNote ? `<div class="printer-note">Printer: ${esc(printerNote)}</div>` : ''}
  `

  return buildReceiptDocumentHtml({
    title: receipt.receiptNo ?? 'Receipt Voucher',
    bodyHtml,
    extraCss: `
      .section-head { text-align: center; font-weight: 700; font-size: 13px; margin: 4px 0 6px; }
      table.bills td .sub { font-size: 11px; font-weight: 700; margin-top: 2px; }
      table.bills th, table.bills td { font-size: 11px; padding: 3px 2px; }
    `,
  })
}

export function printCreditReceiptVoucher(receipt, meta = {}) {
  if (!receipt) return
  openReceiptPrintWindow(buildCreditReceiptVoucherHtml(receipt, meta))
}
