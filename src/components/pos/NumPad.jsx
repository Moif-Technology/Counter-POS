import { useState } from 'react'
import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import CreditCustomerModal from '../popup/CreditCustomerModal'
import MultiPaymentModal from '../popup/MultiPaymentModal'
import { closeAndFocusBarcode } from '../../lib/posFocus'
import {
  applyPosNumpadKey,
  togglePosQtyMode,
  usePosNumpadKeyboard,
} from '../../lib/posNumpadKeys'
import { BILL_PAYMENT_MODES, PM, isCashTenderMode } from '../../lib/paymentModes'

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

const NUM_BTN = {
  height: '100%', width: '100%', borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-1)', fontSize: 24, fontWeight: 700, cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
  boxShadow: 'var(--shadow-xs)', transition: 'transform 0.07s, background 0.08s',
  lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
}

export default function NumPad({ onEnter }) {
  const [showCreditModal, setShowCreditModal] = useState(false)
  const showMultiModal = usePosStore(s => s.multiPayModalOpen)
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
      setMultiPayModalOpen(true)
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
    <div style={{ padding: '7px 8px 8px' }}>

      {/* 4-column grid: 3 number cols + 1 payment col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
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
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; e.currentTarget.style.boxShadow = 'none' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
              >
                {k}
              </button>
            )),

            /* Payment mode button */
            <button
              key={`pay-${mode.key}`}
              onClick={() => selectPayment(mode)}
              style={{
                height: rowH, borderRadius: 'var(--r-md)',
                border: `1.5px solid ${active ? style.border : 'var(--border)'}`,
                background: active ? style.bg : 'var(--surface)',
                color: active ? style.color : 'var(--text-3)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, fontSize: 10, fontWeight: active ? 800 : 600,
                boxShadow: active ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                transition: 'all 0.12s',
                lineHeight: 1,
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
                  e.currentTarget.style.color       = 'var(--text-3)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)' }}
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
          width: '100%', height: 38, marginTop: 5,
          borderRadius: 'var(--r-md)',
          border: '1.5px solid var(--brand-border)',
          background: 'var(--brand-bg)',
          color: 'var(--brand)',
          fontSize: 12, fontWeight: 800, letterSpacing: 2,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.color = 'var(--brand)' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        # QTY
      </button>

      {/* ENTER key — spans full width */}
      <button
        onClick={onEnter}
        style={{
          width: '100%', height: 52, marginTop: 5,
          borderRadius: 'var(--r-md)',
          background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
          border: 'none',
          color: '#fff', fontSize: 12.5, fontWeight: 800, letterSpacing: 2,
          cursor: 'pointer',
          boxShadow: '0 3px 14px rgba(107,0,0,0.22)',
          transition: 'box-shadow 0.12s, transform 0.08s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 20px rgba(107,0,0,0.32)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 3px 14px rgba(107,0,0,0.22)' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        ENTER
      </button>
    </div>
  </>
  )
}
