import { fmtMoney } from './currencyFormat'
import { getReceiptPrinterName } from './posPrinter'
import {
  buildReceiptDocumentHtml,
  escReceipt as esc,
  openReceiptPrintWindow,
  resolveReceiptCompanyMeta,
} from './receiptPrintTheme'
import { IS_ANDROID_POS, printAndroidCounterReport } from './androidPosPrinter'

function fmtReportDate(d = new Date()) {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  const day = String(dt.getDate()).padStart(2, '0')
  const mon = dt.toLocaleString('en-GB', { month: 'short' }).toUpperCase()
  return `${day}/${mon}/${dt.getFullYear()}`
}

function fmtReportTime(d = new Date()) {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })
}

function billNoDisplay(n) {
  if (n == null || n === '') return '—'
  return String(n)
}

function amtRow(label, value) {
  return `
  <div class="xr-row">
    <span class="xr-lbl">${esc(label)}</span>
    <span class="xr-val">${fmtMoney(value)}</span>
  </div>`
}

function countRow(label, count, amount = 0) {
  return `
  <tr>
    <td>${esc(label)}</td>
    <td class="c">${count}</td>
    <td class="r">${fmtMoney(amount)}</td>
  </tr>`
}

/**
 * Build thermal X / Z counter report HTML (80mm).
 * @param {object} data — summary + close fields from counter API
 * @param {object} meta — { companyName, branchName, location, counterNo, reportType, closeNo, reportAt }
 */
export function buildCounterReportHtml(data, meta = {}) {
  const co = resolveReceiptCompanyMeta(meta)
  const reportType = String(meta.reportType ?? data.reportType ?? 'X').toUpperCase()
  const reportAt = meta.reportAt ? new Date(meta.reportAt) : new Date()
  const printerNote = getReceiptPrinterName()

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
  const complimentSales = 0
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

  const closeNo = meta.closeNo ?? data.closeNo ?? ''
  const counterNo = meta.counterNo ?? data.counterNo ?? ''

  const financialRows = [
    ['CASH SALES', cashSales],
    ['CREDIT RECEIVED', creditReceived],
    ['ADVANCE RECEIVED', advanceReceived],
    ['TOTAL CASH IN', cashIn],
    ['TOTAL CASH OUT', cashOut],
    ['TOTAL', subTotal],
    ['REFUND', refund],
    ['CASH TO BE COLLECTED', cashToCollect],
    ['COLLECTED CASH', collectedCash],
    ['CASH DIFFERENCE', cashDifference],
    ['CREDIT SALES', creditSales],
    ['TOTAL CASH TIPS', 0],
    ['TOTAL CREDIT CARD TIPS', 0],
    ['TOTAL CREDIT CARD SALES', cardSales],
    ['NET CARD AMT (SALES+TIPS)', netCardAmt],
    ['ONLINE SALES', onlineSales],
    ['RECEIPT CREDIT CARD', receiptCard],
    ['VOUCHER SALES', voucherSales],
    ['COMPLIMENT SALES', complimentSales],
    ['CASH SALES (LESS REFUND)', cashSalesLessRefund],
    ['TOTAL DISCOUNT AMOUNT', totalDiscount],
    ['ITEM DISCOUNT TOTAL', itemDiscount],
    ['TOTAL SALES', totalSales],
    ['TAX AMOUNT', taxAmount],
  ].map(([label, val]) => amtRow(label, val)).join('')

  const bodyHtml = `
  <div class="store-name">${esc(co.name)}</div>
  ${co.branch ? `<div class="meta-line">${esc(co.branch)}</div>` : ''}
  ${co.phone ? `<div class="meta-line">Ph: ${esc(co.phone)}</div>` : ''}
  ${co.address ? `<div class="meta-line">${esc(co.address)}</div>` : ''}
  ${co.trn ? `<div class="meta-line">TRN: ${esc(co.trn)}</div>` : ''}

  <hr class="dash" />
  <div class="xr-title">${reportType} - REPORT</div>
  <hr class="dash" />

  <div class="xr-row">
    <span class="xr-lbl">DATE</span>
    <span class="xr-val">${fmtReportDate(reportAt)}</span>
  </div>
  <div class="xr-row">
    <span class="xr-lbl">TIME</span>
    <span class="xr-val">${fmtReportTime(reportAt)}</span>
  </div>
  <div class="xr-row">
    <span class="xr-lbl">COUNTER CLOSE#</span>
    <span class="xr-val">${esc(closeNo || '—')}</span>
  </div>
  <div class="xr-row">
    <span class="xr-lbl">COUNTER</span>
    <span class="xr-val">${esc(counterNo)}</span>
  </div>
  <div class="xr-row">
    <span class="xr-lbl">BILL COUNT</span>
    <span class="xr-val">${billCount}</span>
  </div>

  <hr class="dash" />
  <div class="xr-section">FIRST / LAST BILL</div>
  <div class="xr-bill-block">
    <div class="xr-row">
      <span class="xr-lbl">FIRST BILL</span>
      <span class="xr-val">${esc(billNoDisplay(data.startBillNo))}</span>
    </div>
    <div class="xr-row">
      <span class="xr-lbl">LAST BILL</span>
      <span class="xr-val">${esc(billNoDisplay(data.endBillNo))}</span>
    </div>
  </div>

  <hr class="dash" />
  <div class="xr-cols-head">
    <span>Description</span>
    <span>Amount</span>
  </div>
  ${financialRows}

  <hr class="dash" />
  <div class="xr-section">BILL CANCEL DETAILS</div>
  <table class="xr-table">
    <thead>
      <tr><th>Cancel Type</th><th class="c">Coun</th><th class="r">Amount</th></tr>
    </thead>
    <tbody>
      ${countRow('BILL CANCELLED', 0, 0)}
      ${countRow('ITEM CANCELLED', 0, 0)}
    </tbody>
  </table>

  <hr class="dash" />
  <div class="xr-section">BILL COUNT</div>
  <div class="xr-row"><span class="xr-lbl">CASH BILL</span><span class="xr-val">${cashBillCount}</span></div>
  <div class="xr-row"><span class="xr-lbl">CREDIT CARD BILL</span><span class="xr-val">${cardBillCount}</span></div>
  <div class="xr-row"><span class="xr-lbl">CREDIT BILL</span><span class="xr-val">${creditBillCount}</span></div>
  <div class="xr-row"><span class="xr-lbl">MULTI PAYMENT BILL</span><span class="xr-val">${multiBillCount}</span></div>
  <div class="xr-row"><span class="xr-lbl">COMPLIMENT BILL</span><span class="xr-val">${complimentBillCount}</span></div>

  <hr class="dash" />
  <div class="xr-section">CARD SALES DETAILS</div>
  <table class="xr-table">
    <thead>
      <tr><th>Card</th><th class="c">Coun</th><th class="r">Amount</th></tr>
    </thead>
    <tbody>
      ${countRow('OTHERS', cardBillCount + multiBillCount, cardSales)}
      <tr class="xr-total">
        <td colspan="2">TOTAL CREDIT CARD SALES</td>
        <td class="r">${fmtMoney(cardSales)}</td>
      </tr>
    </tbody>
  </table>

  <hr class="dash" />
  <div class="xr-section">CARD DETAILS (SPLITPAY / TIP)</div>
  <div class="xr-sub center">—</div>

  <hr class="dash" />
  <div class="footer">${reportType} Report — End</div>
  ${printerNote ? `<div class="printer-note">Printer: ${esc(printerNote)}</div>` : ''}
  `

  return buildReceiptDocumentHtml({
    title: `${reportType} Report`,
    bodyHtml,
    extraCss: `
      .xr-title {
        text-align: center; font-size: 16px; font-weight: 700;
        letter-spacing: 1px; margin: 4px 0;
      }
      .xr-section {
        text-align: center; font-size: 12px; font-weight: 700;
        margin: 6px 0 4px; letter-spacing: 0.4px; text-transform: uppercase;
      }
      .xr-row {
        display: flex; justify-content: space-between; align-items: baseline;
        font-size: 12px; font-weight: 700; margin: 2px 0; gap: 6px;
        flex-wrap: nowrap; white-space: nowrap;
      }
      .xr-lbl { flex: 1 1 auto; min-width: 0; }
      .xr-val { flex: 0 0 auto; text-align: right; white-space: nowrap; }
      .xr-sub { font-size: 11px; font-weight: 700; color: #000; margin: 0 0 4px 0; padding-left: 2px; }
      .xr-sub.center { text-align: center; margin: 4px 0; }
      .xr-bill-block { margin: 2px 0; }
      .xr-cols-head {
        display: flex; justify-content: space-between;
        font-size: 12px; font-weight: 700; margin-bottom: 4px;
        border-bottom: 1px dashed #000; padding-bottom: 3px;
      }
      table.xr-table { width: 100%; border-collapse: collapse; font-size: 11px; font-weight: 700; margin: 4px 0; }
      table.xr-table th, table.xr-table td { padding: 3px 2px; font-weight: 700; }
      table.xr-table th { text-align: left; border-bottom: 1px dashed #000; }
      table.xr-table th.c, table.xr-table td.c { text-align: center; width: 36px; }
      table.xr-table th.r, table.xr-table td.r { text-align: right; white-space: nowrap; }
      table.xr-table tr.xr-total td { font-weight: 700; padding-top: 5px; border-top: 1px dashed #000; }
    `,
  })
}

export async function printCounterReport(data, meta = {}) {
  if (IS_ANDROID_POS) {
    await printAndroidCounterReport(data, meta)
    return
  }
  openReceiptPrintWindow(buildCounterReportHtml(data, meta), { width: 420, height: 920 })
}
