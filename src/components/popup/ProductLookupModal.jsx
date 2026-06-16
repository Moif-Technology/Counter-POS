import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Search, Trash2, Loader2 } from 'lucide-react'
import { api } from '../../lib/api'
import { usePosStore } from '../../store/posStore'

const COLUMNS = [
  { key: 'barcode',       label: 'Barcode',     w: 130 },
  { key: 'description',   label: 'Description', flex: true },
  { key: 'packetDetails', label: 'Unit',         w: 130 },
  { key: 'price',         label: 'Price',        w: 90, align: 'right' },
]

const DEBOUNCE_MS = 350

export default function ProductLookupModal({ onClose, onSelect }) {
  const [query,    setQuery]    = useState('')
  const [price,    setPrice]    = useState('')
  const [results,  setResults]  = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [searched, setSearched] = useState(false)
  const overlayRef  = useRef()
  const queryRef    = useRef()
  const debounceRef = useRef(null)
  const accessToken = usePosStore(s => s.accessToken)

  useEffect(() => {
    queryRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const runSearch = useCallback(async (q, p) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const { products } = await api.counterPos.productLookup(q, p || null, accessToken)
      setResults((products ?? []).map(prod => ({
        barcode:       prod.barcode ?? prod.productCode,
        description:   prod.description,
        packetDetails: prod.unitName ?? '—',
        price:         Number(prod.unitPrice ?? 0).toFixed(3),
        _raw:          prod,
      })))
    } catch (e) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  const scheduleSearch = (q, p) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(q, p), DEBOUNCE_MS)
  }

  const fireNow = (q, p) => {
    clearTimeout(debounceRef.current)
    runSearch(q, p)
  }

  const handleQueryChange = e => {
    const q = e.target.value
    setQuery(q)
    scheduleSearch(q, price)
  }

  const handlePriceChange = e => {
    const p = e.target.value
    setPrice(p)
    scheduleSearch(query, p)
  }

  const handleClearAll = () => {
    clearTimeout(debounceRef.current)
    setQuery('')
    setPrice('')
    setResults([])
    setSelected(null)
    setSearched(false)
    setError(null)
    queryRef.current?.focus()
  }

  const handleRowClick = (row) => {
    setSelected(row)
    onSelect?.(row._raw ?? row)
    onClose()
  }

  const handleQueryKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (results.length === 1) {
      handleRowClick(results[0])
      return
    }
    if (selected) {
      handleRowClick(selected)
      return
    }
    fireNow(query, price)
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
      ref={overlayRef} data-pos-overlay
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
          @keyframes pl-spin  { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
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
          {/* Name / barcode / code */}
          <div style={{ flex: 3, position: 'relative' }}>
            {field('Name / Barcode / Code',
              <div style={{ position: 'relative' }}>
                <input
                  ref={queryRef}
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleQueryKeyDown}
                  placeholder="Type or scan barcode…"
                  style={{ ...inputStyle, paddingRight: 34 }}
                  onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
                />
                <div style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}>
                  {loading
                    ? <Loader2 size={14} color="var(--brand)" style={{ animation: 'pl-spin 0.8s linear infinite' }} />
                    : <Search size={13} color="var(--text-4)" />
                  }
                </div>
              </div>
            )}
          </div>

          {/* Max Price filter */}
          <div style={{ flex: 1 }}>
            {field('Max Price',
              <input
                value={price}
                onChange={handlePriceChange}
                onKeyDown={e => e.key === 'Enter' && fireNow(query, price)}
                placeholder="Any"
                style={{ ...inputStyle, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}
                onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
            )}
          </div>

          {/* Clear */}
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
          {loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              height: '100%', minHeight: 200,
              color: 'var(--text-4)', fontSize: 13, fontWeight: 500,
            }}>
              <Loader2 size={16} color="var(--brand)" style={{ animation: 'pl-spin 0.8s linear infinite' }} />
              Searching…
            </div>
          ) : error ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: 200,
              color: 'var(--red)', fontSize: 12, fontWeight: 600,
            }}>
              {error}
            </div>
          ) : results.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: 200,
              color: 'var(--text-4)', fontSize: 13, fontWeight: 500,
            }}>
              {searched ? 'No products found' : 'Enter search term above'}
            </div>
          ) : (
            results.map((row, i) => {
              const isActive = selected?.barcode === row.barcode
              return (
                <div
                  key={row.barcode ?? row._raw?.productId ?? i}
                  onClick={() => handleRowClick(row)}
                  onDoubleClick={() => handleRowClick(row)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 14px', height: 36,
                    borderBottom: '1px solid var(--border)',
                    background: isActive ? 'var(--brand-bg)' : i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { setSelected(row); if (selected?.barcode !== row.barcode) e.currentTarget.style.background = 'var(--surface-3)' }}
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
