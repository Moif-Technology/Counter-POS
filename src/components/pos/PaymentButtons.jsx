import { useState } from 'react'
import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import CreditCustomerModal from '../popup/CreditCustomerModal'
import MultiPaymentModal from '../popup/MultiPaymentModal'
import { closeAndFocusBarcode } from '../../lib/posFocus'
import { posNotifyWarning } from '../../lib/posNotify'
import { BILL_PAYMENT_MODES, PM } from '../../lib/paymentModes'

const ICONS = { [PM.CASH]: Banknote, [PM.CREDITCARD]: CreditCard, [PM.CREDIT]: UserCheck, [PM.MULTIPAYMENT]: Layers }
const STYLES = {
  [PM.CASH]:        { color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  [PM.CREDITCARD]:  { color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  [PM.CREDIT]:      { color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  [PM.MULTIPAYMENT]:{ color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
}

export default function PaymentButtons() {
  const [showCreditModal, setShowCreditModal] = useState(false)
  const showMultiModal = usePosStore(s => s.multiPayModalOpen)
  const openMultiPayModal = usePosStore(s => s.openMultiPayModal)
  const setMultiPayModalOpen = usePosStore(s => s.setMultiPayModalOpen)
  const paymentMode    = usePosStore(s => s.paymentMode)
  const setPaymentMode = usePosStore(s => s.setPaymentMode)
  const setCustomer    = usePosStore(s => s.setCustomer)
  const setPaymentSplits = usePosStore(s => s.setPaymentSplits)

  const handleCreditApply = (c) => {
    setCustomer(c.customerId, c.customerName, c.customerCode, c.paymentMode, c.osAmount)
    setPaymentMode('CREDIT')
  }

  return (
    <>
    {showCreditModal && (
      <CreditCustomerModal
        onClose={closeAndFocusBarcode(() => setShowCreditModal(false))}
        onApply={closeAndFocusBarcode((c) => {
          handleCreditApply(c)
          setShowCreditModal(false)
        })}
      />
    )}
    {showMultiModal && (
      <MultiPaymentModal
        onClose={closeAndFocusBarcode(() => setMultiPayModalOpen(false))}
      />
    )}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, padding: '6px 8px' }}>
      {BILL_PAYMENT_MODES.map(m => {
        const Icon   = ICONS[m.key]
        const style  = STYLES[m.key]
        const active = paymentMode === m.key
        return (
          <button
            key={m.key}
            onClick={() => {
              if (m.key === PM.CREDIT) { setShowCreditModal(true); return }
              if (m.key === PM.MULTIPAYMENT) {
                if (!openMultiPayModal()) {
                  posNotifyWarning('Add items to the cart first', { title: 'Multi Payment' })
                }
                return
              }
              setPaymentMode(m.key)
              setPaymentSplits(null)
              if (m.key === PM.CASH || m.key === PM.CREDITCARD) usePosStore.getState().resetBillPaymentDefaults()
            }}
            style={{
              padding: '9px 4px', borderRadius: 'var(--r-md)',
              border: `1.5px solid ${active ? style.border : 'var(--border)'}`,
              background: active ? style.bg : 'var(--surface)',
              color: active ? style.color : 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, fontWeight: active ? 800 : 600, fontSize: 10,
              boxShadow: active ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
              transition: 'all 0.13s',
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.background  = style.bg
                e.currentTarget.style.color       = style.color
                e.currentTarget.style.borderColor = style.border
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
