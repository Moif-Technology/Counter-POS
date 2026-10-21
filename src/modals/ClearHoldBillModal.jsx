import { useState, useEffect, useCallback, useRef } from 'react'
import { Eraser, Trash2, RefreshCw, CheckCircle2, X } from 'lucide-react'
import { fmt3 } from '../lib/utils'

export default function ClearHoldBillModal({ onClose }) {
  const [holdBills, setHoldBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearingId, setClearingId] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const overlayRef = useRef()

  const fetchHoldBills = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    setTimeout(() => {
      const mockData = [
        { id: 'h1', holdRef: 'HOLD-1001', customerName: 'John Doe', holdTime: '02:45 PM', itemCount: 3, netAmount: 145.50 },
        { id: 'h2', holdRef: 'HOLD-1002', customerName: 'Walk-in Customer', holdTime: '03:12 PM', itemCount: 1, netAmount: 42.00 },
        { id: 'h3', holdRef: 'HOLD-1003', customerName: 'Alice Smith', holdTime: '03:30 PM', itemCount: 5, netAmount: 320.75 },
      ]
      setHoldBills(mockData)
      setLoading(false)
    }, 400)
  }, [])

  useEffect(() => { fetchHoldBills() }, [fetchHoldBills])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  async function handleClearBill(bill) {
    setClearingId(bill.id)
    
    setTimeout(() => {
      setHoldBills(prev => prev.filter(b => b.id !== bill.id))
      setClearingId(null)
      setToast({ 
        title: 'Clear Hold Bill', 
        subtitle: `Bill ${bill.holdRef} cleared` 
      })
    }, 400)
  }

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(15,13,10,0.50)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'swfade 0.15s ease',
      }}
    >
      <style>{`@keyframes swfade { from { opacity:0 } to { opacity:1 } }`}</style>

      <div style={{
        width: 700, maxWidth: '96vw', maxHeight: '85vh',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.20)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Project-Themed Toast Centered at the Bottom */}
        {toast && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1200, background: '#fff',
            border: '1.5px solid var(--red-border, var(--red-border))',
            padding: '10px 14px', borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            animation: 'swfade 0.2s ease', minWidth: 200,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--red-bg, var(--red-bg))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CheckCircle2 size={15} color="var(--red, var(--red))" />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1, var(--palette-1))', margin: 0, lineHeight: 1.2 }}>
                {toast.title}
              </p>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3, var(--text-2))', margin: 0, lineHeight: 1.2 }}>
                {toast.subtitle}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '13px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Eraser size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', margin: 0 }}>
                Operations
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1, margin: 0 }}>
                Clear Hold Bill
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={fetchHoldBills}
              disabled={loading}
              title="Refresh"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={onClose}
              title="Close"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: 'var(--text-3)', fontSize: 13 }}>
              <RefreshCw size={18} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
              Loading held bills...
            </div>
          )}

          {!loading && holdBills.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, color: 'var(--text-4)', gap: 8 }}>
              <Eraser size={28} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>No held bills found</p>
            </div>
          )}

          {!loading && holdBills.length > 0 && (
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    {['#', 'Hold Ref / No', 'Customer', 'Time', 'Items', 'Amount', 'Action'].map((h, i) => (
                      <th key={h} style={{
                        padding: '9px 10px', fontWeight: 700, fontSize: 10.5,
                        color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5,
                        textAlign: i === 5 ? 'right' : (i === 6 ? 'center' : 'left'),
                        borderBottom: '1.5px solid var(--border)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdBills.map((b, i) => (
                    <tr key={b.id} style={{ background: i % 2 === 0 ? '#fff' : 'var(--surface)' }}>
                      <td style={{ padding: '8px 10px', color: 'var(--text-4)', fontSize: 11 }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-1)' }}>{b.holdRef}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-2)' }}>{b.customerName}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-3)' }}>{b.holdTime}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-2)' }}>{b.itemCount}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-1)' }}>{fmt3(b.netAmount)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleClearBill(b)}
                          disabled={clearingId === b.id}
                          style={{
                            padding: '5px 10px', borderRadius: 6,
                            background: 'var(--red-bg)', border: '1px solid var(--red-border)',
                            color: 'var(--red)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <Trash2 size={12} /> {clearingId === b.id ? 'Clearing...' : 'Clear'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Themed Close Button */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              height: 36, padding: '0 22px', borderRadius: 10,
              border: '1.5px solid var(--red-border, var(--red-border))', 
              background: 'var(--red-bg, var(--red-bg))',
              color: 'var(--red, var(--red))', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}