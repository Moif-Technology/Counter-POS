import { fmtMoney } from '../../../lib/currencyFormat'

/** Bottom tab bar — only visible ≤720px (see .lite-mobile-tabs in lite.css). */
export default function LiteMobileTabs({ activeTab, onChange, itemCount, total }) {
  const tabs = [
    { key: 'search', label: 'Items' },
    { key: 'cart', label: `Cart${itemCount ? ` (${itemCount})` : ''}` },
    { key: 'bill', label: `Pay · ${fmtMoney(total)}` },
  ]

  return (
    <div className="lite-mobile-tabs" style={{
      flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--surface)',
    }}>
      {tabs.map(t => {
        const active = activeTab === t.key
        return (
          <button
            key={t.key}
            className="lite-btn"
            onClick={() => onChange(t.key)}
            style={{
              flex: 1, padding: '11px 4px', border: 'none',
              borderTop: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
              background: active ? 'var(--brand-bg)' : 'transparent',
              color: active ? 'var(--brand)' : 'var(--text-3)',
              fontSize: 12, fontWeight: active ? 800 : 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
