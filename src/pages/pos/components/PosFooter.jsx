export default function PosFooter() {
  return (
    <footer className="pos-footer">
      <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>
        Moif Technology — POS v2.0
      </span>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
          Currency: <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>AED</span>
        </span>
        <span style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />
          Ready
        </span>
      </div>
    </footer>
  )
}
