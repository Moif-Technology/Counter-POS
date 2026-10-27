import { useState } from 'react'
import {
  Download, Settings, Layers, Package, Users, Receipt, Hash,
  CheckCircle2, XCircle, Loader2, Circle, RotateCcw,
} from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { setGvTax } from '../lib/gvtax'
import { setAutoRoundOff } from '../lib/posSettings'
import Modal from '../components/common/Modal'
import './DownloadDataModal.css'

/*
 * Download Data — refresh this counter from the server, one step at a time.
 * Settings, groups and the next bill no are reloaded into the POS; products,
 * customers and today's transactions are fetched to confirm they are reachable
 * (the POS always reads those live). Each step shows its own result.
 */
const listOf = (r, key) => (Array.isArray(r) ? r : Array.isArray(r?.[key]) ? r[key] : Array.isArray(r?.data) ? r.data : [])

const STEPS = [
  {
    key: 'settings', label: 'Settings & Tax', icon: Settings,
    run: async (token) => {
      const [tax, pos] = await Promise.all([
        api.appParameters.gvtax(token),
        api.appParameters.posParams(token).catch(() => null),
      ])
      const s = usePosStore.getState()
      setGvTax(tax?.gvtax ?? 5)
      s.setCurrencyPrecision(tax?.currencyPrecision ?? 2)
      setAutoRoundOff(tax?.autoRoundOff ?? 0)
      if (tax?.receiptHeader) s.setReceiptHeader(tax.receiptHeader)
      const p = pos?.parameters ?? pos?.data?.parameters ?? {}
      s.setCustomerDisplayEnabled(Number(p.customer_display_enabled) === 1)
      s.recalc()
      return `VAT ${tax?.gvtax ?? 5}%`
    },
  },
  {
    key: 'groups', label: 'Product Groups', icon: Layers,
    run: async () => {
      await usePosStore.getState().fetchProductGroups()
      const { groupsError, productGroups } = usePosStore.getState()
      if (groupsError) throw new Error(groupsError)
      return `${productGroups.length} groups`
    },
  },
  {
    key: 'products', label: 'Product Details', icon: Package,
    run: async (token) => `${listOf(await api.counterPos.productLookup('', null, token), 'products').length} products`,
  },
  {
    key: 'customers', label: 'Customer Details', icon: Users,
    run: async (token) => `${listOf(await api.counterPos.customerSearch('', 500, token), 'customers').length} customers`,
  },
  {
    key: 'counter', label: 'Daily Counter Transactions', icon: Receipt,
    run: async (token) => {
      const sum = await api.counterPos.counterSummary(usePosStore.getState().counterNo, token)
      return `${Number(sum?.billCount) || 0} bills today`
    },
  },
  {
    key: 'billno', label: 'Next Bill No', icon: Hash,
    run: async (token) => {
      const { billNo } = await api.counterPos.nextBillNo(token)
      usePosStore.getState().setBillNo(String(billNo ?? ''))
      return `Bill ${billNo ?? '—'}`
    },
  },
]

const initial = () => Object.fromEntries(STEPS.map(s => [s.key, { state: 'idle', note: '' }]))

export default function DownloadDataModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const [picked, setPicked]   = useState(() => new Set(STEPS.map(s => s.key)))
  const [status, setStatus]   = useState(initial)
  const [running, setRunning] = useState(false)
  const [ran, setRan]         = useState(false)

  const queue = STEPS.filter(s => picked.has(s.key))
  const done   = queue.filter(s => status[s.key].state === 'done').length
  const failed = queue.filter(s => status[s.key].state === 'error').length
  const finished = done + failed
  const pct = queue.length ? Math.round((finished / queue.length) * 100) : 0
  const current = STEPS.find(s => status[s.key].state === 'busy')

  const setStep = (key, state, note = '') => setStatus(prev => ({ ...prev, [key]: { state, note } }))

  async function runSteps(steps) {
    if (running || !steps.length) return
    setRunning(true)
    setRan(true)
    steps.forEach(s => setStep(s.key, 'wait'))
    for (const step of steps) {
      setStep(step.key, 'busy')
      try {
        setStep(step.key, 'done', await step.run(accessToken))
      } catch (e) {
        setStep(step.key, 'error', e?.message ?? 'Failed')
      }
    }
    setRunning(false)
  }

  const toggle = key => {
    if (running) return
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }
  const allPicked = picked.size === STEPS.length

  const headline = running
    ? `Downloading ${current?.label ?? ''}…`
    : !ran ? 'Ready to download'
    : failed ? `${failed} step${failed !== 1 ? 's' : ''} failed`
    : 'All data is up to date'
  const subline = running
    ? `Step ${finished + 1} of ${queue.length} · please wait`
    : !ran ? `${queue.length} of ${STEPS.length} items selected · Counter ${counterNo ?? '—'}`
    : `${done} of ${queue.length} downloaded`

  return (
    <Modal
      onClose={running ? () => {} : onClose}
      closeOnBackdrop={!running}
      icon={Download}
      kicker="Data"
      title="Download from Server"
      width={640}
      zIndex={1100}
    >
      <div className="dd">
        <div className={`dd-hero${ran && !running ? (failed ? ' is-error' : ' is-done') : ''}`}>
          <div className="dd-hero-text">
            <b>{headline}</b>
            <span>{subline}</span>
          </div>
          <span className="dd-pct">{pct}%</span>
          <div className="dd-bar"><i style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="dd-list-head">
          <span>Download queue</span>
          <button type="button" disabled={running} onClick={() => setPicked(allPicked ? new Set() : new Set(STEPS.map(s => s.key)))}>
            {allPicked ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="dd-list">
          {STEPS.map(step => {
            const Icon = step.icon
            const st = status[step.key]
            const on = picked.has(step.key)
            return (
              <div key={step.key} className={`dd-row is-${st.state}${on ? '' : ' is-off'}`}>
                <label className="dd-check">
                  <input type="checkbox" checked={on} disabled={running} onChange={() => toggle(step.key)} />
                </label>
                <span className="dd-ico"><Icon size={17} /></span>
                <span className="dd-name">{step.label}</span>
                <span className="dd-state">
                  {st.state === 'busy'  && <><Loader2 size={15} className="dd-spin" /> Downloading</>}
                  {st.state === 'wait'  && <><Circle size={13} /> Waiting</>}
                  {st.state === 'done'  && <><CheckCircle2 size={15} /> {st.note || 'Done'}</>}
                  {st.state === 'error' && (
                    <>
                      <XCircle size={15} /> <span title={st.note}>Failed</span>
                      {!running && <button type="button" onClick={() => runSteps([step])}><RotateCcw size={13} /> Retry</button>}
                    </>
                  )}
                  {st.state === 'idle'  && (on ? 'Ready' : 'Skipped')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="dd-foot">
        <button type="button" className="dd-close" onClick={onClose} disabled={running}>{ran && !running ? 'OK' : 'Close'}</button>
        <button type="button" className="dd-go" onClick={() => runSteps(queue)} disabled={running || !queue.length}>
          {running ? <Loader2 size={17} className="dd-spin" /> : <Download size={17} />}
          {running ? 'Downloading…' : ran ? 'Download Again' : 'Start Download'}
        </button>
      </div>
    </Modal>
  )
}
