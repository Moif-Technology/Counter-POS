import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, Calendar, Clock } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import ItemsGrid from '../components/pos/ItemsGrid'
import BarcodeInput from '../components/pos/BarcodeInput'
import NumPad from '../components/pos/NumPad'
import PaymentButtons from '../components/pos/PaymentButtons'
import FunctionButtons from '../components/pos/FunctionButtons'
import BillSummary from '../components/pos/BillSummary'
import ItemPreview from '../components/pos/ItemPreview'

function HeaderChip({ icon: Icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 7, padding: '4px 10px',
    }}>
      <Icon size={11} color="rgba(255,255,255,0.65)" />
      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.88)', letterSpacing: 0.2 }}>
        {label}
      </span>
    </div>
  )
}

export default function POSPage() {
  const navigate         = useNavigate()
  const cashier          = usePosStore(s => s.cashier)
  const counterNo        = usePosStore(s => s.counterNo)
  const billNo           = usePosStore(s => s.billNo)
  const addItem          = usePosStore(s => s.addItem)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const setQtyBuffer     = usePosStore(s => s.setQtyBuffer)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!cashier) { navigate('/'); return }
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [cashier])

  const handleEnter = () => {
    const { barcodeBuffer, qtyBuffer } = usePosStore.getState()
    if (!barcodeBuffer.trim()) return
    const qty = parseFloat(qtyBuffer) || 1
    addItem({
      barcode: barcodeBuffer,
      description: `Product — ${barcodeBuffer}`,
      qty, unitPrice: 10.000, discount: 0, vatPer: 5,
      vatAmt: qty * 10 * 0.05,
    })
    setBarcodeBuffer('')
    setQtyBuffer('1')
  }

  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="pos-root">

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="pos-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.92)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" x2="21" y1="6" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 800, lineHeight: 1, letterSpacing: 0.3 }}>MOIF POS</div>
            <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 9.5, fontWeight: 500, letterSpacing: 0.5, marginTop: 1 }}>COUNTER SALES</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <HeaderChip icon={Monitor}  label={`Counter ${counterNo}`} />
          <HeaderChip icon={Calendar} label={dateStr} />
          <HeaderChip icon={Clock}    label={timeStr} />
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.18)', margin: '0 4px' }} />

        <div style={{
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 7, padding: '4px 12px',
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.4 }}>BILL </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
            {billNo}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff',
          }}>
            {cashier?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>{cashier?.name}</div>
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.4, fontWeight: 500 }}>CASHIER</div>
          </div>
        </div>
      </header>

      {/* ── MAIN BODY ──────────────────────────────── */}
      <div className="pos-body">

        {/* SIDEBAR — function buttons (left, always visible) */}
        <div className="pos-sidebar">
          <FunctionButtons />
        </div>

        {/* CENTER — products area */}
        <div className="pos-center">
          <div className="pos-preview"><ItemPreview /></div>
          <div className="pos-grid"><ItemsGrid /></div>
          <div className="pos-barcode"><BarcodeInput onEnter={handleEnter} /></div>
        </div>

        {/* RIGHT — bill + payment + numpad */}
        <div className="pos-right">
          <div className="pos-bill-zone"><BillSummary /></div>
          <div className="pos-pay-zone"><PaymentButtons /></div>
          <div className="pos-numpad-zone"><NumPad onEnter={handleEnter} /></div>
        </div>

      </div>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="pos-footer">
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>Moif Technology — POS v2.0</span>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
            Currency: <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>AED</span>
          </span>
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            Ready
          </span>
        </div>
      </footer>

    </div>
  )
}
