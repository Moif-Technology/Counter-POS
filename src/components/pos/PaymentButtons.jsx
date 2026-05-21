import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

const MODES = [
  { key: 'CASH',   label: 'Cash',      icon: Banknote,   color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { key: 'CARD',   label: 'Card',      icon: CreditCard, color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { key: 'CREDIT', label: 'Credit',    icon: UserCheck,  color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { key: 'MULTI',  label: 'Multi Pay', icon: Layers,     color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
]

/* Compact 4-button strip — kept for standalone use if needed */
export default function PaymentButtons() {
  const paymentMode    = usePosStore(s => s.paymentMode)
  const netAmount      = usePosStore(s => s.netAmount)
  const setPaymentMode = usePosStore(s => s.setPaymentMode)
  const setPayment     = usePosStore(s => s.setPayment)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, padding: '6px 8px' }}>
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
              padding: '9px 4px', borderRadius: 'var(--r-md)',
              border: `1.5px solid ${active ? m.border : 'var(--border)'}`,
              background: active ? m.bg : 'var(--surface)',
              color: active ? m.color : 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, fontWeight: active ? 800 : 600, fontSize: 10,
              boxShadow: active ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
              transition: 'all 0.13s',
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.background  = m.bg
                e.currentTarget.style.color       = m.color
                e.currentTarget.style.borderColor = m.border
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.background  = 'var(--surface)'
                e.currentTarget.style.color       = 'var(--text-2)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Icon size={14} />
            <span style={{ lineHeight: 1.1, textAlign: 'center' }}>{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}
