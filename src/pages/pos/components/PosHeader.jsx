import { useEffect, useState } from 'react'
import {
  Monitor, Calendar, Clock, ChevronRight, ChevronDown,
  Search, Maximize2, Bell, User, Zap,
} from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { LITE_VERSION_ENABLED } from '../../../config/appConfig'
import BrandLogo from '../../../components/common/BrandLogo'

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
          background: 'var(--red)', color: '#fff',
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

/** Live clock — ticks on its own so the rest of the POS screen doesn't re-render every second. */
function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

/** POS top bar: shop, counter / date / time, bill no, Lite switch, cashier. */
export default function PosHeader({ onOpenLite }) {
  const cashier   = usePosStore(s => s.cashier)
  const cashierName = cashier?.staffName ?? cashier?.name ?? cashier?.staffCode ?? ''
  const counterNo = usePosStore(s => s.counterNo)
  const billNo    = usePosStore(s => s.billNo)
  const shopName  = usePosStore(s => s.shopName)
  const now = useNow()

  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <header className="pos-header">

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Vendo mark on a white tile so it stands out on the brand-coloured bar */}
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
        }}>
          <BrandLogo variant="icon" height={26} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
          {shopName || 'Counter POS'}
        </span>
        <span className="header-hide-phone"><ChevronRight size={13} color="rgba(255,255,255,0.35)" /></span>
        <button className="header-hide-phone" style={{
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
      <div className="header-hide-phone" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0 }}>
        <HeaderChip icon={Monitor}  label={`Counter ${counterNo}`} dropdown />
        <span className="header-hide-sm"><HeaderChip icon={Calendar} label={dateStr} /></span>
        <HeaderChip icon={Clock}    label={timeStr} />
      </div>

      {/* Right — bill / actions / user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 7, padding: '5px 11px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.4 }}>BILL </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: 'inherit' }}>
            {billNo}
          </span>
        </div>

        {LITE_VERSION_ENABLED && (
          <button
            data-pos-skip-refocus
            onClick={onOpenLite}
            title="Switch to Lite mode"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: 7, padding: '5px 10px',
              color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.13s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.26)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
          >
            <Zap size={11} /> Lite
          </button>
        )}

        <div className="header-hide-md" style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)' }} />
        <span className="header-hide-md"><HeaderIconBtn icon={Search} /></span>
        <span className="header-hide-md"><HeaderIconBtn icon={Maximize2} /></span>
        <span className="header-hide-phone"><HeaderIconBtn icon={Bell} badge={3} /></span>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }} title={`Logged in: ${cashierName}${cashier?.roleName ? ` (${cashier.roleName})` : ''}`}>
          <div className="header-hide-phone" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.15, maxWidth: 140, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis' }}>
              {cashierName}
            </span>
            {cashier?.roleName && (
              <span className="header-hide-sm" style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: 0.3, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis' }}>
                {cashier.roleName}
              </span>
            )}
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff',
          }}>
            {cashierName[0]?.toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
