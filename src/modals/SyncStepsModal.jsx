import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Circle, RotateCcw } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import Modal from '../components/common/Modal'
import './DownloadDataModal.css'

const initialOf = steps => Object.fromEntries(steps.map(s => [s.key, { state: 'idle', note: '' }]))

/*
 * SyncStepsModal — progress card + checklist of steps, run one after another.
 * Used by Download Data and Upload To Server.
 *
 * Props: title, icon, verb ('Downloading' | 'Checking' …), doneText, steps
 *   steps: [{ key, label, icon, run: async (token) => 'result note' }]
 */
export default function SyncStepsModal({ onClose, title, icon, verb, doneText, startLabel, steps: STEPS }) {
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const [picked, setPicked]   = useState(() => new Set(STEPS.map(s => s.key)))
  const [status, setStatus]   = useState(() => initialOf(STEPS))
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
    ? `${verb} ${current?.label ?? ''}…`
    : !ran ? 'Ready to start'
    : failed ? `${failed} step${failed !== 1 ? 's' : ''} failed`
    : doneText
  const subline = running
    ? `Step ${finished + 1} of ${queue.length} · please wait`
    : !ran ? `${queue.length} of ${STEPS.length} items selected · Counter ${counterNo ?? '—'}`
    : `${done} of ${queue.length} completed`

  return (
    <Modal
      onClose={running ? () => {} : onClose}
      closeOnBackdrop={!running}
      icon={icon}
      kicker="Data"
      title={title}
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
          <span>Queue</span>
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
                  {st.state === 'busy'  && <><Loader2 size={15} className="dd-spin" /> {verb}</>}
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
          {running ? <Loader2 size={17} className="dd-spin" /> : <RotateCcw size={17} />}
          {running ? `${verb}…` : ran ? 'Run Again' : startLabel}
        </button>
      </div>
    </Modal>
  )
}
