// Soft-UI (neumorphism) button styling shared by Numpad, Keyboard and the
// Lite POS keypads.

export const NEU_RAISED  = '4px 4px 8px rgba(0,0,0,0.10), -4px -4px 8px rgba(255,255,255,0.75)'
export const NEU_PRESSED = 'inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.6)'

export function neuPress(e, scale = 0.97) {
  e.currentTarget.style.boxShadow = NEU_PRESSED
  e.currentTarget.style.transform = `scale(${scale})`
}

export function neuRelease(e) {
  e.currentTarget.style.boxShadow = NEU_RAISED
  e.currentTarget.style.transform = 'scale(1)'
}
