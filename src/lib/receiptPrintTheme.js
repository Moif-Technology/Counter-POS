/**
 * Shared thermal receipt print theme for Counter-POS.
 * Use this module for all receipt-style prints (bills, reprints, settlements, X/Z, etc.)
 * so font family, sizes, and 80mm layout stay consistent.
 */

import { usePosStore } from '../store/posStore.js'
import { getReceiptPrinterName } from './posPrinter.js'
import { posNotifyError } from './posNotify.js'

/** Bill font — Sora, the single font used across the app */
export const BILL_FONT = "'Sora', system-ui, sans-serif"

/** Loads Sora inside print windows (must be the first rule in a <style>) */
export const BILL_FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');"

/** Page = the driver's 80mm paper. A smaller @page (72mm) got stretched to 80mm by the driver
 *  (text ~1.1x bigger and cut on the right, real print 2026-11-24), so the page stays 80mm and the
 *  padding keeps the text inside what the head actually prints. */
export const RECEIPT_PAGE_WIDTH = '80mm'
// ponytail: thermal calibration knob. Text runs 2mm..72mm of the paper (70mm wide); the head lost
// everything past ~76mm on the 80mm prints. Raise RIGHT if the last character still cuts,
// lower it if the slip looks off-centre.
export const RECEIPT_PAD_LEFT = '2mm'
export const RECEIPT_PAD_RIGHT = '8mm'

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
  const day = String(dt.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[dt.getMonth()]
  const year = dt.getFullYear()
  const hour12 = dt.getHours() % 12 || 12
  const minute = String(dt.getMinutes()).padStart(2, '0')
  const ampm = dt.getHours() >= 12 ? 'PM' : 'AM'
  return `${day}/${month}/${year} - ${String(hour12).padStart(2, '0')}:${minute} ${ampm}`
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
  .barcode-svg svg { max-width: 100%; height: auto; }
  .barcode-text { font-size: 16px; font-weight: 700; letter-spacing: 2px; margin-top: 4px; }
  @media print {
    .barcode-svg svg {
      width: 100% !important;
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
      padding: 3mm ${RECEIPT_PAD_RIGHT} 3mm ${RECEIPT_PAD_LEFT};
    }
    @media print {
      html, body { width: ${RECEIPT_PAGE_WIDTH}; max-width: ${RECEIPT_PAGE_WIDTH}; }
      body { padding: 2mm ${RECEIPT_PAD_RIGHT} 2mm ${RECEIPT_PAD_LEFT}; font-size: ${f.body}px; }
      @page { size: ${RECEIPT_PAGE_WIDTH} auto; margin: 0; }
    }
  ` : ''

  return `
    ${BILL_FONT_IMPORT}
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
    table.items .r { text-align: right; white-space: nowrap; font-weight: 700; padding-left: 6px; }
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
    /* Never past the printable edge: a value that doesn't fit drops to the next line (right-aligned),
       and wraps if it is longer than a whole line (long customer names, big amounts). */
    .row, .pair-row { flex-wrap: wrap; }
    .row .val, .row-right { flex-shrink: 1; min-width: 0; white-space: normal; overflow-wrap: anywhere; text-align: right; }
    .pair-row > .pair { margin-left: auto; }
    .footer { text-align: center; font-size: ${f.footer}px; font-weight: 700; margin-top: 10px; letter-spacing: 0.3px; }
    .printer-note { font-size: ${f.printerNote}px; font-weight: 700; color: #000; margin-top: 5px; text-align: center; }
  `
}

/** CSS snippet for wider report prints — same font, full page width */
export function buildReportPrintFontCss() {
  const f = RECEIPT_FONT
  return `
    ${BILL_FONT_IMPORT}
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

/** Print-window script. copies > 1 = one print job per copy (window.print() blocks until each is sent). */
const autoPrintScript = (copies = 1) => `
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        for (var i = 0; i < ${copies}; i++) window.print();
      }, 400);
    };
  </script>
`
const AUTO_PRINT_SCRIPT = autoPrintScript(1)
const AUTO_PRINT_RE = /<script>[\s\S]*?window\.onload[\s\S]*?<\/script>/i

const clampCopies = (copies) => Math.max(1, Math.min(20, Math.floor(Number(copies) || 1)))

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

/**
 * Open a print window for receipt HTML.
 * copies: each copy is its own print job, so the thermal printer cuts after every copy.
 * @param {string} html
 * @param {{ width?: number, height?: number, copies?: number }} [opts]
 */
export function openReceiptPrintWindow(html, opts = {}) {
  const { width = 420, height = 720 } = opts
  const copies = clampCopies(opts.copies)
  // Windows app: thermal-size prints go straight to the printer, no dialog. Wide reports keep the window.
  if (window.posDesktop && width <= 420) {
    printHtmlSilently(html, copies)
    return null
  }
  const win = window.open('', '_blank', `width=${width},height=${height}`)
  if (!win) throw new Error('Pop-up blocked — allow pop-ups to print receipts')
  win.document.write(copies > 1 ? html.replace(AUTO_PRINT_RE, autoPrintScript(copies)) : html)
  win.document.close()
  win.focus()
  return win
}

// Desktop jobs run one after another so copies (and sale + return bills) come out in order.
let desktopQueue = Promise.resolve()

/** Windows app only: print a full receipt document on the configured printer without a dialog, once per copy. */
export function printHtmlSilently(html, copies = 1) {
  const doc = html.replace(AUTO_PRINT_RE, '')
  const n = clampCopies(copies)
  desktopQueue = desktopQueue
    .then(async () => {
      for (let i = 0; i < n; i++) {
        await window.posDesktop.printHtml(doc, { deviceName: getReceiptPrinterName() })
      }
    })
    .catch(err => posNotifyError(`Print failed: ${err.message}`, { title: 'Printer' }))
  return desktopQueue
}
