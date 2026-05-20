import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

const MODES = [
  { key: 'CASH',   label: 'Cash',      icon: Banknote,   color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { key: 'CARD',   label: 'Card',      icon: CreditCard, color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { key: 'CREDIT', label: 'Credit',    icon: UserCheck,  color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { key: 'MULTI',  label: 'Multi Pay', icon: Layers,     color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
]

export default function PaymentButtons() {
  const paymentMode    = usePosStore(s => s.paymentMode)
  const netAmount      = usePosStore(s => s.netAmount)
  const setPaymentMode = usePosStore(s => s.setPaymentMode)
  const setPayment     = usePosStore(s => s.setPayment)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 5, padding: '8px 7px 6px' }}>
      {MODES.map(m => {
        const Icon   = m.icon
        const active = paymentMode === m.key
        return (
          <button
            key={m.key}
            onClick={() => {
              setPaymentMode(m.key)
              if (m.key === 'CASH' || m.key === 'CARD') setPayment(netAmount)
            }}
            style={{
              padding: '10px 6px', borderRadius: 'var(--r-md)',
              border: `1.5px solid ${active ? m.border : 'var(--border)'}`,
              background: active ? m.bg : 'var(--surface)',
              color: active ? m.color : 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontWeight: active ? 700 : 500, fontSize: 12,
              boxShadow: active ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
              transition: 'all 0.13s',
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.background    = m.bg
                e.currentTarget.style.color         = m.color
                e.currentTarget.style.borderColor   = m.border
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.background    = 'var(--surface)'
                e.currentTarget.style.color         = 'var(--text-2)'
                e.currentTarget.style.borderColor   = 'var(--border)'
              }
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Icon size={13} />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
