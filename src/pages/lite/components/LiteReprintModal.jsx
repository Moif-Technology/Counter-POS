import { useEffect, useRef, useState } from 'react'
import { X, Printer, FileText, Receipt, Package, Truck, CalendarDays } from 'lucide-react'
import Numpad from '../../../components/ui/Numpad'
import Calendar from '../../../components/ui/Calendar'

const DOC_OPTIONS = [
  { key: 'INVOICE',  label: 'Invoice', icon: Receipt },
  { key: 'HOLD',     label: 'Hold', icon: Package },
  { key: 'DELIVERY', label: 'Delivery Note', icon: Truck },
]

const today = new Date()
const isoDate = d => d.toISOString().split('T')[0]
const formatDisplay = iso => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d} / ${m} / ${y}`
}

/** Lite equivalent of BillReprintModal — same doc-type tabs + counter/date + numpad UX,
 *  backed by Lite's local saved bills / held bills / deliveries instead of the server. */
export default function LiteReprintModal({ onClose, onPrint }) {
  const [docType,   setDocType]   = useState('INVOICE')
  const [docNo,     setDocNo]     = useState('')
  const [counterNo, setCounterNo] = useState('1')
  const [billDate,  setBillDate]  = useState(isoDate(today))
  const [calOpen,   setCalOpen]   = useState(false)
  const [printing,  setPrinting]  = useState(false)
  const overlayRef = useRef()
  const docNoRef = useRef()
  const calWrapRef = useRef()

  const showDate = docType === 'INVOICE'

  useEffect(() => {
    docNoRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') { if (calOpen) setCalOpen(false); else onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, calOpen])

  useEffect(() => {
    if (!calOpen) return
    const handler = e => {
      if (calWrapRef.current && !calWrapRef.current.contains(e.target)) setCalOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [calOpen])

  const handleKey = k => {
    if (k === 'C' || (k === '⌫' && docNo === '')) { setDocNo(''); return }
    if (k === '⌫') { setDocNo(v => v.slice(0, -1)); return }
    setDocNo(v => v + k)
  }

  const handlePrint = async () => {
    const n = docNo.trim()
    if (printing || !n) return
    setPrinting(true)
    try {
      const ok = await onPrint(docType, n, { counterNo, billDate })
      if (ok) onClose()
    } finally {
      setPrinting(false)
    }
  }

  const docLabel = DOC_OPTIONS.find(d => d.key === docType)?.label ?? 'Document'

  const fieldStyle = active => ({
    height: 36, borderRadius: 8, width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand-bg)' : 'var(--surface)',
    padding: '0 12px', fontSize: 15, fontWeight: 700,
    color: 'var(--text-1)', outline: 'none',
  })

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.42)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 520, maxWidth: '95vw',
        background: 'var(--surface)', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px', borderRadius: '24px 24px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Printer size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Receipt</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Reprint</p>
            </div>
          </div>
          <button
            type="button" className="lite-btn" onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, borderRight: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
                Document Type
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {DOC_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const active = docType === opt.key
                  return (
                    <button
                      key={opt.key} type="button" className="lite-btn"
                      onClick={() => setDocType(opt.key)}
                      style={{
                        flex: 1, height: 40, borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${active ? 'var(--brand-border)' : 'var(--border)'}`,
                        background: active ? 'var(--brand-bg)' : 'var(--surface)',
                        color: active ? 'var(--brand)' : 'var(--text-3)',
                        fontSize: 10, fontWeight: 800,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
                {docLabel} No
              </label>
              <input
                ref={docNoRef}
                value={docNo}
                onChange={e => setDocNo(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handlePrint()}
                placeholder="1"
                inputMode="numeric"
                style={fieldStyle(true)}
              />
            </div>

            {showDate && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
                    Counter No
                  </label>
                  <select
                    value={counterNo}
                    onChange={e => setCounterNo(e.target.value)}
                    style={{ ...fieldStyle(false), cursor: 'pointer' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={String(n)}>Counter {n}</option>
                    ))}
                  </select>
                </div>

                <div ref={calWrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
                    Bill Date
                  </label>
                  <button
                    type="button" className="lite-btn"
                    onClick={() => setCalOpen(o => !o)}
                    style={{ ...fieldStyle(calOpen), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: billDate ? 'var(--text-1)' : 'var(--text-4)' }}>
                      {billDate ? formatDisplay(billDate) : 'DD / MM / YYYY'}
                    </span>
                    <CalendarDays size={15} color={calOpen ? 'var(--brand)' : 'var(--text-4)'} />
                  </button>
                  {calOpen && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200, boxShadow: '0 -8px 40px rgba(0,0,0,0.14)', borderRadius: 12, overflow: 'hidden' }}>
                      <Calendar value={billDate} onChange={d => { setBillDate(d); setCalOpen(false) }} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ width: 188, flexShrink: 0, padding: '20px 14px' }}>
            <Numpad onKey={handleKey} showDot={false} showClear showBackspace btnHeight={42} fontSize={17} gap={6} />
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 8, padding: '12px 18px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
          borderRadius: '0 0 24px 24px',
        }}>
          <button
            type="button" className="lite-btn"
            onClick={handlePrint}
            disabled={printing || !docNo.trim()}
            style={{
              flex: 2, height: 40, borderRadius: 10, border: 'none',
              background: printing || !docNo.trim() ? 'var(--surface-3)' : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: '#fff', fontSize: 12, fontWeight: 800, cursor: printing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Printer size={14} /> {printing ? 'Printing…' : 'Print'}
          </button>
          <button
            type="button" className="lite-btn"
            onClick={() => setDocNo('')}
            style={{
              flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FileText size={13} /> Other
          </button>
          <button
            type="button" className="lite-btn" onClick={onClose}
            style={{
              flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
