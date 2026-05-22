import { useEffect, useRef, useState } from 'react'
import { X, Archive, RotateCcw } from 'lucide-react'

/* ── demo data — replace with real store/API ── */
const DEMO_HOLDS = [
  { holdNo: 6,  billTime: '14/01/2025 12:06', salesMan: 'CHIEF CASHIER', total: 145.50, comments: '', items: [
    { sl: 1, barcode: '6281002283', description: 'ONION 1KG',     qty: 2, unitPrice: 5.00,  disc: 0, total: 10.00 },
    { sl: 2, barcode: '6291234567', description: 'RICE BASMATI',  qty: 1, unitPrice: 28.00, disc: 0, total: 28.00 },
  ]},
  { holdNo: 12, billTime: '31/12/2024 02:21', salesMan: 'CHIEF CASHIER', total: 88.00,  comments: '', items: [
    { sl: 1, barcode: '6281009911', description: 'MILK FULL CREAM', qty: 3, unitPrice: 6.50, disc: 0, total: 19.50 },
  ]},
  { holdNo: 16, billTime: '30/12/2024 12:01', salesMan: 'CHIEF CASHIER', total: 210.00, comments: '', items: [] },
  { holdNo: 18, billTime: '31/12/2024 11:34', salesMan: 'CHIEF CASHIER', total: 55.75,  comments: '', items: [] },
  { holdNo: 19, billTime: '03/01/2025 08:33', salesMan: 'CHIEF CASHIER', total: 320.00, comments: '', items: [] },
  { holdNo: 26, billTime: '08/01/2025 07:47', salesMan: 'CHIEF CASHIER', total: 47.00,  comments: '', items: [] },
  { holdNo: 29, billTime: '08/01/2025 04:27', salesMan: 'CHIEF CASHIER', total: 198.25, comments: '', items: [] },
  { holdNo: 30, billTime: '09/01/2025 10:31', salesMan: 'CHIEF CASHIER', total: 63.00,  comments: '', items: [] },
  { holdNo: 31, billTime: '10/01/2025 08:31', salesMan: 'CHIEF CASHIER', total: 112.50, comments: '', items: [] },
  { holdNo: 34, billTime: '14/01/2025 11:51', salesMan: 'CHIEF CASHIER', total: 75.00,  comments: '', items: [] },
  { holdNo: 37, billTime: '21/05/2026 01:18', salesMan: 'CHIEF CASHIER', total: 290.00, comments: '', items: [] },
]

const ITEM_COLS = [
  { key: 'sl',          label: 'SL',               w: 36,  align: 'center' },
  { key: 'barcode',     label: 'Barcode',           w: 110 },
  { key: 'description', label: 'Short Description', flex: true },
  { key: 'qty',         label: 'Qty',              w: 48,  align: 'center' },
  { key: 'unitPrice',   label: 'Unit',             w: 70,  align: 'right' },
  { key: 'disc',        label: 'Disc',             w: 50,  align: 'right' },
  { key: 'total',       label: 'Total',            w: 72,  align: 'right' },
]

export default function RecallHoldModal({ onClose, onRecall }) {
  const [holds]         = useState(DEMO_HOLDS)
  const [selectedIdx,   setSelectedIdx]   = useState(0)
  const [holdNoInput,   setHoldNoInput]   = useState('')
  const [comments,      setComments]      = useState('')
  const overlayRef                        = useRef()
  const holdInputRef                      = useRef()

  const selected = holds[selectedIdx] ?? null

  useEffect(() => {
    holdInputRef.current?.focus()
    const onKey = e => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowUp')   moveSelection(-1)
      if (e.key === 'ArrowDown') moveSelection(1)
      if (e.key === 'Enter')     handleRecall()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIdx, holds])

  const moveSelection = (dir) => {
    setSelectedIdx(i => Math.max(0, Math.min(holds.length - 1, i + dir)))
  }

  const handleRecall = () => {
    if (!selected) return
    onRecall?.(selected)
    onClose()
  }

  const fmt = n => (typeof n === 'number' ? n.toFixed(3) : '—')

  const thStyle = (col) => ({
    width: col.w, flex: col.flex ? 1 : undefined, flexShrink: 0,
    fontSize: 10, fontWeight: 700, color: 'var(--brand)',
    textTransform: 'uppercase', letterSpacing: 0.5,
    textAlign: col.align || 'left', paddingRight: 6,
  })

  const tdStyle = (col, active) => ({
    width: col.w, flex: col.flex ? 1 : undefined, flexShrink: 0,
    fontSize: 11.5, fontWeight: active ? 600 : 400,
    color: active ? 'var(--brand)' : 'var(--text-1)',
    textAlign: col.align || 'left', paddingRight: 6,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  })

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.42)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'rh-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes rh-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes rh-slide { from { opacity:0; transform:scale(0.96) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
        .rh-hold-row:hover { background: var(--surface-2) !important; }
        @media (max-width: 640px) {
          .rh-body { flex-direction: column !important; }
          .rh-left { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--border) !important; max-height: 200px; }
          .rh-right { width: 100% !important; }
        }
      `}</style>

      <div style={{
        width: 820, maxWidth: '96vw', maxHeight: '88vh',
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        animation: 'rh-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Archive size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Bills</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Recall Hold</p>
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

        {/* ── Body — two panels ── */}
        <div className="rh-body" style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* LEFT — hold bills list */}
          <div className="rh-left" style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>

            {/* Left table head */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '0 12px', height: 34, flexShrink: 0,
              background: 'var(--brand-bg)', borderBottom: '1.5px solid var(--brand-border)',
            }}>
              {[{ label: 'Hold No', w: 70 }, { label: 'Bill Time', flex: true }, { label: 'Sales Man', w: 90 }].map(col => (
                <div key={col.label} style={{
                  width: col.w, flex: col.flex ? 1 : undefined, flexShrink: 0,
                  fontSize: 10, fontWeight: 700, color: 'var(--brand)',
                  textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 6,
                }}>{col.label}</div>
              ))}
            </div>

            {/* Left rows — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {holds.map((h, i) => {
                const active = i === selectedIdx
                return (
                  <div
                    key={h.holdNo}
                    className="rh-hold-row"
                    onClick={() => setSelectedIdx(i)}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '0 12px', height: 34,
                      borderBottom: '1px solid var(--border)',
                      background: active ? 'var(--brand-bg)' : i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                      cursor: 'pointer', transition: 'background 0.1s',
                      borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: 70, flexShrink: 0, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--brand)' : 'var(--text-1)' }}>{h.holdNo}</div>
                    <div style={{ flex: 1, fontSize: 11, color: active ? 'var(--brand)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>{h.billTime}</div>
                    <div style={{ width: 90, flexShrink: 0, fontSize: 10.5, color: active ? 'var(--brand)' : 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.salesMan}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT — selected bill items */}
          <div className="rh-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

            {/* Right table head */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '0 12px', height: 34, flexShrink: 0,
              background: 'var(--brand-bg)', borderBottom: '1.5px solid var(--brand-border)',
            }}>
              {ITEM_COLS.map(col => (
                <div key={col.key} style={thStyle(col)}>{col.label}</div>
              ))}
            </div>

            {/* Right rows — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {selected?.items?.length > 0 ? selected.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 12px', height: 34,
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                  }}
                >
                  {ITEM_COLS.map(col => (
                    <div key={col.key} style={tdStyle(col, false)}>
                      {col.key === 'unitPrice' || col.key === 'total' ? fmt(item[col.key]) : item[col.key] ?? '—'}
                    </div>
                  ))}
                </div>
              )) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', minHeight: 120,
                  color: 'var(--text-4)', fontSize: 12, fontWeight: 500,
                }}>
                  {selected ? 'No items on this bill' : 'Select a hold bill'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderTop: '1.5px solid var(--border)',
          background: 'var(--surface-2)', flexShrink: 0, flexWrap: 'wrap',
        }}>

          {/* Comments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 140 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Comments</span>
            <input
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Optional note…"
              style={{
                height: 32, borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                padding: '0 10px', fontSize: 12, color: 'var(--text-1)',
                fontFamily: 'inherit', outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Recall button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'transparent', letterSpacing: 0.7 }}>_</span>
            <button
              onClick={handleRecall}
              style={{
                height: 32, padding: '0 20px', borderRadius: 8, border: 'none',
                background: selected
                  ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                  : 'var(--surface-3)',
                color: selected ? '#fff' : 'var(--text-4)',
                fontSize: 12, fontWeight: 800,
                cursor: selected ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: selected ? '0 4px 14px rgba(107,0,0,0.22)' : 'none',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (selected) e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,0,0,0.32)' }}
              onMouseLeave={e => { if (selected) e.currentTarget.style.boxShadow = '0 4px 14px rgba(107,0,0,0.22)' }}
              onMouseDown={e => { if (selected) e.currentTarget.style.transform = 'scale(0.96)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <RotateCcw size={13} /> Recall
            </button>
          </div>

          {/* Hold No */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 100 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Hold No</span>
            <input
              ref={holdInputRef}
              value={holdNoInput}
              onChange={e => {
                setHoldNoInput(e.target.value)
                const idx = holds.findIndex(h => String(h.holdNo) === e.target.value)
                if (idx >= 0) setSelectedIdx(idx)
              }}
              onKeyDown={e => e.key === 'Enter' && handleRecall()}
              placeholder={selected?.holdNo ?? '—'}
              style={{
                height: 32, borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                padding: '0 10px', fontSize: 13, fontWeight: 700,
                color: 'var(--text-1)', fontFamily: "'JetBrains Mono', monospace",
                outline: 'none', textAlign: 'center',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Bill Total */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Bill Total</span>
            <div style={{
              height: 32, minWidth: 110, borderRadius: 8,
              border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
              padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            }}>
              <span style={{
                fontSize: 15, fontWeight: 800, color: 'var(--brand)',
                fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums',
              }}>
                {selected ? fmt(selected.total) : '0.000'}
              </span>
            </div>
          </div>

          {/* Enter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'transparent', letterSpacing: 0.7 }}>_</span>
            <button
              onClick={handleRecall}
              style={{
                height: 32, padding: '0 20px', borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-2)', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Enter
            </button>
          </div>

          {/* Cancel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 'auto' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'transparent', letterSpacing: 0.7 }}>_</span>
            <button
              onClick={onClose}
              style={{
                height: 32, padding: '0 16px', borderRadius: 8,
                border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                color: 'var(--red)', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
