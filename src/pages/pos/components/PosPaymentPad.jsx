import { useState } from 'react'
import { Banknote, CreditCard, UserRound, LayoutGrid, CornerDownLeft } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import CreditCustomerModal from '../../../modals/CreditCustomerModal'
import MultiPaymentModal from '../../../modals/MultiPaymentModal'
import { closeAndFocusBarcode } from '../../../lib/posFocus'
import { posNotifyWarning } from '../../../lib/posNotify'
import { applyPosNumpadKey, usePosNumpadKeyboard } from '../../../lib/posNumpadKeys'
import { PM, isCashTenderMode } from '../../../lib/paymentModes'

const PAY_TILES = [
  { key: PM.CASH,         label: 'Cash',        icon: Banknote },
  { key: PM.CREDITCARD,   label: 'Credit Card', icon: CreditCard },
  { key: PM.CREDIT,       label: 'Credit',      icon: UserRound },
  { key: PM.MULTIPAYMENT, label: 'Multi Pay',   icon: LayoutGrid },
]

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '00']

/** Payment mode tiles, numpad and ENTER (middle column). */
export default function PosPaymentPad({ onEnter }) {
  const [showCreditModal, setShowCreditModal] = useState(false)
  const paymentMode          = usePosStore(s => s.paymentMode)
  const showMultiModal       = usePosStore(s => s.multiPayModalOpen)
  const openMultiPayModal    = usePosStore(s => s.openMultiPayModal)
  const setMultiPayModalOpen = usePosStore(s => s.setMultiPayModalOpen)
  const setPaymentMode       = usePosStore(s => s.setPaymentMode)
  const setCustomer          = usePosStore(s => s.setCustomer)
  usePosNumpadKeyboard(onEnter)

  const selectPayment = (key) => {
    if (key === PM.CREDIT) { setShowCreditModal(true); return }
    if (key === PM.MULTIPAYMENT) {
      if (!openMultiPayModal()) posNotifyWarning('Add items to the cart first', { title: 'Multi Payment' })
      return
    }
    setPaymentMode(key)
    usePosStore.getState().setPaymentSplits(null)
    if (isCashTenderMode(key)) usePosStore.getState().resetBillPaymentDefaults()
  }

  return (
    <div className="ph-pad">
      <div className="ph-pay">
        {PAY_TILES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`ph-pay-tile${paymentMode === key ? ' is-active' : ''}`}
            onClick={() => selectPayment(key)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="ph-pad-spacer" />

      <div className="ph-keys">
        {KEYS.map(k => (
          <button key={k} className="ph-key" onClick={() => applyPosNumpadKey(k)}>{k}</button>
        ))}
      </div>

      <button className="ph-enter" onClick={onEnter}>
        <CornerDownLeft size={22} />
        <span>ENTER</span>
      </button>

      {showCreditModal && (
        <CreditCustomerModal
          onClose={closeAndFocusBarcode(() => setShowCreditModal(false))}
          onApply={closeAndFocusBarcode((c) => {
            setCustomer(c.customerId, c.customerName, c.customerCode, c.paymentMode, c.osAmount)
            setPaymentMode(PM.CREDIT)
            setShowCreditModal(false)
          })}
        />
      )}
      {showMultiModal && (
        <MultiPaymentModal onClose={closeAndFocusBarcode(() => setMultiPayModalOpen(false))} />
      )}
    </div>
  )
}
