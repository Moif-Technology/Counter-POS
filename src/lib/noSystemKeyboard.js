/**
 * The POS has its own on-screen keypads and keyboards, so the device's
 * system (soft) keyboard is turned off for every text field: when a field
 * gets focus it is given inputmode="none". The barcode scanner, a physical
 * keyboard and the on-screen keys still type into it.
 *
 * Fields that have no on-screen keyboard of their own (customer search,
 * passwords, setup…) opt back in with the `data-system-keyboard` attribute
 * on the field or any parent.
 */
function suppress(e) {
  const el = e.target
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
  if (el.closest('[data-system-keyboard]')) return
  if (!el.hasAttribute('inputmode')) el.setAttribute('inputmode', 'none')
}

export function installNoSystemKeyboard() {
  // pointerdown runs before the tap focuses the field; focusin covers focus from code
  document.addEventListener('pointerdown', suppress, true)
  document.addEventListener('focusin', suppress, true)
}
