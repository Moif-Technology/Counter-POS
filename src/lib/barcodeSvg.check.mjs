// Self-check for the Code 39 table in barcodeSvg.js: `node src/lib/barcodeSvg.check.mjs`
// Reference is built from the spec rule (2-of-5 bars per column + wide-space position per group),
// not copied from the table, so a typo in either shows up. Verified against JsBarcode 2026-11-18.
import assert from 'node:assert/strict'
import { buildCode39Svg } from './barcodeSvg.js'

const BARS = ['10001', '01001', '11000', '00101', '10100', '01100', '00011', '10010', '01010', '00110']
const GROUPS = [['1234567890', 1], ['ABCDEFGHIJ', 2], ['KLMNOPQRST', 3], ['UVWXYZ-. *', 0]]
const ref = { $: 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn' }
for (const [chars, wide] of GROUPS) {
  ;[...chars].forEach((ch, i) => {
    let p = ''
    for (let k = 0; k < 5; k++) p += (BARS[i][k] === '1' ? 'w' : 'n') + (k < 4 ? (k === wide ? 'w' : 'n') : '')
    ref[ch] = p
  })
}

// SVG rects -> element widths (n/w), gaps included, start at first bar.
function elements(svg) {
  const rects = [...svg.matchAll(/<rect x="(\d+)" y="0" width="(\d+)"/g)].map(m => [+m[1], +m[2]])
  const out = []
  let cur = rects[0][0]
  for (const [x, w] of rects) {
    if (x > cur) out.push(x - cur)
    out.push(w)
    cur = x + w
  }
  return out.map(u => (u === 3 ? 'n' : 'w')).join('')
}

const text = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'
const expected = ['*', ...text, '*'].map(ch => ref[ch]).join('n')   // 'n' = inter-character gap
assert.equal(elements(buildCode39Svg(text)), expected)
console.log('barcodeSvg Code 39 table OK')
