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

export default function POSPage() {
  const navigate = useNavigate()
  const cashier = usePosStore(s => s.cashier)
  const counterNo = usePosStore(s => s.counterNo)
  const billNo = usePosStore(s => s.billNo)
  const addItem = usePosStore(s => s.addItem)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const setQtyBuffer = usePosStore(s => s.setQtyBuffer)
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
    addItem({ barcode: barcodeBuffer, description: `Product — ${barcodeBuffer}`, qty, unitPrice: 10.000, discount: 0, vatPer: 5, vatAmt: qty * 10 * 0.05 })
    setBarcodeBuffer('')
    setQtyBuffer('1')
  }

  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const Chip = ({ icon: Icon, label }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '5px 11px',
      border: '1px solid rgba(255,255,255,0.2)',
    }}>
      <Icon size={12} color="rgba(255,255,255,0.7)" />
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{label}</span>
    </div>
  )

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── HEADER ── */}
      <div style={{
        height: 50, flexShrink: 0,
        background: 'linear-gradient(160deg, var(--brand) 0%, var(--brand-2) 100%)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" x2="21" y1="6" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, lineHeight: 1.1 }}>MOIF POS</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>Counter Sales</div>
          </div>
        </div>

        <Chip icon={Monitor} label={`Counter ${counterNo}`} />
        <Chip icon={Calendar} label={dateStr} />
        <Chip icon={Clock} label={timeStr} />

        {/* Bill badge */}
        <div style={{
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 8, padding: '5px 12px',
        }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Bill: </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{billNo}</span>
        </div>

        {/* Cashier avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)', border: '1.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff', fontWeight: 800,
          }}>
            {cashier?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{cashier?.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>Cashier</div>
          </div>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT: grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Item preview */}
          <div style={{ height: 46, flexShrink: 0 }}>
            <ItemPreview />
          </div>
          {/* Grid */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ItemsGrid />
          </div>
          {/* Barcode bar */}
          <div style={{
            height: 64, flexShrink: 0,
            background: 'var(--surface)', borderTop: '2px solid var(--border)',
          }}>
            <BarcodeInput onEnter={handleEnter} />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          width: 305, flexShrink: 0,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        }}>
          {/* Payment buttons */}
          <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
            <PaymentButtons />
          </div>

          {/* NumPad */}
          <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
            <NumPad onEnter={handleEnter} />
          </div>

          {/* Function buttons */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
            <FunctionButtons />
          </div>
        </div>
      </div>

      {/* ── BILL SUMMARY ── */}
      <div style={{
        height: 130, flexShrink: 0, background: 'var(--surface)',
        borderTop: '2px solid var(--border)',
      }}>
        <BillSummary />
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        height: 26, flexShrink: 0, background: 'var(--surface-2)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px',
      }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Moif Technology — POS v2.0</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Currency: <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>AED</span></span>
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>● Ready</span>
        </div>
      </div>
    </div>
  )
}
