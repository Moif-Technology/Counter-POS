import { useEffect, useRef, useState } from 'react'
import CounterReadingModal from './CounterReadingModal'
import StaffWiseReportModal from './StaffWiseReportModal'
import GroupWiseReportModal from './GroupWiseReportModal'
import CashierChangeModal from './CashierChangeModal'
import ClearHoldBillModal from './ClearHoldBillModal'
import PasswordChangeModal from './PasswordChangeModal'
import PrivilegeSettingsModal from './PrivilegeSettingsModal'
import SalesViewerModal from './SalesViewerModal'
import CounterCloseViewerModal from './CounterCloseViewerModal'
import CashInOutViewerModal from './CashInOutViewerModal'
import {
  BarChart2, CornerDownLeft, Gauge, Users, FileText, Layers, ReceiptText, Lock, ArrowLeftRight,
  KeyRound, UserCog, Mail, ShieldCheck, CirclePause, Download, Upload, Trash2, Power,
} from 'lucide-react'
import Modal from '../components/common/Modal'
import './ReportsModal.css'

/*
 * Reports — the counter's numbered options as a grid of box tiles:
 * tap an option, or type its number in "Selected Option" and press Enter.
 * `no` is the number shown; `key` is the internal action id (unchanged).
 */
const SECTIONS = [
  { title: 'Reports', items: [
    { no: 0,  key: 0,  label: 'Counter Reading',    icon: Gauge },
    { no: 1,  key: 1,  label: 'Staff Wise Report',  icon: Users },
    { no: 2,  key: 2,  label: 'Special Report',     icon: FileText },
    { no: 8,  key: 8,  label: 'Group Wise Report',  icon: Layers },
  ] },
  { title: 'Viewers', items: [
    { no: 13, key: 14, label: 'Sales Viewer',         icon: ReceiptText },
    { no: 14, key: 15, label: 'Counter Close Viewer', icon: Lock },
    { no: 15, key: 16, label: 'Cash In/Out Viewer',   icon: ArrowLeftRight },
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
const byNo = (n) => ALL.find(i => i.no === n)
const MAX_NO = Math.max(...ALL.map(i => i.no))

export default function ReportsModal({
  onClose, onSelect,
  counterSummaryFn, counterCloseFn, staffReportFn,groupReportFn,
  salesListFn, billDetailFn, billPrintFn, customerSearchFn,
  closeHistoryFn, closeDetailFn, cashInOutReportFn,changePasswordFn, loadPrivilegesFn, savePrivilegesFn,
}) {
  const [counterReadingOpen, setCounterReadingOpen] = useState(false)
  const [staffWiseOpen,     setStaffWiseOpen]     = useState(false)
  const [groupWiseOpen,     setGroupWiseOpen]     = useState(false)
  const [cashierChangeOpen, setCashierChangeOpen] = useState(false)
  const [clearHoldBillOpen, setClearHoldBillOpen] = useState(false)
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false)
  const [privilegeSettingsOpen, setPrivilegeSettingsOpen] = useState(false)
  const [salesViewerOpen,       setSalesViewerOpen]       = useState(false)
  const [counterCloseViewerOpen, setCounterCloseViewerOpen] = useState(false)
  const [cashInOutViewerOpen,    setCashInOutViewerOpen]    = useState(false)
  const [typed, setTyped] = useState('')     // "Selected Option"
  const typedRef = useRef('')
  const subOpen = counterReadingOpen || staffWiseOpen || groupWiseOpen || cashierChangeOpen || clearHoldBillOpen
    || passwordChangeOpen || privilegeSettingsOpen || salesViewerOpen || counterCloseViewerOpen || cashInOutViewerOpen

  function handleSelect(itemKey) {
    setTyped(''); typedRef.current = ''
    if (itemKey === 0) { setCounterReadingOpen(true); return }
    if (itemKey === 1) { setStaffWiseOpen(true); return }
    if (itemKey === 8) { setGroupWiseOpen(true); return }
    if (itemKey === 4) { setCashierChangeOpen(true); return }
    if (itemKey === 5) { setClearHoldBillOpen(true); return }
    if (itemKey === 3) { setPasswordChangeOpen(true); return }
    if (itemKey === 12) { setPrivilegeSettingsOpen(true); return }
    if (itemKey === 14) { setSalesViewerOpen(true); return }
    if (itemKey === 15) { setCounterCloseViewerOpen(true); return }
    if (itemKey === 16) { setCashInOutViewerOpen(true); return }
    onSelect?.(itemKey)
    onClose()
  }

  // Keyboard: digits fill "Selected Option"; Enter opens it. A number that can't
  // grow into a longer option (e.g. 2–9, 10–15) opens straight away.
  useEffect(() => {
    if (subOpen) return undefined
    const onKey = e => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Backspace') { typedRef.current = typedRef.current.slice(0, -1); setTyped(typedRef.current); return }
      if (e.key === 'Enter') {
        const item = typedRef.current !== '' && byNo(Number(typedRef.current))
        if (item) handleSelect(item.key)
        return
      }
      if (!/^\d$/.test(e.key)) return
      const next = (typedRef.current + e.key).replace(/^0(\d)/, '$1')
      if (Number(next) > MAX_NO) return
      typedRef.current = next; setTyped(next)
      const canGrow = Number(next) * 10 <= MAX_NO && Number(next) !== 0
      if (!canGrow && byNo(Number(next))) handleSelect(byNo(Number(next)).key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, subOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const typedItem = typed !== '' ? byNo(Number(typed)) : null

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
                className={`rpt-tile${item.danger ? ' is-danger' : ''}${typedItem?.no === item.no ? ' is-typed' : ''}`}
                onClick={() => handleSelect(item.key)}
              >
                <span className="rpt-no">{item.no}</span>
                <span className="rpt-ico"><Icon size={22} /></span>
                <span className="rpt-label">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rpt-foot">
        <span className="rpt-foot-label">Selected Option</span>
        <div className={`rpt-sel${typed ? ' has-value' : ''}`}>
          <b>{typed || '–'}</b>
          {typedItem && <span>{typedItem.label}</span>}
        </div>
        <button type="button" className="rpt-go" disabled={!typedItem} onClick={() => typedItem && handleSelect(typedItem.key)}>
          <CornerDownLeft size={15} /> Open
        </button>
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
      <StaffWiseReportModal onClose={() => setStaffWiseOpen(false)} reportFn={staffReportFn} />
    )}
   
    {salesViewerOpen && (
      <SalesViewerModal
        onClose={() => setSalesViewerOpen(false)}
        salesListFn={salesListFn}
        customerSearchFn={customerSearchFn}
        billDetailFn={billDetailFn}
        printFn={billPrintFn}
      />
    )}
     {groupWiseOpen && (
      <GroupWiseReportModal onClose={() => setGroupWiseOpen(false)} reportFn={groupReportFn} />
    )}
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

    {counterCloseViewerOpen && (
      <CounterCloseViewerModal
        onClose={() => setCounterCloseViewerOpen(false)}
        historyFn={closeHistoryFn}
        closeDetailFn={closeDetailFn}
      />
    )}
    {cashInOutViewerOpen && (
      <CashInOutViewerModal onClose={() => setCashInOutViewerOpen(false)} reportFn={cashInOutReportFn} />
    )}
    </>
  )
}
