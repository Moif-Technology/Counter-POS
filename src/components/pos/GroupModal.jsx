import { useEffect, useRef, useState } from 'react'
import { X, Search, Tag, Delete } from 'lucide-react'

const GROUPS = [
  '06', 'Frozen Fish', 'Telephone Card',
  '12', 'Frozen Food', 'Tobacco',
  'Bakery', 'Garments & Foodwear', 'Vegetable',
  'Beverages', 'Home Care', 'Cosmetics',
  'House Hold Item', 'Disp. Plastic', 'Newspaper & Magazine',
  'Electronics', 'Rice & Spices', 'Food Items',
  'Stationery', 'Fresh Meat', 'Sweets & Chocolate',
]

export default function GroupModal({ onClose, onSelect }) {
  const [selected, setSelected]   = useState(null)
  const [price, setPrice]         = useState('')
  const [search, setSearch]       = useState('')
  const overlayRef                = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = GROUPS.filter(g => g.toLowerCase().includes(search.toLowerCase()))

  const pressNum = (k) => {
    if (k === 'C') { setPrice(''); return }
    if (k === '.' && price.includes('.')) return
    setPrice(p => p + k)
  }

  const handleDone = () => {
    if (selected) onSelect?.({ group: selected, unitPrice: parseFloat(price) || 0 })
    onClose()
  }

  const numKeys = ['7','8','9','4','5','6','1','2','3','0','.','C']

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
        animation: 'gm-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes gm-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes gm-slide { from { opacity:0; transform:scale(0.96) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
      `}</style>

      <div style={{
        width: 700, maxWidth: '95vw', maxHeight: '88vh',
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        animation: 'gm-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}>

        {/* ── Header ── */}
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
              <Tag size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Select</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Product Group</p>
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

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* LEFT — group grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>

            {/* Search */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                borderRadius: 10, padding: '0 12px', height: 36,
              }}>
                <Search size={13} color="var(--text-4)" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search group…"
                  autoFocus
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontSize: 13, color: 'var(--text-1)', fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {filtered.map(g => {
                  const active = selected === g
                  return (
                    <button
                      key={g}
                      onClick={() => setSelected(g)}
                      style={{
                        padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                        background: active ? 'var(--brand-bg)' : 'var(--surface)',
                        color: active ? 'var(--brand)' : 'var(--text-2)',
                        fontSize: 11.5, fontWeight: active ? 700 : 500,
                        textAlign: 'center', lineHeight: 1.3,
                        transition: 'all 0.12s',
                        boxShadow: active ? '0 0 0 3px var(--brand-glow)' : 'var(--shadow-xs)',
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' } }}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — unit price + numpad */}
          <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '14px 14px 0' }}>

            {/* Unit price display */}
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
              Unit Price
            </p>
            <div style={{
              height: 48, borderRadius: 10, marginBottom: 12,
              border: '1.5px solid var(--border)', background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              padding: '0 14px',
            }}>
              <span style={{
                fontSize: price ? 22 : 16, fontWeight: 800,
                color: price ? 'var(--text-1)' : 'var(--text-4)',
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: 'tabular-nums',
              }}>
                {price || '0.000'}
              </span>
            </div>

            {/* Numpad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, flex: 1 }}>
              {numKeys.map(k => {
                const isClear  = k === 'C'
                return (
                  <button
                    key={k}
                    onClick={() => pressNum(k)}
                    style={{
                      height: 44, borderRadius: 10,
                      border: `1.5px solid ${isClear ? 'var(--red-border)' : 'var(--border)'}`,
                      background: isClear ? 'var(--red-bg)' : 'var(--surface)',
                      color: isClear ? 'var(--red)' : 'var(--text-1)',
                      fontSize: isClear ? 13 : 18, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'JetBrains Mono', monospace",
                      boxShadow: 'var(--shadow-xs)',
                      transition: 'transform 0.07s, background 0.08s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = isClear ? 'var(--red)' : 'var(--surface-2)'; if (isClear) e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isClear ? 'var(--red-bg)' : 'var(--surface)'; if (isClear) e.currentTarget.style.color = 'var(--red)' }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    {isClear ? <Delete size={15} /> : k}
                  </button>
                )
              })}
            </div>

            {/* Done / Cancel */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 0 14px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, height: 40, borderRadius: 10,
                  border: '1.5px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDone}
                style={{
                  flex: 1, height: 40, borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
                  color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(107,0,0,0.22)',
                  transition: 'box-shadow 0.12s, transform 0.08s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,0,0,0.32)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(107,0,0,0.22)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                Done
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
