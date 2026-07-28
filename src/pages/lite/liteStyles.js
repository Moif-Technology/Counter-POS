export const thStyle = { padding: '10px 6px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 0.4 }
export const tdStyle = { padding: '14px 6px', textAlign: 'center', color: 'var(--text-1)' }
export const qtyBtnStyle = {
  width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text-1)', cursor: 'pointer', fontSize: 17,
  lineHeight: 1, touchAction: 'manipulation',
}
export const removeBtnStyle = {
  border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16,
  width: 36, height: 36, touchAction: 'manipulation',
}
export function groupChipStyle(active) {
  return {
    padding: '8px 13px', borderRadius: 999, minHeight: 34,
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-2)',
    fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}
