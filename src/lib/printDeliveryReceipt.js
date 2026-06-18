import { fmtMoney } from './currencyFormat'
import { fmtQty } from './utils'
import { api } from './api'
import { getGvTax } from './gvtax'
import { getReceiptPrinterName } from './posPrinter'
import {
  buildReceiptDocumentHtml,
  escReceipt as esc,
  fmtReceiptDateTime,
  openReceiptPrintWindow,
  buildReceiptDiscountAdjustmentHtml,
  buildReceiptBarcodeBlockHtml,
  RECEIPT_BARCODE_EXTRA_CSS,
  wrapReceiptBodyCopies,
  resolveReceiptCompanyMeta,
  resolveCashierName,
} from './receiptPrintTheme'
import {
  buildDeliveryBarcodeSvg,
  formatDeliveryBarcode,
} from './deliveryBarcode'

function resolveCompanyHeader(meta) {
  return resolveReceiptCompanyMeta(meta)
}

function fmtPhoneLine(...parts) {
  return parts.filter(Boolean).join(' / ')
}

function lineUnitDisplay(it) {
  const qty = Math.abs(Number(it.qty) || 1)
  const total = Number(it.lineTotal) || 0
  if (qty > 0 && total) return fmtMoney(total / qty)
  return fmtMoney(it.unitPrice)
}

/**
 * Build thermal delivery note for customer (80mm, shared receipt theme).
 */
export function buildDeliveryReceiptHtml(delivery, meta = {}, copies = 1) {
  const co = resolveCompanyHeader(meta)
  const deliveryLabel = String(delivery.deliveryNo ?? '')
  const barcodeText = formatDeliveryBarcode(delivery.deliveryNo)
  const barcodeSvg = buildDeliveryBarcodeSvg(delivery.deliveryNo)
  const printerNote = getReceiptPrinterName()

  const items = delivery.items ?? []
  const itemCount = items.length
  const qtyTotal = items.reduce((s, it) => s + Math.abs(Number(it.qty) || 0), 0)
  const billAmount = Number(delivery.netAmount) || 0
  const taxableAmt = Number(delivery.taxableAmt) || 0
  const taxAmt = Number(delivery.taxAmt) || 0
  const taxRate = Number(delivery.taxRate) || Number(items[0]?.vatPer) || getGvTax()
  const discountAmt = Number(delivery.discountAmt) || 0
  const roundOff = delivery.roundOff != null ? Number(delivery.roundOff) : 0

  const itemRows = items.map((it, idx) => {
    const vatPer = Number(it.vatPer) || taxRate
    const vatAmt = Number(it.vatAmt) || 0
    const code = it.productCode ?? it.barcode ?? ''
    const isLast = idx === items.length - 1
    return `
      <tr class="item-main">
        <td class="desc">${esc(it.description || 'Item')}</td>
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

  const customerPhone = fmtPhoneLine(delivery.mobileNo, delivery.telephone)
  const deliveryPhone = String(delivery.deliveryPhone ?? '').trim()
  const showDeliveryPhone = deliveryPhone && deliveryPhone !== customerPhone

  const bodyHtml = `
  <div class="store-name">${esc(co.name)}</div>
  ${co.branch ? `<div class="meta-line">${esc(co.branch)}</div>` : ''}
  ${co.phone ? `<div class="meta-line">Ph: ${esc(co.phone)}</div>` : ''}
  ${co.address ? `<div class="meta-line">${esc(co.address)}</div>` : ''}
  ${co.trn ? `<div class="meta-line">TRN: ${esc(co.trn)}</div>` : ''}

  <hr class="dash" />
  <div class="title-row">
    <span>Delivery Note</span>
    <span class="title-ar">إيصال توصيل</span>
  </div>
  <hr class="dash" />

  <div class="row">
    <span class="row-left"><span class="lbl">DELIVERY #</span> : ${esc(deliveryLabel)}</span>
  </div>
  <div class="row">
    <span class="row-left"><span class="lbl">DELIVER BY</span> : ${fmtReceiptDateTime(delivery.deliveryTime)}</span>
  </div>
  <div class="row">
    <span class="row-left"><span class="lbl">COUNTER</span> : ${esc(delivery.counterNo ?? '')}</span>
    <span class="row-right"><span class="lbl">CASHIER</span> : ${esc(delivery.cashierName ?? meta.cashierName ?? resolveCashierName(meta.cashier))}</span>
  </div>

  <hr class="dash" />
  <div class="section-head">Customer Details</div>
  <div class="row"><span class="lbl">Customer</span><span class="val">${esc(delivery.customerName)}</span></div>
  ${delivery.customerCode ? `<div class="row"><span class="lbl">Code</span><span class="val">${esc(delivery.customerCode)}</span></div>` : ''}
  ${delivery.taxRegNo ? `<div class="row"><span class="lbl">TRN</span><span class="val">${esc(delivery.taxRegNo)}</span></div>` : ''}
  ${customerPhone ? `<div class="row"><span class="lbl">Tel</span><span class="val">${esc(customerPhone)}</span></div>` : ''}
  ${showDeliveryPhone ? `<div class="row"><span class="lbl">Delivery Tel</span><span class="val">${esc(deliveryPhone)}</span></div>` : ''}
  ${delivery.customerAddress?.trim() ? `<div class="row addr"><span class="lbl">Cust. Address</span><span class="val">${esc(delivery.customerAddress.trim())}</span></div>` : ''}
  <div class="row addr"><span class="lbl">Deliver To</span><span class="val">${esc(delivery.deliveryAddress ?? '')}</span></div>
  ${delivery.remarks?.trim() ? `<div class="row addr"><span class="lbl">Comments</span><span class="val">${esc(delivery.remarks.trim())}</span></div>` : ''}

  <hr class="dash" />
  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th class="c">Qty</th>
        <th class="r">Price</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="4" class="center">No items</td></tr>'}
    </tbody>
  </table>

  <hr class="dash" />
  ${buildReceiptDiscountAdjustmentHtml({ taxableAmt, discountAmt, roundOff, fmtMoney })}
  <div class="total-line">
    <span>TOTAL :</span>
    <span>${fmtMoney(billAmount)}</span>
  </div>
  <div class="pair-row">
    <span><span class="lbl">ITEMS</span> : ${itemCount}</span>
    <span class="pair"><span class="lbl">QTY</span><span class="val">: ${fmtQty(qtyTotal)}</span></span>
  </div>

  <hr class="dash" />
  <div class="tax-head">Tax Details</div>
  <table class="tax">
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

  <hr class="dash" />
  ${buildReceiptBarcodeBlockHtml({
    label: 'Scan to recall',
    barcodeText,
    barcodeSvg,
    displayText: deliveryLabel,
    esc,
  })}

  <hr class="dash" />
  <div class="footer">Customer Copy — Thank You</div>
  ${printerNote ? `<div class="printer-note">Printer: ${esc(printerNote)}</div>` : ''}
  `

  const { bodyHtml: printBody, extraCss: copyCss } = wrapReceiptBodyCopies(bodyHtml, copies)

  return buildReceiptDocumentHtml({
    title: deliveryLabel,
    bodyHtml: printBody,
    extraCss: `
      .section-head {
        text-align: center; font-size: 13px; font-weight: 700;
        margin: 4px 0 6px; letter-spacing: 0.4px; text-transform: uppercase;
      }
      ${RECEIPT_BARCODE_EXTRA_CSS}
      ${copyCss}
    `,
  })
}

export function printDeliveryReceipt(delivery, meta = {}, copies = 1) {
  if (!delivery?.deliveryNo) throw new Error('No delivery number to print')
  const count = Math.max(1, Math.min(20, Math.floor(Number(copies) || 1)))
  openReceiptPrintWindow(buildDeliveryReceiptHtml(delivery, meta, count))
}

export async function printDeliveryReprintByNo(deliveryNo, accessToken, meta = {}) {
  const n = Number(deliveryNo)
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a valid delivery number')
  const list = await api.counterPos.getDeliveryBills(accessToken)
  const deliveries = Array.isArray(list) ? list : []
  const delivery = deliveries.find(d => String(d.hold_no) === String(n))
  if (!delivery) throw new Error(`Delivery ${n} not found`)
  const items = await api.counterPos.recallDelivery(delivery.sales_id, accessToken)
  const { parseDeliveryRemarks } = await import('./deliveryBarcode')
  const parsed = parseDeliveryRemarks(delivery.remarks)
  const deliveryPrint = {
    deliveryNo: delivery.hold_no,
    salesId: delivery.sales_id,
    deliveryTime: delivery.delivery_time ?? delivery.bill_date,
    counterNo: delivery.counter_no,
    cashierName: delivery.staff_name ?? '',
    customerName: delivery.customer_name ?? '',
    customerCode: delivery.customer_code ?? '',
    taxRegNo: delivery.customer_tax_reg_no ?? null,
    mobileNo: delivery.mobile_no ?? null,
    telephone: delivery.telephone ?? null,
    deliveryPhone: parsed.deliveryPhone || null,
    deliveryAddress: parsed.deliveryAddress || delivery.address || '',
    customerAddress: delivery.address ?? null,
    remarks: parsed.billComment || null,
    taxableAmt: Number(delivery.taxable_amount ?? 0),
    taxAmt: Number(delivery.tax_1_amount ?? 0),
    discountAmt: Number(delivery.discount_amount ?? 0),
    roundOff: delivery.round_off_adjustment != null ? Number(delivery.round_off_adjustment) : 0,
    netAmount: Number(delivery.amount ?? 0),
    taxRate: getGvTax(),
    items: (Array.isArray(items) ? items : []).map(it => ({
      description: it.short_description,
      qty: it.qty,
      unitPrice: it.unit_price,
      lineTotal: it.line_total,
      productCode: it.product_code,
      vatPer: it.tax_1_rate,
      vatAmt: it.tax_1_amount,
    })),
  }
  printDeliveryReceipt(deliveryPrint, meta)
  return deliveryPrint
}

/** Build delivery print payload from POS state (call before clear). */
export function deliveryDataFromPosState(state, result, details) {
  const items = (state.cartItems ?? []).map(it => ({
    description: it.description,
    qty: it.qty,
    unitPrice: it.unitPrice,
    lineTotal: it.lineTotal,
    productCode: it.productCode ?? it.barcode,
    vatPer: it.vatPer,
    vatAmt: it.vatAmt,
  }))
  return {
    deliveryNo: result.holdNo,
    salesId: result.salesId,
    billDate: new Date(),
    deliveryTime: details.deliveryTime,
    counterNo: state.counterNo,
    cashierName: resolveCashierName(state.cashier),
    customerName: details.customerName ?? state.customerName,
    customerCode: details.customerCode ?? state.customerCode,
    taxRegNo: details.taxRegNo ?? null,
    mobileNo: details.mobileNo ?? null,
    telephone: details.telephone ?? null,
    deliveryPhone: details.deliveryPhone ?? state.deliveryPhone,
    deliveryAddress: details.deliveryAddress ?? state.deliveryAddress,
    customerAddress: details.customerAddress ?? details.address ?? null,
    remarks: state.billComment?.trim() || null,
    subTotal: state.subTotal,
    discountAmt: state.discountAmt,
    taxableAmt: state.taxableAmt,
    taxAmt: state.taxAmt,
    roundOff: state.roundOff,
    taxRate: items[0]?.vatPer ?? getGvTax(),
    netAmount: state.netAmount,
    items,
  }
}
