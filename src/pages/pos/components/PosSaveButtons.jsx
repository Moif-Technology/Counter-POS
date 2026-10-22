import { Save, Printer } from 'lucide-react'

/** Save / Bill & Print at the bottom of the POS right panel. */
export default function PosSaveButtons({ saving, onSave }) {
  return (
    <div className="pos-save-zone" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 8px 10px', flexShrink: 0 }}>
      <button
        disabled={saving}
        onClick={() => onSave(false)}
        style={{
          padding: '12px 0', borderRadius: 'var(--r-md)',
          border: '2px solid var(--brand-border)',
          background: 'var(--brand-bg)', color: 'var(--brand)',
          fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.12s', letterSpacing: 0.3, opacity: saving ? 0.6 : 1,
        }}
        onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--brand)' } }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.borderColor = 'var(--brand-border)' }}
        onMouseDown={e => { if (!saving) e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <Save size={18} /> {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        disabled={saving}
        onClick={() => onSave(true)}
        style={{
          padding: '12px 0', borderRadius: 'var(--r-md)',
          border: 'none',
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          color: '#fff',
          fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 14px rgba(120,8,41,0.25)',
          transition: 'all 0.12s', letterSpacing: 0.3, opacity: saving ? 0.6 : 1,
        }}
        onMouseEnter={e => { if (!saving) { e.currentTarget.style.boxShadow = '0 6px 20px rgba(120,8,41,0.38)'; e.currentTarget.style.opacity = '0.93' } }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(120,8,41,0.25)'; e.currentTarget.style.opacity = saving ? '0.6' : '1' }}
        onMouseDown={e => { if (!saving) e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <Printer size={18} /> Bill &amp; Print
      </button>
    </div>
  )
}
