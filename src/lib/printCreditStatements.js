import { fmtMoney } from './currencyFormat'
import { normalizePaymentMode } from './paymentModes'
import {
  buildReceiptDocumentHtml,
  escReceipt as esc,
  fmtReceiptDateTime,
  openReceiptPrintWindow,
} from './receiptPrintTheme'

/*
 * Small slips printed from the Receipt Voucher screen:
 * Outstanding Bills, OS Balance and Receipt Summary (date range).
 */
function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '/')
}

function header(title, meta) {
  return `
  <div class="store-name">${esc(meta.companyName ?? meta.shopName ?? 'MOIF TECHNOLOGY')}</div>
  <hr class="dash" />
  <div class="title-row"><span>${esc(title)}</span></div>
  <hr class="dash" />
  <div class="row"><span class="row-left"><span class="lbl">DATE</span> : ${fmtReceiptDateTime(new Date())}</span></div>
  <div class="row">
    <span class="row-left"><span class="lbl">COUNTER</span> : ${esc(meta.counterNo ?? '')}</span>
    <span class="row-right"><span class="lbl">CASHIER</span> : ${esc(meta.cashierName ?? 'CASHIER')}</span>
  </div>`
}

function customerRows(customer) {
  return `
  <hr class="dash" />
  <div class="row"><span class="lbl">Customer</span><span class="val">${esc(customer?.customerName ?? '—')}</span></div>
  ${customer?.customerCode ? `<div class="row"><span class="lbl">Code</span><span class="val">${esc(customer.customerCode)}</span></div>` : ''}`
}

const CSS = `
  table.list th, table.list td { font-size: 11px; padding: 3px 2px; }
  table.list td .sub { font-size: 10px; margin-top: 1px; }
`

function print(title, bodyHtml) {
  openReceiptPrintWindow(buildReceiptDocumentHtml({ title, bodyHtml, extraCss: CSS }))
}

export function printOutstandingBills(customer, billData, meta = {}) {
  const bills = billData?.bills ?? []
  const total = billData?.billsTotal ?? billData?.osAmount ?? customer?.osAmount ?? 0
  const rows = bills.map(b => `
    <tr>
      <td><div>${esc(b.invoiceNo ?? '—')}</div><div class="sub">${fmtDate(b.billDate)}</div></td>
      <td class="r">${fmtMoney(b.currentAmount)}</td>
    </tr>`).join('')
  print('Outstanding Bills', `
  ${header('Outstanding Bills', meta)}
  ${customerRows(customer)}
  <hr class="dash" />
  <table class="tax list">
    <thead><tr><th>Invoice</th><th>Amount</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="2" class="center">No open bills</td></tr>'}</tbody>
  </table>
  <hr class="dash" />
  <div class="total-line"><span>TOTAL O/S :</span><span>${fmtMoney(total)}</span></div>`)
}

export function printOsBalance(customer, osAmount, meta = {}) {
  print('OS Balance', `
  ${header('OS Balance', meta)}
  ${customerRows(customer)}
  <hr class="dash" />
  <div class="total-line"><span>O/S BALANCE :</span><span>${fmtMoney(osAmount)}</span></div>
  <hr class="dash" />`)
}

export function printReceiptSummary(receipts, { dateFrom, dateTo }, meta = {}) {
  const list = receipts ?? []
  const total = list.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0)
  const byMode = {}
  for (const r of list) {
    const m = normalizePaymentMode(r.paymentMode) || '—'
    byMode[m] = (byMode[m] ?? 0) + (Number(r.paidAmount) || 0)
  }
  const rows = list.map(r => `
    <tr>
      <td><div>${esc(r.receiptNo ?? '—')}</div><div class="sub">${esc(r.customerName ?? '')}</div></td>
      <td>${fmtDate(r.transactionDate)}</td>
      <td class="r">${fmtMoney(r.paidAmount)}</td>
    </tr>`).join('')
  print('Receipt Summary', `
  ${header('Receipt Summary', meta)}
  <div class="row"><span class="lbl">From</span><span class="val">${fmtDate(dateFrom)}</span></div>
  <div class="row"><span class="lbl">To</span><span class="val">${fmtDate(dateTo)}</span></div>
  <hr class="dash" />
  <table class="tax list">
    <thead><tr><th>Receipt</th><th>Date</th><th>Paid</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3" class="center">No receipts</td></tr>'}</tbody>
  </table>
  <hr class="dash" />
  ${Object.entries(byMode).map(([m, v]) => `<div class="row"><span class="lbl">${esc(m)}</span><span class="val">${fmtMoney(v)}</span></div>`).join('')}
  <div class="total-line"><span>TOTAL (${list.length}) :</span><span>${fmtMoney(total)}</span></div>`)
}
