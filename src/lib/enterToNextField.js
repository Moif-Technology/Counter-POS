/**
 * Enter moves to the next field, in every form and popup (Tab already does).
 *
 * - Enter in a field jumps to the next field of the same form / popup and
 *   selects its text, so the cashier can type straight over it.
 * - Enter in the last field is left alone, so it still submits the form or
 *   confirms the popup as before.
 * - Fields that use Enter themselves (scan / search boxes with their own
 *   onKeyDown) keep their behaviour, as do multi-line text boxes.
 * - A field (or a parent) can opt out with data-enter-next="off".
 */

const FIELDS = [
  'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button])'
    + ':not([type=submit]):not([type=reset]):not([type=file]):not([type=range]):not([type=color])',
  'select',
  'textarea',
].join(',')

// The nearest form-like container: a <form>, a popup, or the screen.
const scopeOf = el => el.closest('form, [data-pos-overlay], [role="dialog"]') ?? document.body

const usable = el => !el.disabled && !el.readOnly && el.getClientRects().length > 0

/** Does React give this element its own key handler? Then Enter is its business. */
function handlesKeysItself(el) {
  const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$'))
  const props = propsKey ? el[propsKey] : null
  return !!(props && (props.onKeyDown || props.onKeyUp || props.onKeyPress))
}

function onKeyDown(e) {
  if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
  const el = e.target
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return
  if (!el.matches(FIELDS) || el.closest('[data-enter-next="off"]') || handlesKeysItself(el)) return

  const fields = [...scopeOf(el).querySelectorAll(FIELDS)].filter(usable)
  const next = fields[fields.indexOf(el) + 1]
  if (!next) return                       // last field: let Enter submit / confirm

  e.preventDefault()
  e.stopPropagation()                     // don't also trigger a popup's own "Enter = OK"
  next.focus()
  if (typeof next.select === 'function' && next.type !== 'number') next.select()
}

export function installEnterToNextField() {
  document.addEventListener('keydown', onKeyDown)
}
