import { useEffect, useRef, useState } from 'react'
import { X, Package } from 'lucide-react'
import Table from '../../components/ui/Table'
import Numpad from '../../components/ui/Numpad'
import { fmtMoney, moneyPlaceholder } from '../../lib/currencyFormat'
import { searchLiteProducts } from './liteProducts'
import { posNotifySuccess, posNotifyWarning } from '../../lib/posNotify'

const COLUMNS = [
  { key: 'sl',          label: 'Sl#',          width: 40,  align: 'center' },
  { key: 'barcode',     label: 'Barcode',       width: 110, mono: true },
  { key: 'description', label: 'Description'               },
  { key: 'packDetails', label: 'Pack Details',  width: 90 },
  { key: 'unitPrice',   label: 'Unit Price',    width: 80,  align: 'right', mono: true },
  { key: 'discount',    label: 'Discount',      width: 70,  align: 'right', mono: true },
]

export default function LitePacketScanModal({ onClose, onAddItem }) {
  const [barcode, setBarcode] = useState('')
  const [rows,    setRows]    = useState([])
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleKey = k => {
    if (k === 'C')  { setBarcode(''); return }
    if (k === '⌫') { setBarcode(v => v.slice(0, -1)); return }
    setBarcode(v => v + k)
  }

  const handleEnter = () => {
    const code = barcode.trim()
    if (!code) return
    const match = searchLiteProducts(code).find(p => p.barcode === code)
    const newRow = match
      ? {
          sl:          rows.length + 1,
          barcode:     match.barcode,
          description: match.description,
          packDetails: match.group ?? '—',
          unitPrice:   fmtMoney(match.price),
          discount:    moneyPlaceholder(),
        }
      : {
          sl:          rows.length + 1,
          barcode:     code,
          description: 'Not found',
          packDetails: '—',
          unitPrice:   moneyPlaceholder(),
          discount:    moneyPlaceholder(),
        }
    setRows(prev => [...prev, newRow])
    setBarcode('')

    if (match) {
      onAddItem?.(match)
      posNotifySuccess(`${match.description} added`, { title: 'Packet Scan', duration: 900 })
    } else {
      posNotifyWarning(`No item for barcode ${code}`, { title: 'Packet Scan' })
    }
  }

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.42)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'lps-fade 0.15s ease', padding: 12,
      }}
    >
      <style>{`
        @keyframes lps-fade  { from{opacity:0} to{opacity:1} }
        @keyframes lps-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @media (max-width: 640px) {
          .lps-body { flex-direction: column !important; }
          .lps-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; min-height: 180px; }
          .lps-right { width: 100% !important; }
        }
      `}</style>

      <div style={{
        width: 820, maxWidth: '97vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 28px 72px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'lps-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Package size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Scanner</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Packet Scan</p>
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
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="lps-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* LEFT — table */}
          <div className="lps-left" style={{ flex: 1, padding: '16px 16px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid rgba(0,0,0,0.18)', borderRadius: 10 }}>
              <Table
                columns={COLUMNS}
                rows={rows}
                rowKey="sl"
                emptyText="Scan a barcode to add items"
              />
            </div>
          </div>

          {/* RIGHT — barcode input + numpad */}
          <div className="lps-right" style={{ width: 220, flexShrink: 0, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* BarCode field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
                BarCode
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{
                  flex: 1, height: 40, borderRadius: 8,
                  border: '1.5px solid var(--brand)', background: 'var(--brand-bg)',
                  display: 'flex', alignItems: 'center', padding: '0 10px',
                  fontSize: 13, fontWeight: 700, color: barcode ? 'var(--text-1)' : 'var(--text-4)',
                  fontFamily: "'JetBrains Mono', monospace",
                  overflow: 'hidden',
                }}>
                  {barcode || <span style={{ fontWeight: 500, fontSize: 11 }}>Scan or type…</span>}
                </div>
                <button
                  onClick={() => setBarcode('')}
                  style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: 'var(--amber-bg)', border: '1.5px solid var(--amber-border)',
                    color: 'var(--amber)', fontSize: 12, fontWeight: 800,
                    cursor: 'pointer', transition: 'all 0.12s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--amber-bg)'; e.currentTarget.style.color = 'var(--amber)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Numpad */}
            <Numpad
              onKey={handleKey}
              showDot={false}
              showClear={false}
              showBackspace={true}
              btnHeight={46}
              fontSize={17}
              gap={7}
              extraRows={[[
                {
                  label: 'Enter',
                  flex: 1,
                  style: {
                    background: barcode.trim()
                      ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                      : 'var(--border)',
                    color: barcode.trim() ? '#fff' : 'var(--text-4)',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 800,
                    boxShadow: barcode.trim() ? '0 4px 12px rgba(107,0,0,0.2)' : 'none',
                  },
                  onClick: handleEnter,
                },
              ]]}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '10px 16px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              height: 44, paddingInline: 28, borderRadius: 10,
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
