/**
 * Shared thermal receipt print theme for Counter-POS.
 * Use this module for all receipt-style prints (bills, reprints, settlements, X/Z, etc.)
 * so font family, sizes, and 80mm layout stay consistent.
 */

import { usePosStore } from '../store/posStore.js'

/** Legacy POS BillFont — Courier New bold */
export const BILL_FONT = '"Courier New", Courier, monospace'

export const RECEIPT_PAGE_WIDTH = '80mm'

/** Standard font sizes (px) — keep in sync across all receipt prints */
export const RECEIPT_FONT = {
  body: 14,
  storeName: 18,
  meta: 13,
  title: 14,
  titleAr: 13,
  row: 13,
  rowSmall: 12,
  items: 13,
  itemsHead: 12,
  itemSub: 12,
  total: 15,
  taxHead: 13,
  taxTable: 12,
  footer: 14,
  printerNote: 11,
}

export function resolveReceiptCompanyMeta(meta = {}) {
  const h = meta.receiptHeader ?? {}
  return {
    name: meta.companyName ?? h.companyName ?? meta.shopName ?? 'MOIF TECHNOLOGY',
    branch: meta.branchName ?? h.branchName ?? meta.shopSubName ?? '',
    phone: meta.phone ?? meta.companyPhone ?? h.companyPhone ?? '',
    address: meta.address ?? meta.companyAddress ?? h.companyAddress ?? '',
    trn: meta.trn ?? meta.taxRegistrationNo ?? h.taxRegistrationNo ?? '',
  }
}

/** Cashier label for receipt prints — matches tax invoice staffName source. */
export function resolveCashierName(cashier, fallback = 'CASHIER') {
  if (!cashier) return fallback
  const n = cashier.staffName ?? cashier.name ?? cashier.staffCode
  return n && String(n).trim() ? String(n).trim() : fallback
}

/** Receipt header fields from POS session (DB-loaded on login). */
export function getReceiptPrintMetaFromStore() {
  const s = usePosStore.getState()
  return {
    companyName: s.shopName,
    branchName: s.shopSubName,
    phone: s.companyPhone,
    address: s.companyAddress,
    trn: s.companyTrn,
    counterNo: s.counterNo,
  }
}

export function escReceipt(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Receipt date/time — 17/Jun/2026 - 11:18 PM (single line on 80mm) */
export function fmtReceiptDateTime(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  const date = dt.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).replace(/ /g, '/')
  const time = dt.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
  return `${date} - ${time}`
}

/** Parse bill no input (e.g. 66, B-66, R-66) to sales_id */
export function parseBillSalesId(input) {
  const s = String(input ?? '').trim()
  if (!s) return null
  const prefixed = s.match(/^[BR]-?(\d+)$/i)
  if (prefixed) return Number(prefixed[1])
  const digits = s.replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Discount / round-off rows before TOTAL — shared by tax invoice & delivery note.
 * @param {{ taxableAmt: number, discountAmt: number, roundOff?: number|null, fmtMoney: (n:number)=>string }} p
 */
export function buildReceiptDiscountAdjustmentHtml({ taxableAmt, discountAmt, roundOff, fmtMoney }) {
  const disc = Number(discountAmt) || 0
  const taxable = Number(taxableAmt) || 0
  const ro = roundOff != null ? Number(roundOff) : 0
  const hasDiscount = Math.abs(disc) > 0.001
  const hasRoundOff = ro != null && !Number.isNaN(ro) && Math.abs(ro) > 0.001
  let html = ''
  if (hasDiscount) {
    const beforeDisc = taxable + disc
    html += `
  <div class="pair-row">
    <span class="lbl">TAXABLE BEFORE DISC</span>
    <span class="val">${fmtMoney(beforeDisc)}</span>
  </div>
  <div class="pair-row">
    <span class="lbl">DISCOUNT</span>
    <span class="val">${fmtMoney(disc)}</span>
  </div>
  <div class="pair-row">
    <span class="lbl">TAXABLE AFTER DISC</span>
    <span class="val">${fmtMoney(taxable)}</span>
  </div>`
  }
  if (hasRoundOff) {
    html += `
  <div class="pair-row">
    <span class="lbl">ROUND OFF</span>
    <span class="val">${fmtMoney(ro)}</span>
  </div>`
  }
  return html
}

/** Barcode block for hold / delivery / invoice slips */
export function buildReceiptBarcodeBlockHtml({ label, barcodeText, barcodeSvg, displayText, esc = escReceipt }) {
  if (!barcodeText || !barcodeSvg) return ''
  const humanText = displayText ?? barcodeText
  return `
  <div class="barcode-block center">
    <div class="barcode-label">${esc(label)}</div>
    <div class="barcode-svg">${barcodeSvg}</div>
    <div class="barcode-text">${esc(humanText)}</div>
  </div>`
}

export const RECEIPT_BARCODE_EXTRA_CSS = `
  .barcode-block { margin: 8px 0 4px; }
  .barcode-label { font-size: 13px; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.3px; }
  .barcode-svg { display: flex; justify-content: center; margin: 4px 0; overflow: visible; }
  .barcode-svg svg { max-width: 72mm; height: auto; }
  .barcode-text { font-size: 16px; font-weight: 700; letter-spacing: 2px; margin-top: 4px; }
  @media print {
    .barcode-svg svg {
      width: 68mm !important;
      height: auto !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`

/**
 * Base CSS for 80mm thermal receipts — shared layout classes (.row, .dash, .items, etc.)
 * @param {{ includePage?: boolean }} [opts]
 */
export function buildReceiptBaseCss(opts = {}) {
  const { includePage = true } = opts
  const f = RECEIPT_FONT
  const pageRules = includePage ? `
    body {
      font-size: ${f.body}px;
      line-height: 1.3;
      width: ${RECEIPT_PAGE_WIDTH};
      max-width: ${RECEIPT_PAGE_WIDTH};
      margin: 0 auto;
      padding: 3mm 2mm;
    }
    @media print {
      body { width: ${RECEIPT_PAGE_WIDTH}; padding: 0; font-size: ${f.body}px; }
      @page { size: ${RECEIPT_PAGE_WIDTH} auto; margin: 2mm; }
    }
  ` : ''

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, table, div, span, td, th {
      font-family: ${BILL_FONT};
      font-weight: 700;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    ${pageRules}
    .store-name {
      font-size: ${f.storeName}px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.2;
      margin-bottom: 5px;
    }
    .center { text-align: center; }
    .meta-line { text-align: center; font-size: ${f.meta}px; font-weight: 700; margin: 2px 0; }
    .dash { border: none; border-top: 2px dashed #000; margin: 7px 0; }
    .title-row {
      display: flex; justify-content: space-between; align-items: center;
      font-weight: 700; font-size: ${f.title}px; margin: 5px 0;
      flex-wrap: nowrap; white-space: nowrap;
    }
    .title-ar { font-size: ${f.titleAr}px; font-weight: 700; direction: rtl; flex-shrink: 0; }
    .row {
      display: flex; justify-content: space-between; align-items: center;
      gap: 4px; flex-wrap: nowrap; white-space: nowrap;
      font-size: ${f.row}px; font-weight: 700; margin: 3px 0;
      width: 100%;
    }
    .row.addr { align-items: flex-start; white-space: normal; }
    .row .lbl { font-weight: 700; flex-shrink: 0; }
    .row-left { flex: 0 1 auto; min-width: 0; white-space: nowrap; }
    .row-right { flex: 0 0 auto; text-align: right; white-space: nowrap; margin-left: auto; }
    .row .val { text-align: right; flex: 0 0 auto; font-weight: 700; white-space: nowrap; }
    .pair-row {
      display: flex; justify-content: space-between; align-items: baseline;
      font-size: ${f.row}px; font-weight: 700; margin: 3px 0;
      flex-wrap: nowrap; white-space: nowrap;
    }
    .pair-row.small { font-size: ${f.rowSmall}px; font-weight: 700; padding-left: 8px; }
    .pair { display: flex; gap: 4px; white-space: nowrap; }
    .pair .lbl { font-weight: 700; }
    .pair .val { font-weight: 700; }
    table.items { width: 100%; border-collapse: collapse; margin: 5px 0; font-size: ${f.items}px; font-weight: 700; }
    table.items th {
      text-align: left; font-weight: 700; font-size: ${f.itemsHead}px;
      border-bottom: 2px dashed #000; padding: 4px 0;
    }
    table.items th.c { text-align: center; width: 30px; }
    table.items th.r { text-align: right; }
    table.items td { padding: 3px 0; vertical-align: top; font-weight: 700; }
    table.items .desc { font-weight: 700; max-width: 42mm; word-wrap: break-word; }
    table.items .c { text-align: center; width: 30px; font-weight: 700; }
    table.items .r { text-align: right; white-space: nowrap; font-weight: 700; }
    table.items .b { font-weight: 700; }
    table.items .item-sub td { padding-bottom: 5px; border-bottom: 1px dotted #000; font-size: ${f.itemSub}px; font-weight: 700; }
    table.items .item-sub-last td { border-bottom: none; padding-bottom: 2px; }
    table.items .sub { color: #000; font-weight: 700; }
    .total-line {
      display: flex; justify-content: space-between;
      font-weight: 700; font-size: ${f.total}px; margin: 5px 0;
    }
    .tax-head { text-align: center; font-weight: 700; font-size: ${f.taxHead}px; margin: 7px 0 5px; }
    table.tax { width: 100%; border-collapse: collapse; font-size: ${f.taxTable}px; font-weight: 700; margin-bottom: 7px; }
    table.tax th, table.tax td { text-align: right; padding: 3px 4px; font-weight: 700; }
    table.tax th:first-child, table.tax td:first-child { text-align: left; }
    table.tax thead tr { border-bottom: 1px dotted #000; }
    table.tax tbody tr { border-bottom: none; }
    .footer { text-align: center; font-size: ${f.footer}px; font-weight: 700; margin-top: 10px; letter-spacing: 0.3px; }
    .printer-note { font-size: ${f.printerNote}px; font-weight: 700; color: #000; margin-top: 5px; text-align: center; }
  `
}

/** CSS snippet for wider report prints — same font, full page width */
export function buildReportPrintFontCss() {
  const f = RECEIPT_FONT
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, table, div, span, td, th {
      font-family: ${BILL_FONT};
      font-weight: 700;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { font-size: ${f.body}px; line-height: 1.35; padding: 10px; }
    @media print {
      body { padding: 10px; font-size: ${f.body}px; }
      @page { margin: 10mm; }
    }
  `
}

const AUTO_PRINT_SCRIPT = `
  <script>
    window.onload = function() {
      setTimeout(function() { window.focus(); window.print(); }, 400);
    };
  </script>
`

/**
 * Wrap receipt body HTML in a full printable document.
 */
export function buildReceiptDocumentHtml({ title = 'Receipt', bodyHtml = '', extraCss = '', autoPrint = true }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escReceipt(title)}</title>
  <style>
    ${buildReceiptBaseCss()}
    ${extraCss}
  </style>
</head>
<body>
  ${bodyHtml}
  ${autoPrint ? AUTO_PRINT_SCRIPT : ''}
</body>
</html>`
}

export const RECEIPT_COPY_EXTRA_CSS = `
  .receipt-copy { page-break-after: always; break-after: page; }
  .receipt-copy:last-child { page-break-after: auto; break-after: auto; }
`

/** Duplicate one receipt body for N thermal pages in a single print job. */
export function wrapReceiptBodyCopies(bodyHtml, copies = 1) {
  const n = Math.max(1, Math.min(99, Math.floor(Number(copies) || 1)))
  if (n <= 1) return { bodyHtml, extraCss: '' }
  return {
    bodyHtml: Array.from({ length: n }, () => `<div class="receipt-copy">${bodyHtml}</div>`).join(''),
    extraCss: RECEIPT_COPY_EXTRA_CSS,
  }
}

/**
 * Open a print window for receipt HTML.
 * @param {string} html
 * @param {{ width?: number, height?: number }} [opts]
 */
export function openReceiptPrintWindow(html, opts = {}) {
  const { width = 420, height = 720 } = opts
  const win = window.open('', '_blank', `width=${width},height=${height}`)
  if (!win) throw new Error('Pop-up blocked — allow pop-ups to print receipts')
  win.document.write(html)
  win.document.close()
  win.focus()
  return win
}
