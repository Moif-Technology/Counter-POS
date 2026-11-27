// Self-check for header / footer tags in receiptBlocks.js: `node src/lib/receiptBlocks.check.mjs`
import assert from 'node:assert/strict'
import { fillBlocks, blocksFromParams } from './receiptBlocks.js'

const img = { type: 'image', src: 'data:image/png;base64,AAAA' }
const vals = { counter: 2, branch: 'Counter 2' }

// Tags fill per counter, case-insensitive; size / weight kept; images pass through as is.
const out = fillBlocks([
  { type: 'text', text: 'Counter {counter}', size: 20, weight: 800 },
  { type: 'text', text: '{BRANCH} - Dubai Mall' },
  img,
], vals)
assert.deepEqual(out[0], { type: 'text', text: 'Counter 2', size: 20, weight: 800 })
assert.equal(out[1].text, 'Counter 2 - Dubai Mall')
assert.equal(out[2], img)

// Old headers: plain text and unknown {…} untouched.
assert.deepEqual(fillBlocks([{ type: 'text', text: 'Offer {50%} off' }, { type: 'text', text: 'Thank You' }], vals),
  [{ type: 'text', text: 'Offer {50%} off' }, { type: 'text', text: 'Thank You' }])

// A tag with no value drops its line (no dangling "Counter "), the other lines stay.
assert.deepEqual(fillBlocks([{ type: 'text', text: 'Counter {counter}' }, { type: 'text', text: 'Shop' }], { counter: '', branch: 'B' }),
  [{ type: 'text', text: 'Shop' }])
// Counter number 0 is a value.
assert.equal(fillBlocks([{ type: 'text', text: '{counter}' }], { counter: 0 })[0].text, '0')

// New setup prefill: branch line is the tag, not this counter's name as fixed text.
assert.deepEqual(blocksFromParams({}, 'header', { name: 'Shop', branch: 'Counter 2' }).map(b => b.text), ['Shop', '{branch}'])
// Saved lists come back untouched.
const saved = [{ type: 'text', text: 'Counter 2' }]
assert.deepEqual(blocksFromParams({ receipt_header_blocks: JSON.stringify(saved) }, 'header', {}), saved)

console.log('receiptBlocks tags ok')
