import { useEffect, useState } from 'react'
import { Trash2, CheckCircle2, AlertTriangle, Loader2, Inbox } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import Modal from '../components/common/Modal'
import './ClearAllHoldsModal.css'

/*
 * Clear All Hold Bills — "Are you sure?" with the number of held bills,
 * then deletes them one by one (with progress) and shows the result.
 */
export default function ClearAllHoldsModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const [holds, setHolds]   = useState(null)       // null = loading
  const [error, setError]   = useState(null)
  const [phase, setPhase]   = useState('ask')      // 'ask' | 'busy' | 'done'
  const [done, setDone]     = useState(0)
  const [failed, setFailed] = useState(0)

  useEffect(() => {
    let alive = true
    api.counterPos.getHeldBills(accessToken)
      .then(d => { if (alive) setHolds(Array.isArray(d) ? d : []) })
      .catch(e => { if (alive) { setError(e.message); setHolds([]) } })
    return () => { alive = false }
  }, [accessToken])

  async function clearAll() {
    setPhase('busy')
    let ok = 0, bad = 0
    for (const h of holds) {
      try { await api.counterPos.cancelHold(h.sales_id, accessToken); ok++ } catch { bad++ }
      setDone(ok); setFailed(bad)
    }
    setPhase('done')
  }

  const count = holds?.length ?? 0
  const times = (holds ?? []).map(h => new Date(h.bill_date).getTime()).filter(Number.isFinite)
  const oldest = times.length
    ? new Date(Math.min(...times)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const busy = phase === 'busy'

  let body
  if (holds === null) {
    body = <div className="cah-state"><Loader2 size={26} className="cah-spin" /><p>Checking held bills…</p></div>
  } else if (phase === 'done') {
    body = (
      <div className="cah-state">
        <span className={`cah-ico ${failed ? 'is-warn' : 'is-ok'}`}>{failed ? <AlertTriangle size={30} /> : <CheckCircle2 size={30} />}</span>
        <h3>{failed ? 'Some bills were not cleared' : 'All hold bills cleared'}</h3>
        <p>{done} cleared{failed ? ` · ${failed} failed — try again` : ''}</p>
      </div>
    )
  } else if (!count) {
    body = (
      <div className="cah-state">
        <span className="cah-ico is-empty"><Inbox size={30} /></span>
        <h3>No held bills</h3>
        <p>{error ?? 'There is nothing to clear.'}</p>
      </div>
    )
  } else {
    body = (
      <div className="cah-state">
        <span className="cah-ico"><Trash2 size={30} /></span>
        <h3>Are You Sure to Cancel the ALL Hold Bill?</h3>
        <p>This cannot be undone.</p>
        <div className="cah-facts">
          <div><b>{count}</b><span>held bill{count !== 1 ? 's' : ''}</span></div>
          <div><b>{oldest}</b><span>oldest</span></div>
        </div>
        {busy && (
          <div className="cah-progress">
            <div className="cah-bar"><i style={{ width: `${((done + failed) / count) * 100}%` }} /></div>
            <span>Clearing {Math.min(done + failed + 1, count)} of {count}…</span>
          </div>
        )}
      </div>
    )
  }

  const asking = phase === 'ask' && holds !== null && count > 0

  return (
    <Modal onClose={busy ? () => {} : onClose} closeOnBackdrop={!busy} header={false} width={440} zIndex={1200}>
      {body}
      <div className="cah-foot">
        {asking || busy ? (
          <>
            <button type="button" className="cah-yes" onClick={clearAll} disabled={busy}>
              {busy ? <Loader2 size={16} className="cah-spin" /> : <Trash2 size={16} />}
              {busy ? 'Clearing…' : 'Yes'}
            </button>
            <button type="button" className="cah-no" onClick={onClose} disabled={busy} autoFocus>No</button>
          </>
        ) : (
          <button type="button" className="cah-ok" onClick={onClose} disabled={holds === null}>OK</button>
        )}
      </div>
    </Modal>
  )
}
