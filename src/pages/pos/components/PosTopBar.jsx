import { useState } from 'react'
import { Zap, ChevronDown, LogOut, Power, FilePlus } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { LITE_VERSION_ENABLED } from '../../../config/appConfig'
import BrandLogo from '../../../components/common/BrandLogo'
import PosFullscreenButton from './PosFullscreenButton'

// User menu: same actions as the Log Out tab keys (run by label).
const USER_MENU = [
  { label: 'Add New', icon: FilePlus },
  { label: 'Log Out', icon: LogOut, danger: true, divider: true },
  { label: 'Exit',    icon: Power,  danger: true },
]

/** Simple top bar: logo · bill / counter · Lite · cashier (role) with an Add New / Log Out / Exit menu. The clock is in the bottom bar. */
export default function PosTopBar({ onOpenLite, onAction }) {
  const cashier   = usePosStore(s => s.cashier)
  const billNo    = usePosStore(s => s.billNo)
  const counterNo = usePosStore(s => s.counterNo)
  const [menuOpen, setMenuOpen] = useState(false)

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
        <PosFullscreenButton />
        {LITE_VERSION_ENABLED && (
          <button className="ph-top-lite" data-pos-skip-refocus onClick={onOpenLite} title="Switch to Lite mode">
            <Zap size={14} /> Lite
          </button>
        )}
        {/* Logged-in user: avatar initial · name · role — tap for Log Out */}
        <div className="ph-top-userwrap">
        {menuOpen && <div className="ph-mode-backdrop" data-pos-overlay onPointerDown={() => setMenuOpen(false)} />}
        <button
          className="ph-top-user"
          data-pos-skip-refocus
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
          title={`Logged in as ${cashierName}${cashier?.roleName ? ` (${cashier.roleName})` : ''}`}
        >
          <span className="ph-top-avatar" aria-hidden>{cashierName.trim()[0]?.toUpperCase() ?? '?'}</span>
          <span className="ph-top-user-text">
            <b className="ph-ellipsis">{cashierName}</b>
            {cashier?.roleName && <small>{cashier.roleName}</small>}
          </span>
          <ChevronDown size={16} className="ph-top-user-caret" />
        </button>
        {menuOpen && (
          <div className="ph-top-usermenu" role="menu" data-pos-overlay>
            {USER_MENU.map(({ label, icon: Icon, danger, divider }) => (
              <button
                key={label}
                role="menuitem"
                className={`ph-top-usermenu-item${danger ? ' is-danger' : ''}${divider ? ' has-divider' : ''}`}
                onClick={() => { setMenuOpen(false); onAction?.(label) }}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>
    </header>
  )
}
