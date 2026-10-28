import { Info } from 'lucide-react'
import Modal from './Modal'
import './Notice.css'

/*
 * Notice — small centred message with an OK button (e.g. "No data to print").
 *
 *   {noData && <Notice title="No data to print" message="…" onClose={() => setNoData(false)} />}
 *
 * Props: title, message (optional), icon (lucide, default Info), okLabel, onClose, zIndex
 */
export default function Notice({ title, message, icon: Icon = Info, okLabel = 'OK', onClose, zIndex = 1300 }) {
  return (
    <Modal onClose={onClose} header={false} width={380} zIndex={zIndex}>
      <div className="ui-notice">
        <span className="ui-notice-ico"><Icon size={28} /></span>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <button type="button" className="ui-notice-ok" onClick={onClose} autoFocus>{okLabel}</button>
      </div>
    </Modal>
  )
}
