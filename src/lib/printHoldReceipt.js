import { fmtMoney } from './currencyFormat'
import { fmtQty } from './utils'
import { api } from './api'
import { getReceiptPrinterName } from './posPrinter'
import {
  buildReceiptDocumentHtml,
  escReceipt as esc,
  fmtReceiptDateTime,
  openReceiptPrintWindow,
  wrapReceiptBodyCopies,
  resolveCashierName,
  resolveReceiptCompanyMeta,
  buildReceiptBarcodeBlockHtml,
  RECEIPT_BARCODE_EXTRA_CSS,
} from './receiptPrintTheme'
import { buildHoldBarcodeSvg, formatHoldBarcode } from './holdBarcode'
import { IS_ANDROID_POS, printAndroidHold } from './androidPosPrinter'

function resolveCompanyHeader(meta) {
  return resolveReceiptCompanyMeta(meta)
}

/**
 * Build thermal hold slip HTML (80mm, shared receipt theme).
 * @param {object} hold
 * @param {number} hold.holdNo
 * @param {Date|string} [hold.billDate]
 * @param {string} [hold.counterNo]
 * @param {string} [hold.cashierName]
 * @param {string} [hold.customerName]
 * @param {string} [hold.customerCode]
 * @param {string} [hold.remarks]
 * @param {boolean} [hold.isReturn]
 * @param {number} [hold.netAmount]
 * @param {Array} [hold.items]
 */
export function buildHoldReceiptHtml(hold, meta = {}, copies = 1) {
  const co = resolveCompanyHeader(meta)
  const isReturn = !!hold.isReturn
  const title = isReturn ? 'Held Return' : 'Held Bill'
  const titleAr = isReturn ? 'مرتجع معلق' : 'فاتورة معلقة'
  const holdLabel = String(hold.holdNo ?? '')
  const barcodeText = formatHoldBarcode(hold.holdNo)
  const barcodeSvg = buildHoldBarcodeSvg(hold.holdNo)
  const printerNote = getReceiptPrinterName()

  const items = hold.items ?? []
  const itemCount = items.length
  const qtyTotal = items.reduce((s, it) => s + Math.abs(Number(it.qty) || 0), 0)
  const netAmount = Number(hold.netAmount) || 0

  const itemRows = items.map((it, idx) => {
    const isLast = idx === items.length - 1
    const code = it.productCode ?? it.barcode ?? ''
    return `
      <tr class="item-main">
        <td class="desc">${esc(it.description || 'Item')}</td>
        <td class="c">${fmtQty(it.qty)}</td>
        <td class="r b">${fmtMoney(it.lineTotal)}</td>
      </tr>
      ${code ? `<tr class="item-sub${isLast ? ' item-sub-last' : ''}"><td colspan="3" class="sub">${esc(code)}</td></tr>` : ''}
    `
  }).join('')

  const customerName = String(hold.customerName ?? '').trim()
  const isWalkIn = !customerName || /^(walk-?in)$/i.test(customerName)

  const bodyHtml = `
  <div class="store-name">${esc(co.name)}</div>
  ${co.branch ? `<div class="meta-line">${esc(co.branch)}</div>` : ''}
  ${co.phone ? `<div class="meta-line">Ph: ${esc(co.phone)}</div>` : ''}
  ${co.address ? `<div class="meta-line">${esc(co.address)}</div>` : ''}

  <hr class="dash" />
  <div class="title-row">
    <span>${title}</span>
    <span class="title-ar">${titleAr}</span>
  </div>
  <hr class="dash" />

  <div class="row">
    <span class="row-left"><span class="lbl">HOLD #</span> : ${esc(holdLabel)}</span>
    <span class="row-right">${fmtReceiptDateTime(hold.billDate ?? new Date())}</span>
  </div>
  <div class="row">
    <span class="row-left"><span class="lbl">COUNTER</span> : ${esc(hold.counterNo ?? '')}</span>
    <span class="row-right"><span class="lbl">CASHIER</span> : ${esc(hold.cashierName ?? 'CASHIER')}</span>
  </div>
  ${!isWalkIn ? `
    <div class="row"><span class="lbl">Customer</span><span class="val">${esc(customerName)}</span></div>
    ${hold.customerCode ? `<div class="row"><span class="lbl">Code</span><span class="val">${esc(hold.customerCode)}</span></div>` : ''}
  ` : ''}
  ${hold.remarks?.trim() ? `<div class="row"><span class="lbl">Comments</span><span class="val">${esc(hold.remarks.trim())}</span></div>` : ''}

  <hr class="dash" />
  <table class="items hold-items">
    <thead>
      <tr>
        <th>Description</th>
        <th class="c">Qty</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="3" class="center">No items</td></tr>'}
    </tbody>
  </table>

  <hr class="dash" />
  <div class="total-line">
    <span>TOTAL :</span>
    <span>${fmtMoney(netAmount)}</span>
  </div>
  <div class="pair-row">
    <span><span class="lbl">ITEMS</span> : ${itemCount}</span>
    <span class="pair"><span class="lbl">QTY</span><span class="val">: ${fmtQty(qtyTotal)}</span></span>
  </div>

  <hr class="dash" />
  ${buildReceiptBarcodeBlockHtml({
    label: 'Scan to recall',
    barcodeText,
    barcodeSvg,
    displayText: holdLabel,
    esc,
  })}

  <hr class="dash" />
  <div class="footer">Present this slip at billing</div>
  ${printerNote ? `<div class="printer-note">Printer: ${esc(printerNote)}</div>` : ''}
  `

  const { bodyHtml: printBody, extraCss: copyCss } = wrapReceiptBodyCopies(bodyHtml, copies)

  return buildReceiptDocumentHtml({
    title: holdLabel,
    bodyHtml: printBody,
    extraCss: `
      table.hold-items th:nth-child(2), table.hold-items td.c { width: 36px; }
      table.hold-items th:nth-child(3), table.hold-items td.r { width: 22mm; }
      ${RECEIPT_BARCODE_EXTRA_CSS}
      ${copyCss}
    `,
  })
}

/** @param {object} hold — see buildHoldReceiptHtml */
export async function printHoldReceipt(hold, meta = {}, copies = 1) {
  if (!hold?.holdNo) throw new Error('No hold number to print')
  const count = Math.max(1, Math.min(20, Math.floor(Number(copies) || 1)))
  const html = buildHoldReceiptHtml(hold, meta, count)
  if (IS_ANDROID_POS) {
    await printAndroidHold(hold, meta, count)
    return
  }
  openReceiptPrintWindow(html)
}

export async function printHoldReprintByNo(holdNo, accessToken, meta = {}) {
  const n = Number(holdNo)
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a valid hold number')
  const holds = await api.counterPos.getHeldBills(accessToken)
  const list = Array.isArray(holds) ? holds : []
  const hold = list.find(h => String(h.hold_no) === String(n))
  if (!hold) throw new Error(`Hold ${n} not found`)
  const items = await api.counterPos.recallBill(hold.sales_id, accessToken)
  const holdPrint = {
    holdNo: hold.hold_no,
    salesId: hold.sales_id,
    billDate: hold.bill_date ?? new Date(),
    counterNo: hold.counter_no,
    cashierName: hold.staff_name ?? '',
    customerName: hold.customer_name ?? '',
    customerCode: hold.customer_code ?? '',
    remarks: hold.remarks ?? null,
    isReturn: false,
    netAmount: Number(hold.amount ?? 0),
    items: (Array.isArray(items) ? items : []).map(it => ({
      description: it.short_description,
      qty: it.qty,
      lineTotal: it.line_total,
      productCode: it.product_code,
    })),
  }
  await printHoldReceipt(holdPrint, meta)
  return holdPrint
}

/** Build hold print payload from current POS state (call before clear). */
export function holdDataFromPosState(state, result) {
  const items = (state.cartItems ?? []).map(it => ({
    description: it.description,
    qty: it.qty,
    lineTotal: it.lineTotal,
    productCode: it.productCode ?? it.barcode,
  }))
  return {
    holdNo: result.holdNo,
    salesId: result.salesId,
    billDate: new Date(),
    counterNo: state.counterNo,
    cashierName: resolveCashierName(state.cashier),
    customerName: state.customerName,
    customerCode: state.customerCode,
    remarks: state.billComment?.trim() || null,
    isReturn: result.isReturn,
    netAmount: state.netAmount,
    items,
  }
}
