import BrandLogo from '../../../components/common/BrandLogo'

export default function LiteHeader({ onExit }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'clamp(8px, 1.4vw, 12px) clamp(12px, 2vw, 18px)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <BrandLogo variant="horizontal" height={40} />
        <span style={{
          padding: '3px 9px', borderRadius: 99,
          background: 'var(--brand-bg)', border: '1px solid var(--brand-border)',
          color: 'var(--brand)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}>
          Lite
        </span>
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
