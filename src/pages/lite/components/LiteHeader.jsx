import { ShoppingCart } from 'lucide-react'

export default function LiteHeader({ onExit }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'clamp(8px, 1.4vw, 12px) clamp(12px, 2vw, 18px)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShoppingCart size={16} color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'clamp(14px, 1.6vw, 17px)', fontWeight: 800, color: 'var(--text-1)' }}>MOIF POS · Lite</div>
          <div style={{ fontSize: 'clamp(10px, 0.9vw, 11px)', color: 'var(--text-3)' }}>Simplified billing mode</div>
        </div>
      </div>

      <button
        className="lite-btn"
        onClick={onExit}
        style={{
          padding: '10px 14px', borderRadius: 'var(--r-md)',
          border: '1.5px solid var(--border)', background: 'var(--surface)',
          color: 'var(--text-2)', fontSize: 'clamp(11px, 1.1vw, 12.5px)', fontWeight: 700, cursor: 'pointer',
          minHeight: 42,
        }}
      >
        Exit Lite Mode
      </button>
    </div>
  )
}
