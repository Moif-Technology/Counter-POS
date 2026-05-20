import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

const MODES = [
  { key: 'CASH',   label: 'Cash',     icon: Banknote,    color: 'var(--green)',  bg: 'var(--green-bg)',  border: '#bbf7d0' },
  { key: 'CARD',   label: 'Card',     icon: CreditCard,  color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: '#bfdbfe' },
  { key: 'CREDIT', label: 'Credit',   icon: UserCheck,   color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: '#fde68a' },
  { key: 'MULTI',  label: 'Multi Pay',icon: Layers,      color: 'var(--purple)', bg: 'var(--purple-bg)', border: '#ddd6fe' },
]

export default function PaymentButtons() {
  const paymentMode = usePosStore(s => s.paymentMode)
  const netAmount = usePosStore(s => s.netAmount)
  const setPaymentMode = usePosStore(s => s.setPaymentMode)
  const setPayment = usePosStore(s => s.setPayment)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, padding: '8px 8px 4px' }}>
      {MODES.map(m => {
        const Icon = m.icon
        const active = paymentMode === m.key
        return (
          <button
            key={m.key}
            onClick={() => {
              setPaymentMode(m.key)
              if (m.key === 'CASH' || m.key === 'CARD') setPayment(netAmount)
            }}
            style={{
              padding: '11px 8px', borderRadius: 10,
              border: `1.5px solid ${active ? m.border : 'var(--border)'}`,
              background: active ? m.bg : 'var(--surface)',
              color: active ? m.color : 'var(--text-2)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 7, fontWeight: active ? 700 : 500,
              fontSize: 12, transition: 'all 0.15s',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = m.bg; e.currentTarget.style.color = m.color; e.currentTarget.style.borderColor = m.border } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)' } }}
          >
            <Icon size={14} />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
