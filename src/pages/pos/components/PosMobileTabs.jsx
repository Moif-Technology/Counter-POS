import { ShoppingCart, Wallet } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { fmtMoney } from '../../../lib/currencyFormat'

/** Items / Pay tab bar — only visible on phones (≤640px, see .pos-mobile-tabs in index.css). */
export default function PosMobileTabs({ activeTab, onChange }) {
  const itemCount = usePosStore(s => s.cartItems.length)
  const netAmount = usePosStore(s => s.netAmount)

  const tabs = [
    { key: 'items', icon: ShoppingCart, label: `Items${itemCount ? ` (${itemCount})` : ''}` },
    { key: 'pay',   icon: Wallet,       label: `Pay · ${fmtMoney(netAmount)}` },
  ]

  return (
    <div className="pos-mobile-tabs" data-pos-skip-refocus>
      {tabs.map(t => {
        const active = activeTab === t.key
        const Icon = t.icon
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              flex: 1, padding: '10px 4px', border: 'none',
              borderTop: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
              background: active ? 'var(--brand-bg)' : 'transparent',
              color: active ? 'var(--brand)' : 'var(--text-3)',
              fontSize: 13, fontWeight: active ? 800 : 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <Icon size={15} /> {t.label}
          </button>
        )
      })}
    </div>
  )
}
