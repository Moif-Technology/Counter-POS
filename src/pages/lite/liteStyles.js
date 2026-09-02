export const thStyle = {
  padding: 'clamp(6px, 1.1vh, 9px) 6px', textAlign: 'center', fontSize: 'clamp(9px, 0.75vw, 10.5px)', fontWeight: 600, letterSpacing: 0.3,
  color: 'var(--text-3)', textTransform: 'uppercase',
}
export const tdStyle = {
  padding: 'clamp(8px, 1.7vh, 14px) 6px', textAlign: 'center', color: 'var(--text-1)', fontSize: 'clamp(11px, 0.9vw, 13px)',
}
export const qtyBtnStyle = {
  width: 'clamp(28px, 2vw, 36px)', height: 'clamp(28px, 2vw, 36px)', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text-1)', cursor: 'pointer', fontSize: 'clamp(14px, 1.2vw, 17px)',
  lineHeight: 1, touchAction: 'manipulation',
}
export const removeBtnStyle = {
  border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 'clamp(14px, 1vw, 16px)',
  width: 'clamp(28px, 2vw, 36px)', height: 'clamp(28px, 2vw, 36px)', touchAction: 'manipulation',
}
const NEU_CHIP_RAISED = '3px 3px 6px rgba(0,0,0,0.10), -3px -3px 6px rgba(255,255,255,0.75)'
const NEU_CHIP_PRESSED = 'inset 2px 2px 4px rgba(0,0,0,0.12), inset -2px -2px 4px rgba(255,255,255,0.6)'

/** Neumorphic pill chip — flush with the panel background; the active chip is
 *  clearly highlighted with a brand-tinted fill + pressed-in inset shadow. */
export function groupChipStyle(active) {
  return {
    padding: 'clamp(5px, 1vh, 8px) 13px', borderRadius: 999, minHeight: 'clamp(28px, 4.5vh, 34px)',
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand-bg)' : 'var(--surface-2)',
    boxShadow: active ? NEU_CHIP_PRESSED : NEU_CHIP_RAISED,
    color: active ? 'var(--brand)' : 'var(--text-2)',
    fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'box-shadow 0.1s, color 0.1s, background 0.1s',
  }
}
