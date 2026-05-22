import { Banknote, CreditCard, UserCheck, Layers } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

const NUMBER_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', '.', '00'],
]

const PAYMENT_MODES = [
  { key: 'CASH',   label: 'Cash',      icon: Banknote,   color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { key: 'CARD',   label: 'Card',      icon: CreditCard, color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { key: 'CREDIT', label: 'Credit',    icon: UserCheck,  color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { key: 'MULTI',  label: 'Multi Pay', icon: Layers,     color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
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
  const inputMode      = usePosStore(s => s.inputMode)
  const paymentMode    = usePosStore(s => s.paymentMode)
  const netAmount      = usePosStore(s => s.netAmount)
  const setPaymentMode = usePosStore(s => s.setPaymentMode)
  const setPayment     = usePosStore(s => s.setPayment)

  const pressNum = (key) => {
    const state = usePosStore.getState()
    if (state.inputMode === 'qty') {
      const p = state.qtyBuffer
      let next
      if (key === '00') next = p === '0' ? '0' : p + '00'
      else if (key === '.' && p.includes('.')) next = p
      else if (p === '1' && key !== '.') next = key
      else next = p + key
      usePosStore.setState({ qtyBuffer: next })
    } else {
      usePosStore.setState({ barcodeBuffer: state.barcodeBuffer + key })
    }
  }

  const pressQty = () => {
    const state = usePosStore.getState()
    const val = state.barcodeBuffer.trim()
    if (val && !isNaN(Number(val)) && Number(val) > 0) {
      usePosStore.setState({ qtyBuffer: val, barcodeBuffer: '', inputMode: 'barcode' })
    } else {
      usePosStore.setState({ inputMode: 'qty' })
    }
  }

  const selectPayment = (mode) => {
    setPaymentMode(mode.key)
    if (mode.key === 'CASH' || mode.key === 'CARD') setPayment(netAmount)
  }

  /* Shared row height so 4 rows fill evenly */
  const rowH = 58

  return (
    <div style={{ padding: '7px 8px 8px' }}>

      {/* 4-column grid: 3 number cols + 1 payment col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
        {NUMBER_ROWS.map((row, ri) => {
          const mode = PAYMENT_MODES[ri]
          const active = paymentMode === mode.key

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
                border: `1.5px solid ${active ? mode.border : 'var(--border)'}`,
                background: active ? mode.bg : 'var(--surface)',
                color: active ? mode.color : 'var(--text-3)',
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
                  e.currentTarget.style.background  = mode.bg
                  e.currentTarget.style.color       = mode.color
                  e.currentTarget.style.borderColor = mode.border
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
              <mode.icon size={13} />
              <span>{mode.label}</span>
            </button>,
          ]
        })}
      </div>

      {/* QTY button — transfers barcode buffer to qty */}
      <button
        onClick={pressQty}
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
  )
}
