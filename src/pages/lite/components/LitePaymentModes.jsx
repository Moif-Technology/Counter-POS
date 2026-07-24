import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { PM } from '../../../lib/paymentModes'

export const PAYMENT_MODES = [
  { key: PM.CASH,         label: 'Cash',     icon: Banknote },
  { key: PM.CREDITCARD,   label: 'Card',     icon: CreditCard },
  { key: PM.CREDIT,       label: 'Credit',   icon: UserCheck },
  { key: PM.MULTIPAYMENT, label: 'Multi',    icon: Layers },
]

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
                padding: '9px 2px', minHeight: 46, borderRadius: 'var(--r-md)',
                border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                background: active ? 'var(--brand-bg)' : 'var(--surface)',
                color: active ? 'var(--brand)' : 'var(--text-3)',
                cursor: 'pointer', fontSize: 10, fontWeight: active ? 800 : 600,
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
