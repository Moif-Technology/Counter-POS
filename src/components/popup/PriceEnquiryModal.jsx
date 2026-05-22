import { useEffect, useRef, useState } from 'react'
import { X, Delete, ScanBarcode } from 'lucide-react'

const DEMO_ITEMS = [
  { sl: 1, barcode: '6291003091219', description: 'TOMATO VEG 500G',   pack: '1 x 500g',  unitPrice: 5.000,  discount: 0,  vatPer: 5, vatAmt: 0.250, price: 5.250  },
  { sl: 2, barcode: '6291003091220', description: 'FRESH MILK 1L',     pack: '1 x 1L',    unitPrice: 3.500,  discount: 0,  vatPer: 5, vatAmt: 0.175, price: 3.675  },
  { sl: 3, barcode: '6291003091221', description: 'OLIVE OIL 750ML',   pack: '1 x 750ml', unitPrice: 12.000, discount: 5,  vatPer: 5, vatAmt: 0.570, price: 11.970 },
  { sl: 4, barcode: '6291003091222', description: 'BROWN BREAD 400G',  pack: '1 x 400g',  unitPrice: 1.800,  discount: 0,  vatPer: 0, vatAmt: 0.000, price: 1.800  },
  { sl: 5, barcode: '6291003091223', description: 'ORANGE JUICE 1L',   pack: '1 x 1L',    unitPrice: 4.250,  discount: 10, vatPer: 5, vatAmt: 0.191, price: 3.991  },
  { sl: 6, barcode: '6291003091224', description: 'BASMATI RICE 5KG',  pack: '1 x 5kg',   unitPrice: 8.500,  discount: 0,  vatPer: 5, vatAmt: 0.425, price: 8.925  },
  { sl: 7, barcode: '6291003091225', description: 'CHEDDAR CHEESE 200G',pack:'1 x 200g',  unitPrice: 6.750,  discount: 5,  vatPer: 5, vatAmt: 0.321, price: 6.729  },
]

const COLS = '36px 1fr 120px 70px 64px 52px 64px 70px'
const HEADS = ['Sl#', 'Description', 'Pack Details', 'Unit Price', 'Discount', 'VAT%', 'VAT Amt', 'Price']
const NUM_KEYS = [['7','8','9'],['4','5','6'],['1','2','3']]
const fmt = n => n.toFixed(3)

function TableRow({ row, isLast, highlight }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: COLS,
        padding: '8px 10px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: highlight ? 'rgba(107,0,0,0.06)' : hover ? 'var(--surface-2)' : '#fff',
        borderLeft: highlight ? '3px solid var(--brand)' : '3px solid transparent',
        transition: 'background 0.1s',
        borderRadius: isLast ? '0 0 8px 8px' : 0,
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600 }}>{row.sl}</span>
      <span style={{ fontSize: 11, color: 'var(--text-1)', fontWeight: highlight ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</span>
      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{row.pack}</span>
      <span style={{ fontSize: 11, color: 'var(--text-1)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(row.unitPrice)}</span>
      <span style={{ fontSize: 11, color: row.discount ? 'var(--amber)' : 'var(--text-4)', fontWeight: row.discount ? 700 : 400 }}>{row.discount}%</span>
      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{row.vatPer}%</span>
      <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(row.vatAmt)}</span>
      <span style={{ fontSize: 11, color: 'var(--brand)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmt(row.price)}</span>
    </div>
  )
}

export default function PriceEnquiryModal({ onClose }) {
  const [barcode,  setBarcode]  = useState('')
  const [result,   setResult]   = useState(null)
  const [searched, setSearched] = useState(false)
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pressKey = k => {
    if (k === 'CLR') { setBarcode(''); setResult(null); setSearched(false); return }
    if (k === '⌫')  { setBarcode(v => v.slice(0, -1)); return }
    setBarcode(v => v + k)
  }

  const handleEnter = () => {
    setSearched(true)
    setResult(DEMO_ITEMS.find(i => i.barcode === barcode.trim()) || null)
  }

  const stat = result
    ? { unitPrice: result.unitPrice, vatPer: result.vatPer, priceWithTax: result.price, qtyOnHand: 24 }
    : { unitPrice: 0, vatPer: 0, priceWithTax: 0, qtyOnHand: 0 }

  const STATS = [
    { label: 'Unit Price',     value: fmt(stat.unitPrice),    accent: false },
    { label: 'Vat %',          value: stat.vatPer + '%',      accent: false },
    { label: 'Price With Tax', value: fmt(stat.priceWithTax), accent: true  },
    { label: 'Qty On Hand',    value: stat.qtyOnHand,         accent: false },
  ]

  const numBtn = (k, opts = {}) => (
    <button
      key={k}
      onClick={() => pressKey(k)}
      style={{
        flex: opts.flex || 1, height: 42, borderRadius: 8,
        border: `1.5px solid ${opts.border || 'var(--border)'}`,
        background: opts.bg || '#fff',
        color: opts.color || 'var(--text-1)',
        fontSize: opts.fontSize || 15, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => {
        if (opts.bg) { e.currentTarget.style.filter = 'brightness(0.93)'; return }
        e.currentTarget.style.background  = 'var(--brand-bg)'
        e.currentTarget.style.borderColor = 'var(--brand-border)'
        e.currentTarget.style.color       = 'var(--brand)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter      = 'brightness(1)'
        e.currentTarget.style.background  = opts.bg || '#fff'
        e.currentTarget.style.borderColor = opts.border || 'var(--border)'
        e.currentTarget.style.color       = opts.color || 'var(--text-1)'
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >{k === '⌫' ? <Delete size={14} /> : k}</button>
  )

  const displayRows = searched ? (result ? [result] : []) : DEMO_ITEMS

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.4)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pe-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes pe-fade  { from{opacity:0} to{opacity:1} }
        @keyframes pe-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      <div style={{
        width: 860, maxWidth: '97vw', maxHeight: '88vh',
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'pe-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ScanBarcode size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Price Enquiry</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Body: left table | right panel ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT: table ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px 6px 12px 12px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(0,0,0,0.18)', borderRadius: 10, overflow: 'hidden' }}>

              {/* Heading */}
              <div style={{
                display: 'grid', gridTemplateColumns: COLS,
                background: 'var(--brand-bg)', borderBottom: '1px solid rgba(0,0,0,0.18)',
                padding: '8px 10px', flexShrink: 0, borderRadius: '8px 8px 0 0',
              }}>
                {HEADS.map(h => (
                  <span key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {searched && displayRows.length === 0 && (
                  <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>No item found for this barcode</p>
                  </div>
                )}
                {displayRows.map((row, i) => (
                  <TableRow
                    key={row.sl}
                    row={row}
                    isLast={i === displayRows.length - 1}
                    highlight={searched && !!result}
                  />
                ))}
              </div>

            </div>
          </div>

          {/* ── RIGHT: stats + barcode + numpad ── */}
          <div style={{ width: 252, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '12px', gap: 10, flexShrink: 0 }}>

            {/* Stat cards 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {STATS.map(s => (
                <div key={s.label} style={{
                  borderRadius: 9, padding: '8px 10px',
                  border: `1.5px solid ${s.accent ? 'var(--brand-border)' : 'var(--border)'}`,
                  background: s.accent ? 'var(--brand-bg)' : 'var(--surface-2)',
                }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: s.accent ? 'var(--brand)' : 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{s.label}</p>
                  <p style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: s.accent ? 'var(--brand)' : 'var(--text-1)', fontFamily: 'inherit' }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Barcode input */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Bar Code</label>
              <div style={{ display: 'flex', gap: 5 }}>
                <input
                  readOnly
                  value={barcode}
                  placeholder="Scan or type…"
                  style={{
                    flex: 1, height: 34, padding: '0 10px', borderRadius: 7,
                    border: '1.5px solid var(--brand)', background: 'var(--brand-bg)',
                    fontSize: 12, fontWeight: 700, color: 'var(--text-1)', outline: 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <button
                  onClick={() => pressKey('⌫')}
                  style={{
                    width: 34, height: 34, borderRadius: 7, flexShrink: 0,
                    border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                    color: 'var(--red)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'filter 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.93)' }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
                >
                  <Delete size={13} />
                </button>
              </div>
            </div>

            {/* Numpad */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {NUM_KEYS.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 5 }}>
                  {row.map(k => numBtn(k))}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 5 }}>
                {numBtn('0')}
                {numBtn('CLR', { bg: 'var(--amber-bg)', border: 'var(--amber-border)', color: 'var(--amber)', fontSize: 11 })}
                <button
                  onClick={handleEnter}
                  style={{
                    flex: 1, height: 42, borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
                    color: '#fff', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', transition: 'filter 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >Enter</button>
              </div>
            </div>

            {/* Close */}
            <div style={{ marginTop: 'auto' }}>
              <button
                onClick={onClose}
                style={{
                  width: '100%', height: 36, borderRadius: 8,
                  border: '1.5px solid var(--border)', background: '#fff',
                  color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
              >Close</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
