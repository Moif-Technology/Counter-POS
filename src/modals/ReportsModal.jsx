import { useEffect, useState } from 'react'
import CounterReadingModal from './CounterReadingModal'
import StaffWiseReportModal from './StaffWiseReportModal'
import GroupWiseReportModal from './GroupWiseReportModal'
import CashierChangeModal from './CashierChangeModal'
import ClearHoldBillModal from './ClearHoldBillModal'
import DownloadDataModal from './DownloadDataModal'
import UploadDataModal from './UploadDataModal'
import ClearAllHoldsModal from './ClearAllHoldsModal'
import EmailSettingsModal from './EmailSettingsModal'
import PasswordChangeModal from './PasswordChangeModal'
import PrivilegeSettingsModal from './PrivilegeSettingsModal'
import {
  BarChart2, Info, Gauge, Users, FileText, Layers,
  KeyRound, UserCog, Mail, ShieldCheck, CirclePause, Download, Upload, Trash2, Power,
} from 'lucide-react'
import Modal from '../components/common/Modal'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import './ReportsModal.css'

/*
 * Reports — the counter's options as a grid of tiles; tap one to open it.
 * `no` sets the tile order; `key` is the internal action id (unchanged).
 */
const SECTIONS = [
  { title: 'Reports', items: [
    { no: 0,  key: 0,  label: 'Counter Reading',    icon: Gauge },
    { no: 1,  key: 1,  label: 'Staff Wise Report',  icon: Users },
    { no: 2,  key: 2,  label: 'Special Report',     icon: FileText },
    { no: 8,  key: 8,  label: 'Group Wise Report',  icon: Layers },
  ] },
  { title: 'Account & Settings', items: [
    { no: 3,  key: 3,  label: 'Password Change',    icon: KeyRound },
    { no: 4,  key: 4,  label: 'Cashier Change',     icon: UserCog },
    { no: 11, key: 11, label: 'eMail Settings',     icon: Mail },
    { no: 12, key: 12, label: 'Privilege Settings', icon: ShieldCheck },
  ] },
  { title: 'Data & System', items: [
    { no: 5,  key: 5,  label: 'Clear Hold Bill',      icon: CirclePause },
    { no: 6,  key: 6,  label: 'Download Data',        icon: Download },
    { no: 7,  key: 7,  label: 'Upload To Server',     icon: Upload },
    { no: 10, key: 10, label: 'Clear All Hold Bills', icon: Trash2, danger: true },
    { no: 9,  key: 9,  label: 'Shut Down',            icon: Power, danger: true },
  ] },
]
const ALL = SECTIONS.flatMap(sec => sec.items).sort((a, b) => a.no - b.no)

export default function ReportsModal({
  onClose, onSelect,
  counterSummaryFn, counterCloseFn, staffReportFn,groupReportFn,
  closeHistoryFn, changePasswordFn, loadPrivilegesFn, savePrivilegesFn,
}) {
  const [counterReadingOpen, setCounterReadingOpen] = useState(false)
  const [staffWiseOpen,     setStaffWiseOpen]     = useState(false)
  const [groupWiseOpen,     setGroupWiseOpen]     = useState(false)
  const [cashierChangeOpen, setCashierChangeOpen] = useState(false)
  const [readingNeeded, setReadingNeeded] = useState(false)   // "take the counter reading first" notice
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const [clearHoldBillOpen, setClearHoldBillOpen] = useState(false)
  const [downloadOpen,      setDownloadOpen]      = useState(false)
  const [uploadOpen,        setUploadOpen]        = useState(false)
  const [clearAllOpen,      setClearAllOpen]      = useState(false)
  const [emailOpen,         setEmailOpen]         = useState(false)
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)
  const [privilegeSettingsOpen, setPrivilegeSettingsOpen] = useState(false)
  const subOpen = counterReadingOpen || staffWiseOpen || groupWiseOpen || cashierChangeOpen || clearHoldBillOpen
    || passwordChangeOpen || privilegeSettingsOpen || readingNeeded || downloadOpen || uploadOpen || clearAllOpen || emailOpen

  // Cashier Change needs the counter reading (Z-Report) first when the session has bills.
  async function openCashierChange() {
    let pending
    try {
      const doSummary = counterSummaryFn ?? (() => api.counterPos.counterSummary(counterNo, accessToken))
      pending = Number((await doSummary())?.billCount) || 0
    } catch {
      pending = 0   // summary unavailable: don't block the change
    }
    if (pending > 0) {
      setReadingNeeded(true)
      return
    }
    setCashierChangeOpen(true)
  }

  function handleSelect(itemKey) {
    if (itemKey === 0) { setCounterReadingOpen(true); return }
    if (itemKey === 1) { setStaffWiseOpen(true); return }
    if (itemKey === 8) { setGroupWiseOpen(true); return }
    if (itemKey === 4) { openCashierChange(); return }
    if (itemKey === 5) { setClearHoldBillOpen(true); return }
    if (itemKey === 6) { setDownloadOpen(true); return }
    if (itemKey === 7) { setUploadOpen(true); return }
    if (itemKey === 10) { setClearAllOpen(true); return }
    if (itemKey === 11) { setEmailOpen(true); return }
    if (itemKey === 3) { setPasswordChangeOpen(true); return }
    if (itemKey === 12) { setPrivilegeSettingsOpen(true); return }
    onSelect?.(itemKey)
    onClose()
  }

  // Escape closes the list (sub-reports handle their own Escape).
  useEffect(() => {
    if (subOpen) return undefined
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, subOpen])

  return (
    <>
    <Modal closeOnEsc={false} onClose={onClose} icon={BarChart2} kicker="Counter POS" title="Reports" width={820}>
      <div className="rpt">
        <div className="rpt-grid">
          {ALL.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.no}
                type="button"
                className={`rpt-tile${item.danger ? ' is-danger' : ''}`}
                onClick={() => handleSelect(item.key)}
              >
                <span className="rpt-ico"><Icon size={24} /></span>
                <span className="rpt-label">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rpt-foot">
        <button type="button" className="rpt-close" onClick={onClose}>Close</button>
      </div>
    </Modal>

    {counterReadingOpen && (
      <CounterReadingModal
        onClose={() => setCounterReadingOpen(false)}
        summaryFn={counterSummaryFn}
        closeFn={counterCloseFn}
      />
    )}
    {staffWiseOpen && (
      <StaffWiseReportModal onClose={() => setStaffWiseOpen(false)} reportFn={staffReportFn} historyFn={closeHistoryFn} />
    )}
   
     {groupWiseOpen && (
      <GroupWiseReportModal onClose={() => setGroupWiseOpen(false)} reportFn={groupReportFn} historyFn={closeHistoryFn} />
    )}
    {readingNeeded && (
      <Modal onClose={() => setReadingNeeded(false)} header={false} width={420} zIndex={1200}>
        <div className="rpt-note">
          <span className="rpt-note-ico"><Info size={30} /></span>
          <h3>Counter Reading Pending</h3>
          <p>Take the Counter Reading before changing the Cashier.</p>
          <div className="rpt-note-btns">
            <button type="button" className="rpt-note-alt" onClick={() => { setReadingNeeded(false); setCounterReadingOpen(true) }}>Counter Reading</button>
            <button type="button" className="rpt-note-ok" onClick={() => setReadingNeeded(false)} autoFocus>OK</button>
          </div>
        </div>
      </Modal>
    )}
    {downloadOpen && <DownloadDataModal onClose={() => setDownloadOpen(false)} />}
    {uploadOpen && <UploadDataModal onClose={() => setUploadOpen(false)} />}
    {clearAllOpen && <ClearAllHoldsModal onClose={() => setClearAllOpen(false)} />}
    {emailOpen && <EmailSettingsModal onClose={() => setEmailOpen(false)} />}
    {cashierChangeOpen && (
  <CashierChangeModal onClose={() => setCashierChangeOpen(false)} />
)}
{clearHoldBillOpen && (
  <ClearHoldBillModal onClose={() => setClearHoldBillOpen(false)} />
)}
{passwordChangeOpen && (
  <PasswordChangeModal
    onClose={() => setPasswordChangeOpen(false)}
    changeFn={changePasswordFn}
  />
)}
{privilegeSettingsOpen && (
  <PrivilegeSettingsModal
    onClose={() => setPrivilegeSettingsOpen(false)}
    loadFn={loadPrivilegesFn}
    saveFn={savePrivilegesFn}
  />
)}

    </>
  )
}
