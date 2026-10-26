import { useEffect } from 'react'
import { usePosStore } from '../store/posStore'
import { focusBarcodeScan } from './posFocus'

const MAX_QTY_CHARS = 6

/** Apply one numpad key to the active POS buffer (qty or barcode). 'C' clears that buffer. */
export function applyPosNumpadKey(key) {
  const state = usePosStore.getState()
  if (key === 'C') {
    if (state.inputMode === 'qty') usePosStore.setState({ qtyBuffer: '' })
    else state.setBarcodeBuffer('')
    return
  }
  if (state.inputMode === 'qty') {
    const p = state.qtyBuffer
    let next
    if (key === '00') next = p === '0' ? '0' : p + '00'
    else if (key === '.' && p.includes('.')) next = p
    else next = p + key
    if (next.replace('-', '').length > MAX_QTY_CHARS) return   // no runaway qty
    usePosStore.setState({ qtyBuffer: next })
  } else {
    state.setBarcodeBuffer(state.barcodeBuffer + key)
  }
}

export function applyPosNumpadBackspace() {
  const state = usePosStore.getState()
  if (state.inputMode === 'qty') {
    const p = state.qtyBuffer
    const next = p.slice(0, -1)
    usePosStore.setState({
      qtyBuffer: !next || next === '-' ? state.defaultQtyBuffer() : next,
    })
  } else {
    state.setBarcodeBuffer(p => p.slice(0, -1))
  }
}

/**
 * Qty key. First press: start typing a qty (the next numpad keys set it).
 * Second press, or ENTER: finish the qty and go back to the search box, so the
 * next scan is added at that qty. With a number already typed in the search
 * box, that number becomes the qty straight away.
 */
export function togglePosQtyMode() {
  let state = usePosStore.getState()
  if (state.inputMode === 'qty' && !state.returnMode) {
    finishPosQtyEntry()
    return
  }
  // Qty is for sales only: leave return mode (and any return qty being typed) first.
  if (state.returnMode) {
    state.toggleReturn()
    usePosStore.setState({ inputMode: 'barcode', qtyBuffer: '1' })
    state = usePosStore.getState()
  }
  const val = state.barcodeBuffer.trim()
  const isReturn = state.isReturnContext()
  const n = Number(val)
  if (val && !Number.isNaN(n) && (isReturn ? n !== 0 : n > 0)) {
    const signed = isReturn && n > 0 ? String(-n) : String(n)
    usePosStore.setState({ qtyBuffer: signed, inputMode: 'barcode' })
    state.setBarcodeBuffer('')
    focusBarcodeScan()
  } else {
    usePosStore.setState({ inputMode: 'qty', qtyBuffer: '' })   // typing replaces the old qty
  }
}

/**
 * Return key — works like Qty, but kept separate from it. Off → return mode on
 * and start typing the return qty (any sale qty being typed is dropped; ENTER
 * finishes). The next item added is returned with it, then return switches
 * itself off (see endOneShotReturn). On → return mode off, back to sale.
 */
export function togglePosReturnMode() {
  const state = usePosStore.getState()
  state.toggleReturn()
  if (usePosStore.getState().returnMode) {
    usePosStore.setState({ inputMode: 'qty', qtyBuffer: '' })
  } else {
    usePosStore.setState({ inputMode: 'barcode', qtyBuffer: '1' })   // back to sale, qty 1
    focusBarcodeScan()
  }
}

/** Return is one item at a time, like Qty: after an item is added, go back to sale (qty 1). */
export function endOneShotReturn() {
  if (usePosStore.getState().returnMode) usePosStore.setState({ returnMode: false, qtyBuffer: '1' })
}

/** Leave qty entry: keep a valid typed qty (or fall back to the default) and refocus the search box. */
export function finishPosQtyEntry() {
  const state = usePosStore.getState()
  const n = parseFloat(state.qtyBuffer)
  const valid = Number.isFinite(n) && n !== 0
  usePosStore.setState({
    qtyBuffer: valid ? String(state.parseScanQty(state.qtyBuffer)) : state.defaultQtyBuffer(),
    inputMode: 'barcode',
  })
  focusBarcodeScan()
}

function shouldIgnorePosNumpadKeyboard(e) {
  const t = e.target
  if (!(t instanceof Element)) return true
  if (t.closest('[data-pos-overlay]')) return true
  if (t.closest('[data-pos-customer-dropdown]')) return true
  if (t.closest('[data-pos-barcode-input]')) return true
  return false
}

// A barcode scanner types a few ms per key; a person needs ~80 ms or more.
const SCAN_GAP_MS = 50

/**
 * Physical keyboard support for main POS numpad (when not typing in another field).
 * While a qty / return qty is being typed, a burst of very fast keys is a
 * barcode scan: the qty typed so far is kept and the burst goes to the search
 * box, so the cashier can press Qty / Return, (type a qty,) and just scan.
 */
export function usePosNumpadKeyboard(onEnter, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined
    let lastAt = -Infinity       // time of the previous key
    let lastQtyKey = null        // previous key, if it went into the qty
    let qtyBeforeLast = ''       // qty before that key

    const typeKey = (key, at) => {
      const state = usePosStore.getState()
      const burst = at - lastAt < SCAN_GAP_MS
      lastAt = at
      if (state.inputMode === 'qty' && burst && lastQtyKey != null) {
        // Scanner: take the previous key back out of the qty, keep the qty, start the barcode.
        usePosStore.setState({ qtyBuffer: qtyBeforeLast })
        finishPosQtyEntry()
        usePosStore.getState().setBarcodeBuffer(lastQtyKey + key)
        lastQtyKey = null
        return
      }
      if (state.inputMode === 'qty') { qtyBeforeLast = state.qtyBuffer; lastQtyKey = key }
      else lastQtyKey = null
      applyPosNumpadKey(key)
    }

    const onKeyDown = (e) => {
      if (!enabled || e.ctrlKey || e.metaKey || e.altKey) return
      if (shouldIgnorePosNumpadKeyboard(e)) return

      if (e.key === 'Enter') {
        e.preventDefault()
        lastQtyKey = null
        onEnter?.()
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        applyPosNumpadBackspace()
        return
      }
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        typeKey(e.key, e.timeStamp)
        return
      }
      if (e.key === '.' || e.key === 'Decimal') {
        e.preventDefault()
        typeKey('.', e.timeStamp)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onEnter, enabled])
}

/** Apply a key to a string amount buffer (touch + keyboard settlement fields). */
/**
 * Apply a Numpad key to a numeric string value.
 *   setQty(v => applyAmountKey(v, key))
 * Handles digits, '.', '⌫'/'Backspace' and 'C' (clear).
 */
export function applyAmountKey(current, key) {
  if (key === 'C') return ''
  if (key === '⌫' || key === 'Backspace') return current.slice(0, -1)
  if (key === '.') {
    if (current.includes('.')) return current
    return current ? `${current}.` : '0.'
  }
  if (/^\d$/.test(key)) return current + key
  return current
}

export function useAmountNumpadKeyboard(setAmountStr, { onEnter, enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return

      if (e.key === 'Enter') {
        e.preventDefault()
        onEnter?.()
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        setAmountStr(v => applyAmountKey(v, '⌫'))
        return
      }
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        setAmountStr(v => applyAmountKey(v, e.key))
        return
      }
      if (e.key === '.' || e.key === 'Decimal') {
        e.preventDefault()
        setAmountStr(v => applyAmountKey(v, '.'))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setAmountStr, onEnter, enabled])
}
