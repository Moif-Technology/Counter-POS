import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Monitor, Calendar, Clock, ShoppingCart, ChevronRight,
  ChevronDown, Search, Maximize2, Bell, User, UserPlus,
} from 'lucide-react'
import { usePosStore } from '../store/posStore'
import ItemsGrid from '../components/pos/ItemsGrid'
import BarcodeInput from '../components/pos/BarcodeInput'
import NumPad from '../components/pos/NumPad'
import BillSummary from '../components/pos/BillSummary'
import ItemPreview from '../components/pos/ItemPreview'
import { SideNav, FeatureGrid } from '../components/pos/FunctionButtons'

/* ── Tiny header chip ─────────────────────────────────────────── */
function HeaderChip({ icon: Icon, label, dropdown }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 7, padding: '5px 10px', cursor: dropdown ? 'pointer' : 'default',
    }}>
      <Icon size={11} color="rgba(255,255,255,0.65)" />
      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.2 }}>
        {label}
      </span>
      {dropdown && <ChevronDown size={10} color="rgba(255,255,255,0.5)" />}
    </div>
  )
}

/* ── Header icon button ───────────────────────────────────────── */
function HeaderIconBtn({ icon: Icon, badge }) {
  return (
    <button style={{
      position: 'relative',
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.75)', transition: 'all 0.13s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
    >
      <Icon size={14} />
      {badge != null && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          background: '#ef4444', color: '#fff',
          fontSize: 9, fontWeight: 800, minWidth: 16, height: 16,
          borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px', border: '1.5px solid var(--brand)',
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}

export default function POSPage() {
  const navigate         = useNavigate()
  const cashier          = usePosStore(s => s.cashier)
  const counterNo        = usePosStore(s => s.counterNo)
  const billNo           = usePosStore(s => s.billNo)
  const shopName         = usePosStore(s => s.shopName)
  const customerName     = usePosStore(s => s.customerName)
  const addItem          = usePosStore(s => s.addItem)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const setQtyBuffer     = usePosStore(s => s.setQtyBuffer)
  const [now, setNow]    = useState(new Date())

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
      description: barcodeBuffer,
      qty, unitPrice: 10.000, discount: 0, vatPer: 5,
      vatAmt: qty * 10 * 0.05,
    })
    setBarcodeBuffer('')
    setQtyBuffer('0')
  }

  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="pos-root">

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="pos-header">

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShoppingCart size={16} color="#fff" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            {shopName || 'Counter POS'}
          </span>
          <ChevronRight size={13} color="rgba(255,255,255,0.35)" />
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 7, padding: '5px 10px',
            color: '#fff', fontSize: 11, fontWeight: 700,
            transition: 'background 0.13s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.26)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
          >
            <User size={11} /> Cashier
          </button>
        </div>

        {/* Center — counter / date / time */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <HeaderChip icon={Monitor}  label={`Counter ${counterNo}`} dropdown />
          <HeaderChip icon={Calendar} label={dateStr} />
          <HeaderChip icon={Clock}    label={timeStr} />
        </div>

        {/* Right — bill / actions / user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 7, padding: '5px 11px',
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.4 }}>BILL </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
              {billNo}
            </span>
          </div>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)' }} />

          <HeaderIconBtn icon={Search} />
          <HeaderIconBtn icon={Maximize2} />
          <HeaderIconBtn icon={Bell} badge={3} />

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              {cashier?.name}
            </span>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.38)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
              {cashier?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────── */}
      <div className="pos-body">

        {/* LEFT — narrow icon sidebar */}
        <div className="pos-sidebar">
          <SideNav />
        </div>

        {/* CENTER */}
        <div className="pos-center">

          {/* Customer + Barcode entry — top */}
          <div className="pos-topbar">
            <button style={{
              display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '0 11px', height: 38,
              color: 'var(--text-1)', fontSize: 12, fontWeight: 600,
              transition: 'border-color 0.12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--blue-bg)', border: '1px solid var(--blue-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <User size={11} color="var(--blue)" />
              </div>
              <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {customerName || 'Walk-in Customer'}
              </span>
              <ChevronDown size={12} color="var(--text-3)" />
            </button>

            <button style={{
              width: 38, height: 38, borderRadius: 'var(--r-md)', flexShrink: 0,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)', transition: 'all 0.12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-bg)'; e.currentTarget.style.borderColor = 'var(--blue-border)'; e.currentTarget.style.color = 'var(--blue)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
            >
              <UserPlus size={15} />
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <BarcodeInput onEnter={handleEnter} />
            </div>
          </div>

          {/* Item preview strip */}
          <div className="pos-preview">
            <ItemPreview />
          </div>

          {/* Items table */}
          <div className="pos-grid">
            <ItemsGrid />
          </div>

          {/* Feature buttons row */}
          <div className="pos-fn-grid">
            <FeatureGrid />
          </div>

        </div>

        {/* RIGHT — bill summary + numpad */}
        <div className="pos-right">
          <div className="pos-bill-zone"><BillSummary /></div>
          <div className="pos-numpad-zone"><NumPad onEnter={handleEnter} /></div>
        </div>

      </div>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="pos-footer">
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>
          Moif Technology — POS v2.0
        </span>
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
