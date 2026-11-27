/**
 * Code 39 SVG barcode for thermal receipts (no external deps).
 * Includes start/stop * — required for scanners to read the symbol.
 *
 * Document slips encode prefix + number (e.g. B-14, see formatDocBarcode).
 */

const CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*'

// Same order as CODE39_CHARS. Element order: bar, space, bar, … (9 elements, 3 wide).
const CODE39_PATTERNS = [
  'nnnwwnwnn', 'wnnwnnnnw', 'nnwwnnnnw', 'wnwwnnnnn', 'nnnwwnnnw',
  'wnnwwnnnn', 'nnwwwnnnn', 'nnnwnnwnw', 'wnnwnnwnn', 'nnwwnnwnn',
  'wnnnnwnnw', 'nnwnnwnnw', 'wnwnnwnnn', 'nnnnwwnnw', 'wnnnwwnnn',
  'nnwnwwnnn', 'nnnnnwwnw', 'wnnnnwwnn', 'nnwnnwwnn', 'nnnnwwwnn',
  'wnnnnnnww', 'nnwnnnnww', 'wnwnnnnwn', 'nnnnwnnww', 'wnnnwnnwn',
  'nnwnwnnwn', 'nnnnnnwww', 'wnnnnnwwn', 'nnwnnnwwn', 'nnnnwnwwn',
  'wwnnnnnnw', 'nwwnnnnnw', 'wwwnnnnnn', 'nwnnwnnnw', 'wwnnwnnnn',
  'nwwnwnnnn', 'nwnnnnwnw', 'wwnnnnwnn', 'nwwnnnwnn', 'nwnwnwnnn',
  'nwnwnnnwn', 'nwnnnwnwn', 'nnnwnwnwn', 'nwnnwnwnn', // … $ / + % *
]

/** Narrow bar width in SVG user units (3:1 wide:narrow ratio per Code 39). */
const NARROW = 3
const WIDE = 9
/** Inter-character gap — one narrow element. */
const INTER_CHAR = NARROW
/** Quiet zone — 10× narrow minimum each side. */
const QUIET = NARROW * 12

function encodeCode39(text) {
  const upper = String(text ?? '').toUpperCase()
  if (!upper) throw new Error('Barcode text required')
  for (const ch of upper) {
    if (CODE39_CHARS.indexOf(ch) < 0) throw new Error(`Unsupported barcode character: ${ch}`)
  }
  return `*${upper}*`
}

function patternToBars(pattern, x, barHeight, narrow, wide) {
  let bars = ''
  let cursor = x
  let isBar = true
  for (const token of pattern) {
    const width = token === 'w' ? wide : narrow
    if (isBar) {
      bars += `<rect x="${cursor}" y="0" width="${width}" height="${barHeight}" fill="#000"/>`
    }
    cursor += width
    isBar = !isBar
  }
  return { bars, width: cursor - x }
}

/**
 * @param {string} text — padded numeric payload (e.g. 000014)
 * @param {{ height?: number, printWidthMm?: number }} [opts]
 */
export function buildCode39Svg(text, opts = {}) {
  const barHeight = opts.height ?? 64
  const printWidthMm = opts.printWidthMm ?? 68
  const encoded = encodeCode39(text)

  let x = QUIET
  let inner = ''
  for (let i = 0; i < encoded.length; i += 1) {
    const ch = encoded[i]
    const idx = CODE39_CHARS.indexOf(ch)
    if (idx < 0) continue
    const { bars, width } = patternToBars(CODE39_PATTERNS[idx], x, barHeight, NARROW, WIDE)
    inner += bars
    x += width
    if (i < encoded.length - 1) x += INTER_CHAR
  }
  x += QUIET

  const totalWidth = x
  const printHeightMm = Math.max(12, (barHeight / totalWidth) * printWidthMm)

  return `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${totalWidth} ${barHeight}"
    width="${printWidthMm}mm"
    height="${printHeightMm.toFixed(1)}mm"
    role="img"
    aria-label="${text}"
    preserveAspectRatio="xMidYMid meet"
    style="shape-rendering:crispEdges;display:block;margin:0 auto">${inner}</svg>`
}
