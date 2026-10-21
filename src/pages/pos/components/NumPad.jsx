import { useState } from 'react'
import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import CreditCustomerModal from '../../../modals/CreditCustomerModal'
import MultiPaymentModal from '../../../modals/MultiPaymentModal'
import { closeAndFocusBarcode } from '../../../lib/posFocus'
import { posNotifyWarning } from '../../../lib/posNotify'
import {
  applyPosNumpadKey,
  togglePosQtyMode,
  usePosNumpadKeyboard,
} from '../../../lib/posNumpadKeys'
import { BILL_PAYMENT_MODES, PM, isCashTenderMode } from '../../../lib/paymentModes'
import { NEU_RAISED, NEU_PRESSED, neuPress, neuRelease } from '../../../components/common/neumorphic'

const ICONS = { [PM.CASH]: Banknote, [PM.CREDITCARD]: CreditCard, [PM.CREDIT]: UserCheck, [PM.MULTIPAYMENT]: Layers }
const STYLES = {
  [PM.CASH]:        { color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  [PM.CREDITCARD]:  { color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  [PM.CREDIT]:      { color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  [PM.MULTIPAYMENT]:{ color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
}

const NUMBER_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', '.', '00'],
]

/* Neumorphic (soft-UI) look — shadows shared via components/common/neumorphic */
function enterPress(e) { e.currentTarget.style.boxShadow = 'inset 2px 2px 6px rgba(0,0,0,0.30)'; e.currentTarget.style.transform = 'scale(0.98)' }

const NUM_BTN = {
  height: '100%', width: '100%', borderRadius: 12,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-1)', fontSize: 24, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: NEU_RAISED, transition: 'box-shadow 0.1s, transform 0.07s',
  lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
  userSelect: 'none', WebkitTapHighlightColor: 'transparent',
}

export default function NumPad({ onEnter }) {
  const [showCreditModal, setShowCreditModal] = useState(false)
  const showMultiModal = usePosStore(s => s.multiPayModalOpen)
  const openMultiPayModal = usePosStore(s => s.openMultiPayModal)
  const setMultiPayModalOpen = usePosStore(s => s.setMultiPayModalOpen)
  const inputMode        = usePosStore(s => s.inputMode)
  const paymentMode      = usePosStore(s => s.paymentMode)
  const setPaymentMode   = usePosStore(s => s.setPaymentMode)
  const setCustomer      = usePosStore(s => s.setCustomer)
  usePosNumpadKeyboard(onEnter)

  const pressNum = (key) => applyPosNumpadKey(key)

  const selectPayment = (mode) => {
    if (mode.key === PM.CREDIT) {
      setShowCreditModal(true)
      return
    }
    if (mode.key === PM.MULTIPAYMENT) {
      if (!openMultiPayModal()) {
        posNotifyWarning('Add items to the cart first', { title: 'Multi Payment' })
      }
      return
    }
    setPaymentMode(mode.key)
    usePosStore.getState().setPaymentSplits(null)
    if (isCashTenderMode(mode.key)) usePosStore.getState().resetBillPaymentDefaults()
  }

  /* Shared row height so 4 rows fill evenly */
  const rowH = 58

  return (
  <>
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
      <MultiPaymentModal
        onClose={closeAndFocusBarcode(() => setMultiPayModalOpen(false))}
      />
    )}
    <div style={{ padding: '10px 10px 12px', background: 'var(--surface)' }}>

      {/* 4-column grid: 3 number cols + 1 payment col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        {NUMBER_ROWS.map((row, ri) => {
          const mode = BILL_PAYMENT_MODES[ri]
          const active = paymentMode === mode.key
          const Icon = ICONS[mode.key]
          const style = STYLES[mode.key]

          return [
            /* Number keys */
            ...row.map(k => (
              <button
                key={`${ri}-${k}`}
                onClick={() => pressNum(k)}
                style={{ ...NUM_BTN, height: rowH }}
                onMouseDown={neuPress}
                onMouseUp={neuRelease}
                onMouseLeave={neuRelease}
                onTouchStart={neuPress}
                onTouchEnd={neuRelease}
              >
                {k}
              </button>
            )),

            /* Payment mode button */
            <button
              key={`pay-${mode.key}`}
              onClick={() => selectPayment(mode)}
              style={{
                height: rowH, borderRadius: 12,
                border: `1px solid ${active ? style.border : 'var(--border)'}`,
                background: active ? style.bg : 'var(--surface)',
                color: active ? style.color : 'var(--text-3)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, fontSize: 10, fontWeight: active ? 800 : 600,
                /* Selected mode stays "pressed in" */
                boxShadow: active ? NEU_PRESSED : NEU_RAISED,
                transition: 'box-shadow 0.1s, transform 0.07s, color 0.12s',
                lineHeight: 1,
                userSelect: 'none', WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = style.color }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; if (!active) e.currentTarget.style.color = 'var(--text-3)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <Icon size={13} />
              <span>{mode.label}</span>
            </button>,
          ]
        })}
      </div>

      {/* QTY button — transfers barcode buffer to qty */}
      <button
        onClick={togglePosQtyMode}
        style={{
          width: '100%', height: 38, marginTop: 8,
          borderRadius: 12,
          border: '1px solid var(--brand-border)',
          background: 'var(--surface)',
          color: 'var(--brand)',
          fontSize: 12, fontWeight: 800, letterSpacing: 2,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: NEU_RAISED,
          transition: 'box-shadow 0.1s, transform 0.07s',
          userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        }}
        onMouseDown={neuPress}
        onMouseUp={neuRelease}
        onMouseLeave={neuRelease}
        onTouchStart={neuPress}
        onTouchEnd={neuRelease}
      >
        # QTY
      </button>

      {/* ENTER key — spans full width */}
      <button
        onClick={onEnter}
        style={{
          width: '100%', height: 52, marginTop: 8,
          borderRadius: 12,
          background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
          border: 'none',
          color: '#fff', fontSize: 12.5, fontWeight: 800, letterSpacing: 2,
          cursor: 'pointer',
          boxShadow: NEU_RAISED,
          transition: 'box-shadow 0.1s, transform 0.07s',
          userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        }}
        onMouseDown={enterPress}
        onMouseUp={neuRelease}
        onMouseLeave={neuRelease}
        onTouchStart={enterPress}
        onTouchEnd={neuRelease}
      >
        ENTER
      </button>
    </div>
  </>
  )
}
