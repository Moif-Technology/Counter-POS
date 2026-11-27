/**
 * Receipt header / footer (Control Panel): a plain list of
 *   { type: 'text',  text, size?, weight? }   a line (long lines wrap); size px / weight 400–800 optional
 *   { type: 'image', src }                    logo / banner / QR (PNG/JPEG data URL)
 * Default look: first header line large, everything else bold, all centred.
 *
 * The list is drawn into one printer-width image (576 dots = 72 mm) when a bill prints, and every
 * platform prints that image — Arabic and layout match on Windows, browser and Sunmi, and the
 * Control Panel preview is the same drawing. Server rules: api/src/pos/counter-pos/services/counter.service.js.
 */

export const PAPER_DOTS = 576
export const MAX_BLOCKS = 10
export const TEXT_MAX = 80
export const DEFAULT_FOOTER = 'Thank You......Visit Again'
const IMAGE_MAX_CHARS = 250000   // one uploaded image (server limit)
const MAX_HEIGHT = 1600          // dots ≈ 20 cm
const GAP = 8
const BIG_LINE = { px: 32, weight: 800 }
const LINE = { px: 24, weight: 700 }
/** Printer dots per CSS px (72 mm = 576 dots = 272 px) — line sizes show in the same px as bill fields. */
const DOTS_PER_PX = PAPER_DOTS / 272
export const LINE_SIZE = { min: 8, max: 40 }
export const LINE_WEIGHT = { min: 400, max: 800, step: 100 }

export const textBlock = (text = '') => ({ type: 'text', text })

/**
 * Tags a header / footer line can hold — filled in on the printing device, so one saved header
 * prints each counter's own value ("Counter {counter}" → "Counter 2"). Control Panel offers a
 * button for {counter}; {branch} is the default header's branch line.
 */
export const COUNTER_LINE = 'Counter {counter}'
const TOKEN_RE = /\{(counter|branch)\}/gi

/**
 * Blocks with tags replaced by values { counter, branch }. A line whose tag has no value is
 * dropped (no dangling "Counter "). Other {…} text and lines without tags are left as they are.
 */
export function fillBlocks(blocks = [], values = {}) {
  return blocks.flatMap(b => {
    if (b?.type === 'image') return [b]
    let missing = false
    const text = String(b?.text ?? '').replace(TOKEN_RE, (_, k) => {
      const v = String(values[k.toLowerCase()] ?? '').trim()
      if (!v) missing = true
      return v
    })
    return missing ? [] : [{ ...b, text }]
  })
}

const clamp = (v, { min, max, step = 1 }) => Math.max(min, Math.min(max, Math.round(v / step) * step))

/**
 * A text line's style: { size (px), weight, dots }. Optional block.size / block.weight (Control Panel
 * steppers) override the fixed look — first header line large, the rest bold.
 */
export function lineStyle(b, big = false) {
  const base = big ? BIG_LINE : LINE
  const size = Number.isFinite(b?.size) ? clamp(b.size, LINE_SIZE) : Math.round(base.px / DOTS_PER_PX)
  return {
    size,
    weight: Number.isFinite(b?.weight) ? clamp(b.weight, LINE_WEIGHT) : base.weight,
    dots: Number.isFinite(b?.size) ? Math.round(size * DOTS_PER_PX) : base.px,
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = src
  })
}

/**
 * Uploaded file → greyscale image on white (transparent PNG would print black), sized to print as is.
 * ponytail: fixed size rule instead of a width setting — wide banners up to full paper width,
 * logos / QR codes up to 2/3 width (48 mm).
 */
export async function fileToReceiptImage(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose a PNG or JPG image')
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const maxW = img.width / img.height >= 2.5 ? PAPER_DOTS : 384
    const scale = Math.min(1, maxW / img.width, 320 / img.height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.filter = 'grayscale(1)'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    let data = canvas.toDataURL('image/png')
    if (data.length > IMAGE_MAX_CHARS) data = canvas.toDataURL('image/jpeg', 0.85)
    if (data.length > IMAGE_MAX_CHARS) throw new Error('Image is too detailed to print — try a simpler one')
    return data
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Word-wrap to the paper width; a single over-long word is split by characters. */
function wrapText(ctx, text, width) {
  const lines = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width <= width) { line = next; continue }
      if (line) lines.push(line)
      line = word
      while (ctx.measureText(line).width > width && line.length > 1) {
        let cut = line.length - 1
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > width) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

/** Draw blocks into one printer-width PNG data URL; '' when nothing printable. bigFirstLine: header. */
export async function renderBlocks(blocks, { bigFirstLine = false } = {}) {
  if (!blocks?.length) return ''
  if (document.fonts?.load) {
    await Promise.all(['400', '500', '600', '700', '800'].map(w => document.fonts.load(`${w} 24px Sora`).catch(() => null)))
  }
  const images = await Promise.all(blocks.map(b => (b.type === 'image' && b.src ? loadImage(b.src).catch(() => null) : null)))
  const measure = document.createElement('canvas').getContext('2d')

  let firstText = bigFirstLine
  const items = blocks.map((b, i) => {
    if (b.type === 'image') {
      const img = images[i]
      if (!img) return null
      const dw = Math.min(img.width, PAPER_DOTS)
      const dh = Math.max(1, Math.round(img.height * (dw / img.width)))
      return { img, dw, dh, h: dh }
    }
    const text = String(b.text ?? '').trim()
    if (!text) return null
    // Bold by default: thin strokes print faint on thermal paper.
    const { dots: px, weight } = lineStyle(b, firstText)
    firstText = false
    const font = `${weight} ${px}px Sora, system-ui, sans-serif`
    measure.font = font
    const lines = wrapText(measure, text, PAPER_DOTS)
    const lh = Math.round(px * 1.3)
    return { font, px, lines, lh, h: lines.length * lh }
  }).filter(Boolean)
  if (!items.length) return ''

  const height = items.reduce((s, it) => s + it.h, 0) + GAP * (items.length - 1)
  if (height > MAX_HEIGHT) throw new Error('Header / footer is too tall — remove a line or an image')

  const canvas = document.createElement('canvas')
  canvas.width = PAPER_DOTS
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, PAPER_DOTS, height)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'
  let y = 0
  for (const it of items) {
    if (it.img) {
      ctx.filter = 'grayscale(1)'
      ctx.drawImage(it.img, Math.round((PAPER_DOTS - it.dw) / 2), y, it.dw, it.dh)
      ctx.filter = 'none'
    } else {
      ctx.font = it.font
      it.lines.forEach((line, k) => ctx.fillText(line, PAPER_DOTS / 2, y + k * it.lh + Math.round((it.lh - it.px) / 2)))
    }
    y += it.h + GAP
  }
  return canvas.toDataURL('image/png')
}

/**
 * Lines for the editor: saved list; else the old Heading 1–5 / Footer 1–2; else what the receipt
 * prints today (company name, branch, phone, address / thank-you line) as editable text.
 * The branch line is the {branch} tag — saved company-wide, it still prints each counter's own branch.
 * co: { name, branch, phone, address } of this counter.
 */
export function blocksFromParams(p = {}, which, co = {}) {
  const raw = String(p[`receipt_${which}_blocks`] ?? '').trim()
  if (raw) {
    try {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) return list
    } catch { /* fall through */ }
  }
  const legacy = (which === 'header' ? [1, 2, 3, 4, 5] : [6, 7])
    .map(n => String(p[`heading${n}_counter`] ?? '').trim())
    .filter(Boolean)
  if (legacy.length) return legacy.map(textBlock)
  const today = which === 'header'
    ? [co.name, co.branch && '{branch}', co.phone && `Ph: ${co.phone}`, co.address]
    : [DEFAULT_FOOTER]
  return today.filter(Boolean).map(textBlock)
}
