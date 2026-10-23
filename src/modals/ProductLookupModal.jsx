import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Trash2, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import Modal from '../components/common/Modal'

const COLUMNS = [
  { key: 'barcode',       label: 'Barcode',     w: 130 },
  { key: 'description',   label: 'Description', flex: true },
  { key: 'packetDetails', label: 'Unit',         w: 130 },
  { key: 'price',         label: 'Price',        w: 90, align: 'right' },
]

const DEBOUNCE_MS = 350

export default function ProductLookupModal({ onClose, onSelect, groupId = null, groupLabel = '', searchFn = null }) {
  const [query,    setQuery]    = useState('')
  const [price,    setPrice]    = useState('')
  const [results,  setResults]  = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [searched, setSearched] = useState(false)
  const queryRef    = useRef()
  const debounceRef = useRef(null)
  const accessToken = usePosStore(s => s.accessToken)

  useEffect(() => {
    queryRef.current?.focus()
  }, [onClose])

  const runSearch = useCallback(async (q, p, gid = groupId) => {
    if (!q.trim() && gid == null) { setResults([]); setSearched(false); return }
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const doSearch = searchFn ?? ((qq, pp, gg) => api.counterPos.productLookup(qq, pp || null, accessToken, gg))
      const { products } = await doSearch(q, p, gid)
      setResults((products ?? []).map(prod => ({
        barcode:       prod.barcode ?? prod.productCode,
        description:   prod.description,
        packetDetails: prod.unitName ?? '—',
        price:         fmtMoney(prod.unitPrice ?? 0),
        _raw:          prod,
      })))
    } catch (e) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, groupId, searchFn])

  useEffect(() => {
    if (groupId != null) runSearch('', price, groupId)
  }, [groupId])

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
    <Modal
      onClose={onClose}
      icon={Search}
      kicker="Product"
      title="Product Search"
      width={720}
      maxHeight="85vh"
    >
      <style>{`
          @keyframes pl-spin  { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        `}</style>

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
              <input data-system-keyboard
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
            <input data-system-keyboard
              value={price}
              onChange={handlePriceChange}
              onKeyDown={e => e.key === 'Enter' && fireNow(query, price)}
              placeholder="Any"
              style={{ ...inputStyle, textAlign: 'right', fontFamily: 'inherit' }}
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
        background: 'var(--table-head-bg)',
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
    </Modal>
  )
}
