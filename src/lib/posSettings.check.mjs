// Self-check for receipt parameter parsing in posSettings.js: `node src/lib/posSettings.check.mjs`
import assert from 'node:assert/strict'
import { parseReceiptSettings, billField, billLineOn } from './posSettings.js'

// Nothing stored (migration 146 unrun / older API): today's receipt, 1 copy.
assert.deepEqual(parseReceiptSettings({}), {
  headerBlocks: [], footerBlocks: [],
  copies: 1, headings: [], footers: [],
  showArabicTitle: true, showItemCode: true, showTaxSummary: true, showBarcode: true,
  toggles: { receipt_show_arabic_title: true, receipt_show_item_code: true, receipt_show_tax_summary: true, receipt_show_barcode: true },
  layout: { fields: {}, lines: {} },
})

// Bill layout: known keys only, clamped integers (they go into print CSS), weight snaps to 100s.
const lay = parseReceiptSettings({ receipt_bill_layout: JSON.stringify({
  fields: { trn: { size: 40, weight: 640 }, counter: { hide: true }, date: { size: '20' }, evil: { size: 12 }, total: { size: 2.4, weight: 100 } },
  lines: { lineTax: false, lineTitleTop: true, nope: false },
}), receipt_show_barcode: '0' })
assert.deepEqual(lay.layout, {
  fields: { trn: { size: 28, weight: 600 }, counter: { hide: true }, total: { size: 8, weight: 400 } },
  lines: { lineTax: false },
})
assert.deepEqual(billField(lay, 'trn'), { size: 28, weight: 600, hidden: false })
assert.deepEqual(billField(lay, 'cashier'), { size: 13, weight: 700, hidden: false })   // defaults
assert.equal(billField(lay, 'counter').hidden, true)
assert.equal(billField(lay, 'barcode').hidden, true)                                   // old toggle still hides it
assert.equal(billLineOn(lay, 'lineTax'), false)
assert.equal(billLineOn(lay, 'lineFooter'), true)
assert.deepEqual(parseReceiptSettings({ receipt_bill_layout: '{bad json' }).layout, { fields: {}, lines: {} })

const r = parseReceiptSettings({
  receipt_copies: '3',
  heading1_counter: ' My Shop ', heading2_counter: '', heading3_counter: 'Dubai',
  heading6_counter: 'No refund', heading7_counter: '  ',
  receipt_show_arabic_title: '0', receipt_show_barcode: 0, receipt_show_item_code: '1',
})
assert.equal(r.copies, 3)
assert.deepEqual(r.headings, ['My Shop', 'Dubai'])   // blanks dropped, trimmed
assert.deepEqual(r.footers, ['No refund'])
assert.equal(r.showArabicTitle, false)
assert.equal(r.showBarcode, false)
assert.equal(r.showItemCode, true)
assert.equal(r.showTaxSummary, true)                  // missing key = on

// Saved Control Panel blocks win over the old heading lines.
const png = 'data:image/png;base64,iVBOR'
const field = { type: 'text', text: 'DUKKAN 54' }
const blocks = parseReceiptSettings({
  receipt_header_blocks: JSON.stringify([field, { type: 'image', src: png }]), heading1_counter: 'Old name',
  receipt_footer_blocks: '[]', heading6_counter: 'Old footer',
})
assert.equal(blocks.headerBlocks.length, 2)
assert.deepEqual(blocks.headings, [])        // old lines off once blocks are saved
assert.deepEqual(blocks.footerBlocks, [])    // saved empty footer -> default footer text
assert.deepEqual(blocks.footers, [])
// No saved blocks: old lines still print.
const legacy = parseReceiptSettings({ heading1_counter: 'Old name' })
assert.deepEqual(legacy.headerBlocks, [])
assert.deepEqual(legacy.headings, ['Old name'])
// Only PNG/JPEG data URL images reach the print canvas; broken JSON prints the defaults.
const bad = parseReceiptSettings({ receipt_header_blocks: JSON.stringify([
  { type: 'image', src: 'javascript:alert(1)' }, { type: 'image', src: 'data:image/svg+xml;base64,PHN2Zz4=' }, field,
]) })
assert.deepEqual(bad.headerBlocks, [field])
assert.deepEqual(parseReceiptSettings({ receipt_header_blocks: '{oops' }).headerBlocks, [])

// Copies clamp to 1..10.
assert.equal(parseReceiptSettings({ receipt_copies: '0' }).copies, 1)
assert.equal(parseReceiptSettings({ receipt_copies: 'abc' }).copies, 1)
assert.equal(parseReceiptSettings({ receipt_copies: 50 }).copies, 10)
assert.equal(parseReceiptSettings({ receipt_copies: 2.7 }).copies, 2)

console.log('posSettings receipt check OK')
