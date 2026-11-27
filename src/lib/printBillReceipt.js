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
  RECEIPT_BARCODE_EXTRA_CSS,
  RECEIPT_PAD_LEFT,
  RECEIPT_PAD_RIGHT,
} from './receiptPrintTheme'
import { getReceiptSettings, billField, billLineOn } from './posSettings'
import { renderBlocks, fillBlocks } from './receiptBlocks'
import { buildCode39Svg } from './barcodeSvg'
import { formatDocBarcode } from './documentScan'
import { IS_ANDROID_POS, printAndroidBill } from './androidPosPrinter'

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

/** Control Panel logo / footer image — same size caps as the Android path (48×28 mm, 72×40 mm). */
const RECEIPT_IMAGE_CSS = `
  .receipt-img { margin: 0 0 4px; }
  .receipt-block-img { display: block; width: 100%; height: auto; }
`

/**
 * Field / dotted-line layout (Control Panel). Lines switched off keep their spacing.
 * A lone right-hand value stays on the right when the left one is hidden.
 */
const LAYOUT_CSS = `
  .pair-row > .pair { margin-left: auto; }
  hr.dash[data-off] { border-top-color: transparent; }
  table.items[data-nohead] th, table.items[data-norows] .item-sub td, table.tax[data-nohead] thead tr { border-bottom-color: transparent; }
`

/** Control Panel preview: everything clickable, hidden fields / lines shown faint so they can be turned back on. */
const EDITOR_CSS = `
  body { padding: 3mm ${RECEIPT_PAD_RIGHT} 6mm ${RECEIPT_PAD_LEFT}; }
  [data-f], [data-d], [data-go] { cursor: pointer; }
  [data-go]:hover { outline: 2px dashed #3b82f6; outline-offset: 1px; }
  [data-f]:hover { background-color: #e0ecff; }
  [data-f][data-sel] { background-color: #bfd8ff !important; }
  [data-f][data-off] { opacity: .25; }
  hr.dash { border: none; height: 14px; margin: 0; background: linear-gradient(90deg, #000 60%, transparent 0) center / 10px 2px repeat-x; }
  hr.dash[data-off] { background-image: linear-gradient(90deg, #bbb 60%, transparent 0); }
  hr.dash:hover { background-color: #e0ecff; }
  hr.dash[data-sel] { background-color: #bfd8ff; }
  table.items[data-nohead] th, table.items[data-norows] .item-sub td, table.tax[data-nohead] thead tr { border-bottom-color: #ccc; }
`

function lineUnitDisplay(it) {
  const qty = Math.abs(Number(it.qty) || 1)
  const total = Number(it.lineTotal) || 0
  if (qty > 0 && total) return fmtMoney(total / qty)
  return fmtMoney(it.unitPrice)
}

/**
 * Control Panel header / footer, drawn as printer-width images. '' = not set or not drawable →
 * the bill falls back to the text header / footer, so a bad line or image never stops a print.
 * {counter} / {branch} tags take the bill's own counter and branch, so a reprint matches its COUNTER line.
 */
export async function renderReceiptImages(bill = {}, meta = {}) {
  const rs = getReceiptSettings()
  const values = { counter: bill.counterNo ?? meta.counterNo, branch: resolveCompanyHeader(bill, meta).branch }
  const [header, footer] = await Promise.all([
    renderBlocks(fillBlocks(rs.headerBlocks, values), { bigFirstLine: true }).catch(() => ''),
    renderBlocks(fillBlocks(rs.footerBlocks, values)).catch(() => ''),
  ])
  return { header, footer }
}

/**
 * Build thermal tax invoice HTML (retail receipt layout).
 * Layout comes from POS receipt parameters (posSettings); images from renderReceiptImages
 * (omit for the text header / footer).
 * opts (Control Panel preview only): settings = unsaved parsed settings, editor = clickable
 * preview without the print script, selected = highlighted field / line key.
 * @param {object} bill — from GET /counter-pos/sales/viewer/:salesId
 */
export function buildBillReceiptHtml(bill, meta = {}, images = {}, opts = {}) {
  const rs = opts.settings ?? getReceiptSettings()
  const editor = !!opts.editor
  const co = resolveCompanyHeader(bill, meta)
  const isReturn = String(bill.transactionType ?? '').toUpperCase() === 'RETURN'
  const invoiceTitle = isReturn ? 'Return Invoice' : 'Tax Invoice'
  const invoiceTitleAr = isReturn ? 'فاتورة مرتجع' : 'فاتورة ضريبية'
  const printerNote = getReceiptPrinterName() || (editor ? 'Receipt printer' : '')

  // Hidden fields are left out of a print; the preview keeps them, faint, so they can be clicked back on.
  const hidden = k => billField(rs, k).hidden
  const show = k => editor || !hidden(k)
  const sel = k => (opts.selected === k ? ' data-sel' : '')
  const at = k => ` data-f="${k}"${hidden(k) ? ' data-off' : ''}${sel(k)}`
  const hr = k => `<hr class="dash" data-d="${k}"${billLineOn(rs, k) ? '' : ' data-off'}${sel(k)} />`

  const billNoLabel = String(bill.billNo ?? bill.salesId ?? '')
  const barcodeText = formatDocBarcode(billNoLabel, isReturn ? 'R' : 'B')
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
      ${show('items') ? `<tr class="item-main"${at('items')}>
        <td class="desc">${esc(it.description || 'Item')}</td>
        <td class="c">${fmtQty(it.qty)}</td>
        <td class="r">${lineUnitDisplay(it)}</td>
        <td class="r b">${fmtMoney(it.lineTotal)}</td>
      </tr>` : ''}
      ${show('itemSub') ? `<tr class="item-sub${isLast ? ' item-sub-last' : ''}"${at('itemSub')}>
        <td colspan="2" class="sub">${esc(code)}</td>
        <td colspan="2" class="r sub">VAT@${vatPer}% (${fmtMoney(vatAmt)})</td>
      </tr>` : ''}
    `
  }).join('')

  let customerBlock = ''
  if (!isWalkInCustomer(bill) && show('customer')) {
    const c = bill.customer
    const phone = [c.mobileNo, c.telephone].filter(Boolean).join(' / ')
    customerBlock = `
      ${hr('lineCustomer')}
      <div${at('customer')}>
      <div class="row"><span class="lbl">Customer</span><span class="val">${esc(c.customerName)}</span></div>
      ${c.customerCode ? `<div class="row"><span class="lbl">Code</span><span class="val">${esc(c.customerCode)}</span></div>` : ''}
      ${c.taxRegNo ? `<div class="row"><span class="lbl">TRN</span><span class="val">${esc(c.taxRegNo)}</span></div>` : ''}
      ${phone ? `<div class="row"><span class="lbl">Tel</span><span class="val">${esc(phone)}</span></div>` : ''}
      ${c.address ? `<div class="row addr"><span class="lbl">Address</span><span class="val">${esc(c.address)}</span></div>` : ''}
      </div>
    `
  }

  let creditBlock = ''
  if (payMode === PM.CREDIT && bill.customer?.customerId && show('osBalance')) {
    const os = Number(bill.customerOsBalance) || Number(bill.outstandingBalance) || 0
    creditBlock = `
      <div class="pair-row">
        <span class="pair"${at('osBalance')}><span class="lbl">O/S BALANCE</span><span class="val b">: ${fmtMoney(os)}</span></span>
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

  // Custom headings replace name/branch/phone/address; TRN stays (tax invoice).
  const headerHtml = images.header
    ? `<div class="receipt-img"><img class="receipt-block-img" src="${esc(images.header)}" alt="" /></div>`
    : rs.headings.length
    ? `<div class="store-name">${esc(rs.headings[0])}</div>
  ${rs.headings.slice(1).map(h => `<div class="meta-line">${esc(h)}</div>`).join('')}`
    : `<div class="store-name">${esc(co.name)}</div>
  ${co.branch ? `<div class="meta-line">${esc(co.branch)}</div>` : ''}
  ${phoneLine}
  ${co.address ? `<div class="meta-line">${esc(co.address)}</div>` : ''}`

  const taxHtml = show('tax') ? `
  ${hr('lineTax')}
  <div${at('tax')}>
  <div class="tax-head">Tax Details</div>
  <table class="tax"${billLineOn(rs, 'lineTaxHead') ? '' : ' data-nohead'}>
    <thead>
      <tr>
        <th>Taxable Amount</th>
        <th>Tax Amount</th>
        <th>Bill Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${fmtMoney(taxableAmt)}</td>
        <td>${fmtMoney(taxAmt)}</td>
        <td>${fmtMoney(billAmount)}</td>
      </tr>
    </tbody>
  </table>
  </div>` : ''

  const barcodeHtml = show('barcode') ? `
  ${hr('lineBarcode')}
  <div${at('barcode')}>
  ${buildReceiptBarcodeBlockHtml({
    label: 'Scan for reprint',
    barcodeText,
    barcodeSvg,
    displayText: billNoLabel,
    esc,
  })}
  </div>` : ''

  const footerHtml = images.footer
    ? `<div class="receipt-img"><img class="receipt-block-img" src="${esc(images.footer)}" alt="" /></div>`
    : (rs.footers.length ? rs.footers : ['Thank You......Visit Again']).map(f => `<div class="footer">${esc(f)}</div>`).join('')

  const discountHtml = buildReceiptDiscountAdjustmentHtml({ taxableAmt, discountAmt, roundOff, fmtMoney })
  const span = (k, cls, html) => (show(k) ? `<span class="${cls}"${at(k)}>${html}</span>` : '')
  const row = (cls, ...parts) => (parts.some(Boolean) ? `<div class="${cls}">${parts.join('')}</div>` : '')

  // Preview: header / footer click through to the Header & Footer editor.
  const bodyHtml = `
  ${editor ? `<div data-go="header">${headerHtml}</div>` : headerHtml}
  ${co.trn && show('trn') ? `<div class="meta-line"${at('trn')}>TRN: ${esc(co.trn)}</div>` : ''}

  ${hr('lineTitleTop')}
  ${row('title-row',
    span('title', '', invoiceTitle),
    span('titleAr', 'title-ar', invoiceTitleAr))}
  ${hr('lineTitleBottom')}

  ${row('row',
    span('billNo', 'row-left', `<span class="lbl">BILL #</span> : ${esc(billNoLabel)}`),
    span('date', 'row-right', fmtReceiptDateTime(bill.billTime ?? bill.billDate)))}
  ${row('row',
    span('counter', 'row-left', `<span class="lbl">COUNTER</span> : ${esc(bill.counterNo)}`),
    span('cashier', 'row-right', `<span class="lbl">CASHIER</span> : ${esc(bill.staffName ?? 'CASHIER')}`))}
  ${customerBlock}
  ${bill.remarks?.trim() && show('comments') ? `<div class="row"${at('comments')}><span class="lbl">Comments</span><span class="val">${esc(bill.remarks.trim())}</span></div>` : ''}

  ${hr('lineItemsTop')}
  <table class="items"${billLineOn(rs, 'lineItemHead') ? '' : ' data-nohead'}${billLineOn(rs, 'lineItemRows') ? '' : ' data-norows'}>
    ${show('itemHead') ? `<thead${at('itemHead')}>
      <tr>
        <th>Description</th>
        <th class="c">Qty</th>
        <th class="r">Price</th>
        <th class="r">Total</th>
      </tr>
    </thead>` : ''}
    <tbody>
      ${itemRows || '<tr><td colspan="4" class="center">No items</td></tr>'}
    </tbody>
  </table>

  ${hr('lineTotals')}
  ${discountHtml && show('discount') ? `<div${at('discount')}>${discountHtml}</div>` : ''}
  ${show('total') ? `<div class="total-line"${at('total')}>
    <span>TOTAL :</span>
    <span>${fmtMoney(billAmount)}</span>
  </div>` : ''}
  ${show('settlement') ? `<div${at('settlement')}>
  <div class="pair-row">
    <span class="lbl">SETTLEMENT : ${esc(settlement)}</span>
  </div>
  ${splitBlock}
  </div>` : ''}

  ${row('pair-row',
    span('itemCount', '', `<span class="lbl">ITEMS</span> : ${itemCount}`),
    span('billAmount', 'pair', `<span class="lbl">BILL AMOUNT</span><span class="val">: ${fmtMoney(billAmount)}</span>`))}
  ${row('pair-row',
    span('qtyTotal', '', `<span class="lbl">QTY</span> : ${fmtQty(qtyTotal)}`),
    span('paidAmount', 'pair', `<span class="lbl">PAID AMOUNT</span><span class="val">: ${fmtMoney(paidAmount)}</span>`))}
  ${row('pair-row',
    span('balance', 'pair', `<span class="lbl">BAL. AMOUNT</span><span class="val">: ${fmtMoney(balAmount)}</span>`))}
  ${creditBlock}
  ${taxHtml}
  ${barcodeHtml}

  ${hr('lineFooter')}
  ${editor ? `<div data-go="footer">${footerHtml}</div>` : footerHtml}
  ${printerNote && show('printer') ? `<div class="printer-note"${at('printer')}>Printer: ${esc(printerNote)}</div>` : ''}
  `

  // Restyled fields only; numbers are clamped integers (posSettings.parseBillLayout).
  const fieldCss = Object.entries(rs.layout?.fields ?? {}).map(([k, f]) => {
    const decl = [f.size && `font-size: ${f.size}px !important`, f.weight && `font-weight: ${f.weight} !important`].filter(Boolean).join('; ')
    return decl ? `[data-f="${k}"], [data-f="${k}"] * { ${decl}; }` : ''
  }).join('\n')

  return buildReceiptDocumentHtml({
    title: barcodeText || billNoLabel || 'Receipt',
    bodyHtml,
    extraCss: `${RECEIPT_BARCODE_EXTRA_CSS}${RECEIPT_IMAGE_CSS}${LAYOUT_CSS}${editor ? EDITOR_CSS : ''}${fieldCss}`,
    autoPrint: !editor,
  })
}

/** copies: new bills pass the POS "Bill Print Copies" parameter; reprints stay at 1. Each copy prints and cuts separately. */
export async function printBillFromData(bill, meta = {}, copies = 1) {
  if (!bill) throw new Error('No bill data to print')
  const images = await renderReceiptImages(bill, meta)
  if (IS_ANDROID_POS) {
    await printAndroidBill(bill, meta, copies, images)
    return
  }
  openReceiptPrintWindow(buildBillReceiptHtml(bill, meta, images), { copies })
}

export async function printBillReceipt(salesId, accessToken, meta = {}, copies = 1) {
  const bill = await api.counterPos.salesViewerBill(salesId, accessToken)
  await printBillFromData(bill, meta, copies)
  return bill
}

export async function printBillReceipts(salesIds, accessToken, meta = {}, copies = 1) {
  const ids = (salesIds ?? []).filter(id => id != null && Number(id) > 0)
  for (const id of ids) {
    await printBillReceipt(id, accessToken, meta, copies)
    if (ids.length > 1) {
      await new Promise(r => setTimeout(r, 600))
    }
  }
}

/** Bill reprint by bill number (66, B-66, etc.) — any counter's bill; stationId set = must be that counter's. */
export async function printBillReprintByNo(billNoInput, accessToken, meta = {}, stationId = null) {
  const salesId = parseBillSalesId(billNoInput)
  if (!salesId) throw new Error('Enter a valid bill number')
  const bill = await api.counterPos.salesViewerBill(salesId, accessToken)
  if (stationId != null && bill?.stationId != null && Number(bill.stationId) !== Number(stationId)) {
    throw new Error(`Bill ${bill.billNoDisplay ?? salesId} is from ${bill.stationName || 'another counter'}`)
  }
  await printBillFromData(bill, meta)
  return bill
}
