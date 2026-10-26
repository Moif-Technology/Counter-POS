import { useEffect, useRef, useState } from 'react'
import { Printer, FileText, Receipt, Truck, Package } from 'lucide-react'
import DatePicker from '../components/common/DatePicker'
import Numpad from '../components/common/Numpad'
import { usePosStore } from '../store/posStore'
import { printBillReprintByNo } from '../lib/printBillReceipt'
import { printHoldReprintByNo } from '../lib/printHoldReceipt'
import { printDeliveryReprintByNo } from '../lib/printDeliveryReceipt'
import { DOC_TYPE } from '../lib/documentScan'
import { posNotifyError } from '../lib/posNotify'
import Modal from '../components/common/Modal'

const today = new Date()
const isoDate = d => d.toISOString().split('T')[0]

const DOC_OPTIONS = [
  { key: DOC_TYPE.INVOICE, label: 'Invoice', icon: Receipt },
  { key: DOC_TYPE.HOLD, label: 'Hold', icon: Package },
  { key: DOC_TYPE.DELIVERY, label: 'Delivery Note', icon: Truck },
]

export default function BillReprintModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const shopName    = usePosStore(s => s.shopName)
  const storeCounter = usePosStore(s => s.counterNo)

  const [docType,     setDocType]     = useState(DOC_TYPE.INVOICE)
  const [docNo,       setDocNo]       = useState('')
  const [counterNo,   setCounterNo]   = useState(String(storeCounter ?? 1))
  const [billDate,    setBillDate]    = useState(isoDate(today))
  const [focus,       setFocus]       = useState('docNo')
  const [printing,    setPrinting]    = useState(false)
  const docNoRef     = useRef()

  const showDate = docType === DOC_TYPE.INVOICE

  useEffect(() => {
    docNoRef.current?.focus()
  }, [onClose])

  const handleKey = k => {
    if (focus !== 'docNo') return
    if (k === 'C' || (k === '⌫' && docNo === '')) { setDocNo(''); return }
    if (k === '⌫') { setDocNo(v => v.slice(0, -1)); return }
    setDocNo(v => v + k)
  }

  const handlePrint = async () => {
    const n = docNo.trim()
    if (printing || !n) {
      if (!n) posNotifyError('Enter document number', { title: 'Reprint' })
      return
    }
    if (!/^\d+$/.test(n)) {
      posNotifyError('Enter numbers only (no prefix)', { title: 'Reprint' })
      return
    }
    setPrinting(true)
    const meta = { companyName: shopName, counterNo: counterNo || storeCounter }
    try {
      if (docType === DOC_TYPE.INVOICE) {
        await printBillReprintByNo(n, accessToken, meta)
      } else if (docType === DOC_TYPE.HOLD) {
        await printHoldReprintByNo(n, accessToken, meta)
      } else {
        await printDeliveryReprintByNo(n, accessToken, meta)
      }
    } catch (e) {
      posNotifyError(e.message ?? 'Print failed', { title: 'Reprint' })
    } finally {
      setPrinting(false)
    }
  }

  const handleOther = () => { setDocNo(''); setFocus('docNo'); docNoRef.current?.focus() }

  const fieldStyle = active => ({
    height: 36, borderRadius: 8, width: '100%', boxSizing: 'border-box',
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand-bg)' : 'var(--surface)',
    padding: '0 12px', fontSize: 15, fontWeight: 700,
    color: 'var(--text-1)', fontFamily: 'inherit',
    outline: 'none', cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s',
  })

  const docLabel = DOC_OPTIONS.find(d => d.key === docType)?.label ?? 'Document'

  return (
    <Modal onClose={onClose} icon={Printer} kicker="Receipt" title="Reprint" width={520}>

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
                    key={opt.key}
                    type="button"
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
            <input className="ui-input" data-active={(focus === 'docNo') ? 'true' : undefined}
              ref={docNoRef}
              value={docNo}
              onChange={e => setDocNo(e.target.value.replace(/\D/g, ''))}
              onFocus={() => setFocus('docNo')}
              placeholder="42"
              inputMode="numeric"
              style={fieldStyle(focus === 'docNo')}
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

              <DatePicker label="Bill Date" value={billDate} onChange={setBillDate} />
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
          onClick={handlePrint}
          disabled={printing}
          style={{
            flex: 2, height: 40, borderRadius: 10, border: 'none',
            background: printing ? 'var(--surface-3)' : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
            color: '#fff', fontSize: 12, fontWeight: 800, cursor: printing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <Printer size={14} /> {printing ? 'Printing…' : 'Print'}
        </button>
        <button onClick={handleOther} style={{
          flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)',
          color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <FileText size={13} /> Other
        </button>
        <button onClick={onClose} style={{
          flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
          color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          Close
        </button>
      </div>
    </Modal>
  )
}
