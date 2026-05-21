import { useEffect, useRef, useState } from 'react'
import { X, Search, Trash2, SlidersHorizontal } from 'lucide-react'

const COLUMNS = [
  { key: 'barcode',       label: 'Barcode',        w: 130 },
  { key: 'description',   label: 'Description',    flex: true },
  { key: 'packetDetails', label: 'Packet Details',  w: 130 },
  { key: 'price',         label: 'Price',           w: 90, align: 'right' },
]

export default function ProductLookupModal({ onClose, onSelect }) {
  const [shortDesc, setShortDesc] = useState('')
  const [price,     setPrice]     = useState('')
  const [group,     setGroup]     = useState('')
  const [results,   setResults]   = useState([])
  const [selected,  setSelected]  = useState(null)
  const overlayRef                = useRef()
  const descRef                   = useRef()

  useEffect(() => {
    descRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSearch = () => {
    // Placeholder — replace with real API/store lookup
    setResults([])
  }

  const handleClearAll = () => {
    setShortDesc('')
    setPrice('')
    setGroup('')
    setResults([])
    setSelected(null)
    descRef.current?.focus()
  }

  const handleRowClick = (row) => {
    setSelected(row)
    onSelect?.(row)
    onClose()
  }

  const inputStyle = {
    width: '100%', height: 34, borderRadius: 8,
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    padding: '0 10px', fontSize: 12, color: 'var(--text-1)',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.12s',
  }

  const field = (label, input) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>
        {label}
      </span>
      {input}
    </div>
  )

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.38)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 720, maxWidth: '96vw', maxHeight: '85vh',
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'pl-slide 0.16s cubic-bezier(.22,.68,0,1.2)',
      }}>
        <style>{`
          @keyframes pl-slide { from { opacity:0; transform:scale(0.96) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        `}</style>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Search size={14} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Product</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Product Search</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Search bar ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)', flexShrink: 0,
        }}>
          {/* Short Description — wider */}
          <div style={{ flex: 3 }}>
            {field('Short Description',
              <input
                ref={descRef}
                value={shortDesc}
                onChange={e => setShortDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name…"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
            )}
          </div>

          {/* Price */}
          <div style={{ flex: 1 }}>
            {field('Price',
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="0.000"
                style={{ ...inputStyle, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}
                onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
            )}
          </div>

          {/* Group */}
          <div style={{ flex: 1 }}>
            {field('Group',
              <input
                value={group}
                onChange={e => setGroup(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="All"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
            )}
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8, flexShrink: 0,
              border: 'none',
              background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 8px rgba(107,0,0,0.18)',
              transition: 'box-shadow 0.12s, transform 0.08s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(107,0,0,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(107,0,0,0.18)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Search size={13} /> Search
          </button>

          {/* Clear All */}
          <button
            onClick={handleClearAll}
            style={{
              height: 34, padding: '0 14px', borderRadius: 8, flexShrink: 0,
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>

        {/* ── Table header ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 14px', height: 34, flexShrink: 0,
          borderBottom: '1.5px solid var(--brand-border)',
          background: 'var(--brand-bg)',
        }}>
          {COLUMNS.map(col => (
            <div
              key={col.key}
              style={{
                width: col.w, flex: col.flex ? 1 : undefined,
                fontSize: 10.5, fontWeight: 700, color: 'var(--brand)',
                textTransform: 'uppercase', letterSpacing: 0.5,
                textAlign: col.align || 'left',
                paddingRight: 8,
              }}
            >{col.label}</div>
          ))}
        </div>

        {/* ── Results ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-2)' }}>
          {results.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: 200,
              color: 'var(--text-4)', fontSize: 13, fontWeight: 500,
            }}>
              No results found
            </div>
          ) : (
            results.map((row, i) => {
              const isActive = selected?.barcode === row.barcode
              return (
                <div
                  key={i}
                  onClick={() => handleRowClick(row)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 14px', height: 36,
                    borderBottom: '1px solid var(--border)',
                    background: isActive ? 'var(--brand-bg)' : i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-3)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = i % 2 === 0 ? '#fff' : 'var(--surface-2)' }}
                >
                  {COLUMNS.map(col => (
                    <div
                      key={col.key}
                      style={{
                        width: col.w, flex: col.flex ? 1 : undefined,
                        fontSize: 12, color: isActive ? 'var(--brand)' : 'var(--text-1)',
                        fontWeight: isActive ? 600 : 400,
                        textAlign: col.align || 'left',
                        paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >{row[col.key] ?? '—'}</div>
                  ))}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
