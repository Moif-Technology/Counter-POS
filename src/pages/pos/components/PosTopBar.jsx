import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { LITE_VERSION_ENABLED } from '../../../config/appConfig'
import BrandLogo from '../../../components/common/BrandLogo'

/** Live clock — ticks on its own so the rest of the POS screen doesn't re-render every second. */
function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

const pad = n => String(n).padStart(2, '0')

/** 22-10-2026  12:12:19 PM */
function formatNow(d) {
  const h = d.getHours() % 12 || 12
  return {
    date: `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`,
    time: `${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`,
  }
}

/** White top bar: brand · cashier · bill no / counter no · date & time · role. */
export default function PosTopBar({ onOpenLite }) {
  const cashier   = usePosStore(s => s.cashier)
  const billNo    = usePosStore(s => s.billNo)
  const counterNo = usePosStore(s => s.counterNo)
  const { date, time } = formatNow(useNow())

  const cashierName = cashier?.staffName ?? cashier?.name ?? cashier?.staffCode ?? 'Cashier'
  const roleLabel   = (cashier?.roleName || 'Cashier').toUpperCase()

  return (
    <header className="ph-top">
      <div className="ph-top-brand">
        {/* Same horizontal Vendo logo as the Lite header */}
        <BrandLogo variant="horizontal" height={40} />
        <span className="ph-top-cashier" title="Logged-in cashier">{cashierName}</span>
      </div>

      <div className="ph-top-meta">
        <div className="ph-top-field">
          <span>Bill No.</span>
          <strong>{billNo || '—'}</strong>
        </div>
        <div className="ph-top-field">
          <span>Counter No.</span>
          <strong>{counterNo || '—'}</strong>
        </div>
      </div>

      <div className="ph-top-right">
        <span className="ph-top-clock">
          <span className="ph-hide-sm">{date}</span>
          <span>{time}</span>
        </span>
        {LITE_VERSION_ENABLED && (
          <button className="ph-top-lite" data-pos-skip-refocus onClick={onOpenLite} title="Switch to Lite mode">
            <Zap size={13} /> Lite
          </button>
        )}
        <div className="ph-top-role" title={`${cashierName}${cashier?.roleName ? ` (${cashier.roleName})` : ''}`}>
          {roleLabel}
        </div>
      </div>
    </header>
  )
}
