import { Zap } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { LITE_VERSION_ENABLED } from '../../../config/appConfig'
import BrandLogo from '../../../components/common/BrandLogo'

/** Simple top bar: logo · bill / counter · Lite · cashier (role). The clock is in the bottom bar. */
export default function PosTopBar({ onOpenLite }) {
  const cashier   = usePosStore(s => s.cashier)
  const billNo    = usePosStore(s => s.billNo)
  const counterNo = usePosStore(s => s.counterNo)

  const cashierName = cashier?.staffName ?? cashier?.name ?? cashier?.staffCode ?? 'Cashier'

  return (
    <header className="ph-top">
      <BrandLogo variant="horizontal" height={34} />

      <div className="ph-top-meta">
        <span>Bill <b>{billNo || '—'}</b></span>
        <span className="ph-top-dot" aria-hidden>·</span>
        <span>Counter <b>{counterNo || '—'}</b></span>
      </div>

      <div className="ph-top-right">
        {LITE_VERSION_ENABLED && (
          <button className="ph-top-lite" data-pos-skip-refocus onClick={onOpenLite} title="Switch to Lite mode">
            <Zap size={14} /> Lite
          </button>
        )}
        {/* Logged-in user: avatar initial · name · role */}
        <div className="ph-top-user" title={`Logged in as ${cashierName}${cashier?.roleName ? ` (${cashier.roleName})` : ''}`}>
          <span className="ph-top-avatar" aria-hidden>{cashierName.trim()[0]?.toUpperCase() ?? '?'}</span>
          <span className="ph-top-user-text">
            <b className="ph-ellipsis">{cashierName}</b>
            {cashier?.roleName && <small>{cashier.roleName}</small>}
          </span>
        </div>
      </div>
    </header>
  )
}
