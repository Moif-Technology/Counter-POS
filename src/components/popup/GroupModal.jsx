import { useEffect, useRef, useState } from 'react'
import { X, Tag, Delete, Loader2 } from 'lucide-react'
import { api } from '../../lib/api'
import { usePosStore } from '../../store/posStore'

export default function GroupModal({ onClose, onSelect }) {
  const [groups,   setGroups]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [price,    setPrice]    = useState('')
  const [search,   setSearch]   = useState('')
  const overlayRef              = useRef()
  const accessToken             = usePosStore(s => s.accessToken)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { groups: list } = await api.counterPos.groupsList(accessToken)
        setGroups(list ?? [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [accessToken])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = groups.filter(g =>
    g.groupDescription.toLowerCase().includes(search.toLowerCase())
  )

  const pressNum = (k) => {
    if (k === 'C') { setPrice(''); return }
    if (k === '.' && price.includes('.')) return
    setPrice(p => p + k)
  }

  const handleGroupClick = (g) => {
    setSelected(g)
    setPrice('')
    if (g.keyShift === 1) {
      // Product lookup mode — pass control back to caller to open product lookup
      onSelect?.({ group: g, mode: 'product_lookup' })
      onClose()
    }
  }

  const handleDone = () => {
    if (!selected) return
    onSelect?.({ group: selected, unitPrice: parseFloat(price) || 0, mode: 'price_entry' })
    onClose()
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
        animation: 'gm-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes gm-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes gm-slide { from { opacity:0; transform:scale(0.96) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes gm-spin  { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
      `}</style>

      <div style={{
        width: 700, maxWidth: '95vw', maxHeight: '88vh',
        background: '#fff', borderRadius: 24, overflow: 'hidden',
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
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
              {loading ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 180, color: 'var(--text-4)', fontSize: 13,
                }}>
                  <Loader2 size={16} color="var(--brand)" style={{ animation: 'gm-spin 0.8s linear infinite' }} />
                  Loading groups…
                </div>
              ) : error ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 180, color: 'var(--red)', fontSize: 12, fontWeight: 600,
                }}>
                  {error}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 180, color: 'var(--text-4)', fontSize: 13,
                }}>
                  No groups found
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {filtered.map(g => {
                    const active    = selected?.groupId === g.groupId
                    const isLookup  = g.keyShift === 1
                    return (
                      <button
                        key={g.groupId}
                        onClick={() => handleGroupClick(g)}
                        title={isLookup ? 'Opens product search' : 'Enter price'}
                        style={{
                          padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                          background: active ? 'var(--brand-bg)' : 'var(--surface)',
                          color: active ? 'var(--brand)' : 'var(--text-2)',
                          fontSize: 11.5, fontWeight: active ? 700 : 500,
                          textAlign: 'center', lineHeight: 1.3,
                          transition: 'all 0.12s',
                          boxShadow: active ? '0 0 0 3px var(--brand-glow)' : 'var(--shadow-xs)',
                          position: 'relative',
                        }}
                        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
                        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' } }}
                      >
                        {g.groupDescription}
                        {isLookup && (
                          <span style={{
                            display: 'block', fontSize: 9, fontWeight: 600,
                            color: active ? 'var(--brand)' : 'var(--text-4)',
                            marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5,
                          }}>Browse</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — unit price + numpad (only for price-entry groups) */}
          <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '10px 12px 0' }}>

            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
              Unit Price
            </p>
            <div style={{
              height: 40, borderRadius: 8, marginBottom: 8,
              border: `1.5px solid ${selected && selected.keyShift !== 1 ? 'var(--brand)' : 'var(--border)'}`,
              background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              padding: '0 12px',
            }}>
              <span style={{
                fontSize: price ? 20 : 14, fontWeight: 800,
                color: price ? 'var(--text-1)' : 'var(--text-4)',
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: 'tabular-nums',
              }}>
                {price || '0.000'}
              </span>
            </div>

            {/* Numpad */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[['7','8','9'],['4','5','6'],['1','2','3']].map(row => (
                <div key={row[0]} style={{ display: 'flex', gap: 4 }}>
                  {row.map(k => (
                    <button
                      key={k}
                      onClick={() => pressNum(k)}
                      style={{
                        flex: 1, height: 38, borderRadius: 8,
                        border: '1.5px solid var(--border)', background: 'var(--surface)',
                        color: 'var(--text-1)', fontSize: 16, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'JetBrains Mono', monospace",
                        boxShadow: 'var(--shadow-xs)', transition: 'transform 0.07s, background 0.08s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
                      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                    >{k}</button>
                  ))}
                </div>
              ))}

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => pressNum('.')}
                  style={{
                    flex: 1, height: 38, borderRadius: 8,
                    border: '1.5px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--text-1)', fontSize: 18, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'JetBrains Mono', monospace",
                    boxShadow: 'var(--shadow-xs)', transition: 'transform 0.07s, background 0.08s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >.</button>
                <button
                  onClick={() => pressNum('0')}
                  style={{
                    flex: 2, height: 38, borderRadius: 8,
                    border: '1.5px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--text-1)', fontSize: 16, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'JetBrains Mono', monospace",
                    boxShadow: 'var(--shadow-xs)', transition: 'transform 0.07s, background 0.08s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >0</button>
                <button
                  onClick={() => pressNum('C')}
                  style={{
                    flex: 1, height: 38, borderRadius: 8,
                    border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                    color: 'var(--red)', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    boxShadow: 'var(--shadow-xs)', transition: 'background 0.08s, color 0.08s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <Delete size={12} />
                </button>
              </div>
            </div>

            {/* Done / Cancel */}
            <div style={{ display: 'flex', gap: 6, padding: '8px 0 10px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, height: 36, borderRadius: 8,
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
                disabled={!selected || !price}
                style={{
                  flex: 1, height: 36, borderRadius: 8, border: 'none',
                  background: selected && price
                    ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                    : 'var(--surface-3)',
                  color: selected && price ? '#fff' : 'var(--text-4)',
                  fontSize: 12, fontWeight: 800,
                  cursor: selected && price ? 'pointer' : 'not-allowed',
                  boxShadow: selected && price ? '0 4px 14px rgba(107,0,0,0.22)' : 'none',
                  transition: 'box-shadow 0.12s, transform 0.08s',
                }}
                onMouseEnter={e => { if (selected && price) e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,0,0,0.32)' }}
                onMouseLeave={e => { if (selected && price) e.currentTarget.style.boxShadow = '0 4px 14px rgba(107,0,0,0.22)' }}
                onMouseDown={e => { if (selected && price) e.currentTarget.style.transform = 'scale(0.97)' }}
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
