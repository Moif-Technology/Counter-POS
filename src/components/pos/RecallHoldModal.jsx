import { useEffect, useRef, useState } from 'react'
import { X, Archive, Clock, ShoppingBag, Trash2, RotateCcw, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { usePosStore } from '../../store/posStore'

export default function RecallHoldModal({ onClose }) {
  const [holds, setHolds]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const overlayRef              = useRef()
  const accessToken             = usePosStore(s => s.accessToken)
  const recallHold              = usePosStore(s => s.recallHold)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    fetchHolds()
  }, [])

  async function fetchHolds() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.counterPos.getHeldBills(accessToken)
      setHolds(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRecall(hold) {
    try {
      const items = await api.counterPos.recallBill(hold.sales_id, accessToken)
      recallHold(hold, items)
      onClose()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleCancel(hold) {
    if (!window.confirm(`Cancel hold H-${hold.hold_no}?`)) return
    setCancelling(hold.sales_id)
    try {
      await api.counterPos.cancelHold(hold.sales_id, accessToken)
      setHolds(h => h.filter(x => x.sales_id !== hold.sales_id))
    } catch (e) {
      setError(e.message)
    } finally {
      setCancelling(null)
    }
  }

  function fmt(n) {
    return Number(n ?? 0).toFixed(3)
  }

  function fmtTime(dt) {
    if (!dt) return ''
    const d = new Date(dt)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.42)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'rhm-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes rhm-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes rhm-slide { from { opacity:0; transform:scale(0.96) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
        .hold-row:hover { background: var(--surface-2) !important; }
      `}</style>

      <div style={{
        width: 680, maxWidth: '95vw', maxHeight: '88vh',
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        animation: 'rhm-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Archive size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Recall</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Hold Bills</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Error banner */}
          {error && (
            <div style={{
              margin: '12px 16px 0', padding: '10px 14px', borderRadius: 10,
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, color: 'var(--red)', fontWeight: 600,
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '70px 1fr 90px 90px 80px',
            padding: '10px 16px', gap: 8, flexShrink: 0,
            borderBottom: '1.5px solid var(--border)',
            fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
            letterSpacing: 0.7, textTransform: 'uppercase',
          }}>
            <span>Hold #</span>
            <span>Customer / Info</span>
            <span style={{ textAlign: 'right' }}>Items</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
            <span style={{ textAlign: 'center' }}>Actions</span>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                Loading held bills…
              </div>
            ) : holds.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <ShoppingBag size={36} color="var(--text-4)" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
                <p style={{ fontSize: 13, color: 'var(--text-4)', fontWeight: 600 }}>No held bills</p>
              </div>
            ) : (
              holds.map(hold => (
                <div
                  key={hold.sales_id}
                  className="hold-row"
                  style={{
                    display: 'grid', gridTemplateColumns: '70px 1fr 90px 90px 80px',
                    padding: '12px 16px', gap: 8, alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface)', cursor: 'default',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Hold # */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--brand-bg)', border: '1px solid var(--brand-border)',
                    borderRadius: 8, padding: '4px 8px',
                    fontSize: 12, fontWeight: 800, color: 'var(--brand)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    H-{hold.hold_no}
                  </div>

                  {/* Info */}
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>
                      {hold.customer_id ? `Customer #${hold.customer_id}` : 'Walk-in Customer'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-4)', fontSize: 10 }}>
                      <Clock size={9} />
                      {fmtTime(hold.bill_date)}
                    </div>
                  </div>

                  {/* Items */}
                  <p style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                    {hold.item_count} item{hold.item_count !== '1' ? 's' : ''}
                  </p>

                  {/* Amount */}
                  <p style={{
                    textAlign: 'right', fontSize: 13, fontWeight: 800,
                    color: 'var(--text-1)', fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {fmt(hold.amount)}
                  </p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                    <button
                      onClick={() => handleRecall(hold)}
                      title="Recall"
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        border: '1.5px solid var(--brand-border)',
                        background: 'var(--brand-bg)',
                        color: 'var(--brand)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.color = 'var(--brand)' }}
                      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      onClick={() => handleCancel(hold)}
                      title="Cancel hold"
                      disabled={cancelling === hold.sales_id}
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        border: '1.5px solid var(--red-border)',
                        background: 'var(--red-bg)',
                        color: 'var(--red)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.1s',
                        opacity: cancelling === hold.sales_id ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { if (cancelling !== hold.sales_id) { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' } }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
                      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, background: 'var(--surface-2)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600 }}>
            {holds.length} held bill{holds.length !== 1 ? 's' : ''} — click <RotateCcw size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> to recall
          </p>
          <button
            onClick={onClose}
            style={{
              height: 36, padding: '0 20px', borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
