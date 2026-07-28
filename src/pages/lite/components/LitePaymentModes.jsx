import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { PM } from '../../../lib/paymentModes'

export const PAYMENT_MODES = [
  { key: PM.CASH,         label: 'Cash',     icon: Banknote },
  { key: PM.CREDITCARD,   label: 'Card',     icon: CreditCard },
  { key: PM.CREDIT,       label: 'Credit',   icon: UserCheck },
  { key: PM.MULTIPAYMENT, label: 'Multi',    icon: Layers },
]

const NEU_RAISED = '4px 4px 8px rgba(0,0,0,0.10), -4px -4px 8px rgba(255,255,255,0.75)'
const NEU_PRESSED = 'inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.6)'

export default function LitePaymentModes({ paymentMode, onSelect }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
        Payment
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
        {PAYMENT_MODES.map(({ key, label, icon: Icon }) => {
          const active = paymentMode === key
          return (
            <button
              key={key}
              className="lite-btn"
              onClick={() => onSelect(key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '9px 2px', minHeight: 46, borderRadius: 12,
                border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                background: active ? 'var(--brand-bg)' : 'var(--surface-2)',
                boxShadow: active ? NEU_PRESSED : NEU_RAISED,
                color: active ? 'var(--brand)' : 'var(--text-3)',
                cursor: 'pointer', fontSize: 10, fontWeight: active ? 800 : 600,
                transition: 'box-shadow 0.1s, color 0.1s, background 0.1s',
              }}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
