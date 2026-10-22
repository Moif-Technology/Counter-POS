import { usePosStore } from '../../../store/posStore'

/** Brand-coloured status bar: company · shop · currency · database. */
export default function PosStatusBar() {
  const shopName = usePosStore(s => s.shopName)
  const currency = usePosStore(s => s.currency)

  return (
    <footer className="ph-status">
      <span>MOIF TECHNOLOGIES</span>
      <span className="ph-ellipsis">{(shopName || '').toUpperCase()}</span>
      <span className="ph-status-right">
        <span>Currency : <b>{currency}</b></span>
        <span className="ph-hide-sm">DataBase : <b>SERVER</b></span>
      </span>
    </footer>
  )
}
