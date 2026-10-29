import { usePosStore } from '../../../store/posStore'
import PosClock from './PosClock'

/** Bottom bar: company · shop | date & time (centre) | currency · database. */
export default function PosStatusBar() {
  const shopName = usePosStore(s => s.shopName)
  const currency = usePosStore(s => s.currency)

  return (
    <footer className="ph-status">
      <span className="ph-status-left">
        <span>MOIF TECHNOLOGIES</span>
        <span className="ph-ellipsis ph-hide-sm">{(shopName || '').toUpperCase()}</span>
      </span>
      <PosClock className="ph-status-clock" />
      <span className="ph-status-right">
        <span>Currency : <b>{currency}</b></span>
        <span className="ph-hide-sm">DataBase : <b>SERVER</b></span>
      </span>
    </footer>
  )
}
