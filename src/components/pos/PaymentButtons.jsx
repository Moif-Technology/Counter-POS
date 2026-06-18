import { useState } from 'react'
import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import CreditCustomerModal from '../popup/CreditCustomerModal'

const MODES = [
  { key: 'CASH',   label: 'Cash',      icon: Banknote,   feature: 'pos.settlement.cash',   color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { key: 'CARD',   label: 'Card',      icon: CreditCard, feature: 'pos.settlement.card',   color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { key: 'CREDIT', label: 'Credit',    icon: UserCheck,  feature: 'pos.settlement.credit', color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { key: 'MULTI',  label: 'Multi Pay', icon: Layers,     feature: 'pos.split_payment',     color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
]

/* Compact payment-mode strip — modes show only when the company's
   plan/software type enables the matching settlement feature */
export default function PaymentButtons() {
  const [showCreditModal, setShowCreditModal] = useState(false)
  const paymentMode    = usePosStore(s => s.paymentMode)
  const netAmount      = usePosStore(s => s.netAmount)
  const setPaymentMode = usePosStore(s => s.setPaymentMode)
  const setPayment     = usePosStore(s => s.setPayment)
  const setCustomer    = usePosStore(s => s.setCustomer)
  const handleCreditApply = (c) => {
    setCustomer(c.customerId, c.customerName, c.customerCode, c.paymentMode, c.osAmount)
    setPaymentMode('CREDIT')
  }

  const visibleModes = MODES

  return (
    <>
    {showCreditModal && (
      <CreditCustomerModal
        onClose={() => setShowCreditModal(false)}
        onApply={handleCreditApply}
      />
    )}
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(visibleModes.length, 1)},1fr)`, gap: 5, padding: '6px 8px' }}>
      {visibleModes.map(m => {
        const Icon   = m.icon
        const active = paymentMode === m.key
        return (
          <button
            key={m.key}
            onClick={() => {
              if (m.key === 'CREDIT') { setShowCreditModal(true); return }
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
    </>
  )
}
