import { ShoppingCart } from 'lucide-react'

export default function LiteHeader({ onExit }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderBottom: '1px solid var(--border)',
      background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShoppingCart size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)' }}>MOIF POS · Lite</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Simplified billing mode</div>
        </div>
      </div>

      <button
        className="lite-btn"
        onClick={onExit}
        style={{
          padding: '11px 18px', borderRadius: 'var(--r-md)',
          border: '1.5px solid var(--border)', background: 'var(--surface)',
          color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
          minHeight: 44,
        }}
      >
        Exit Lite Mode
      </button>
    </div>
  )
}
