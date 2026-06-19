import { useEffect } from 'react'
import { usePosStore } from '../store/posStore'

/** Apply one numpad key to the active POS buffer (qty or barcode). */
export function applyPosNumpadKey(key) {
  const state = usePosStore.getState()
  if (state.inputMode === 'qty') {
    const p = state.qtyBuffer
    let next
    if (key === '00') next = p === '0' ? '0' : p + '00'
    else if (key === '.' && p.includes('.')) next = p
    else if (!state.isReturnContext() && p === '1' && key !== '.') next = key
    else next = p + key
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

export function togglePosQtyMode() {
  const state = usePosStore.getState()
  const val = state.barcodeBuffer.trim()
  const isReturn = state.isReturnContext()
  const n = Number(val)
  if (val && !Number.isNaN(n) && (isReturn ? n !== 0 : n > 0)) {
    const signed = isReturn && n > 0 ? String(-n) : String(n)
    usePosStore.setState({ qtyBuffer: signed, inputMode: 'barcode' })
    state.setBarcodeBuffer('')
  } else {
    usePosStore.setState({ inputMode: 'qty' })
  }
}

function shouldIgnorePosNumpadKeyboard(e) {
  const t = e.target
  if (!(t instanceof Element)) return true
  if (t.closest('[data-pos-overlay]')) return true
  if (t.closest('[data-pos-customer-dropdown]')) return true
  if (t.closest('[data-pos-barcode-input]')) return true
  return false
}

/** Physical keyboard support for main POS numpad (when not typing in another field). */
export function usePosNumpadKeyboard(onEnter, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined

    const onKeyDown = (e) => {
      if (!enabled || e.ctrlKey || e.metaKey || e.altKey) return
      if (shouldIgnorePosNumpadKeyboard(e)) return

      if (e.key === 'Enter') {
        e.preventDefault()
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
        applyPosNumpadKey(e.key)
        return
      }
      if (e.key === '.' || e.key === 'Decimal') {
        e.preventDefault()
        applyPosNumpadKey('.')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onEnter, enabled])
}

/** Apply a key to a string amount buffer (touch + keyboard settlement fields). */
export function applyAmountKey(current, key) {
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
