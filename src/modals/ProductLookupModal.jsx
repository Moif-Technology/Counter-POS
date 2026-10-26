import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Loader2, RotateCcw, Tag } from 'lucide-react'
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
    width: '100%', height: 38, borderRadius: 8,
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    padding: '0 10px', fontSize: 12, color: 'var(--text-1)',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.12s',
  }
  const focusOn  = e => { e.target.style.borderColor = 'var(--brand)' }
  const focusOff = e => { e.target.style.borderColor = 'var(--border)' }

  const field = (label, icon, input) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon} {label}
      </label>
      {input}
    </div>
  )

  const count = results.length

  // Same inside layout as the other popups (e.g. the report viewers):
  // filter row · bordered table card with a rose header · footer with a count and Close.
  return (
    <Modal
      onClose={onClose}
      icon={Search}
      kicker="Product"
      title={groupLabel ? `Product Search · ${groupLabel}` : 'Product Search'}
      width={760}
      maxHeight="85vh"
    >
      <style>{`@keyframes pl-spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Filters ── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr) auto', gap: 8, alignItems: 'end' }}>
          {field('Name / Barcode / Code', <Search size={11} />,
            <div style={{ position: 'relative' }}>
              <input data-system-keyboard
                ref={queryRef}
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleQueryKeyDown}
                placeholder="Type or scan barcode…"
                style={{ ...inputStyle, paddingRight: 34 }}
                onFocus={focusOn}
                onBlur={focusOff}
              />
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                {loading
                  ? <Loader2 size={14} color="var(--brand)" style={{ animation: 'pl-spin 0.8s linear infinite' }} />
                  : <Search size={13} color="var(--text-4)" />}
              </div>
            </div>
          )}
          {field('Max Price', <Tag size={11} />,
            <input data-system-keyboard
              value={price}
              onChange={handlePriceChange}
              onKeyDown={e => e.key === 'Enter' && fireNow(query, price)}
              placeholder="Any"
              style={{ ...inputStyle, textAlign: 'right' }}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          )}
          <button onClick={handleClearAll} style={{
            height: 38, padding: '0 14px', borderRadius: 8,
            border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
            color: 'var(--brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontFamily: 'inherit',
          }}>
            <RotateCcw size={14} /> Clear
          </button>
        </div>
      </div>

      {/* ── Results: table card ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '12px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', flexShrink: 0,
          background: 'var(--table-head-bg)', padding: '9px 12px', borderRadius: '10px 10px 0 0',
          border: '1.5px solid var(--border)', borderBottom: 'none',
        }}>
          {COLUMNS.map(col => (
            <span key={col.key} style={{
              width: col.w, flex: col.flex ? 1 : undefined,
              fontSize: 9.5, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.4,
              textAlign: col.align || 'left', paddingRight: 8,
            }}>{col.label}</span>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: '0 0 10px 10px', minHeight: 260 }}>
          {loading ? (
            <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-4)', fontSize: 12 }}>
              <Loader2 size={16} color="var(--brand)" style={{ animation: 'pl-spin 0.8s linear infinite' }} /> Searching…
            </div>
          ) : error ? (
            <div style={{ padding: 16, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>{error}</div>
          ) : count === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
              {searched ? 'No products found' : 'Type a name, barcode or code above'}
            </div>
          ) : (
            results.map((row, i) => {
              const isActive = selected?.barcode === row.barcode
              const stripe = i % 2 === 0 ? '#fff' : 'var(--surface-2)'
              return (
                <div
                  key={row.barcode ?? row._raw?.productId ?? i}
                  onClick={() => handleRowClick(row)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 12px', height: 38,
                    borderBottom: '1px solid var(--border)',
                    background: isActive ? 'var(--brand-bg)' : stripe,
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { setSelected(row); e.currentTarget.style.background = 'var(--brand-bg)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = stripe }}
                >
                  {COLUMNS.map(col => (
                    <span key={col.key} style={{
                      width: col.w, flex: col.flex ? 1 : undefined,
                      fontSize: 12, color: isActive ? 'var(--brand)' : col.key === 'price' ? 'var(--text-1)' : 'var(--text-2)',
                      fontWeight: col.key === 'price' || isActive ? 700 : 500,
                      textAlign: col.align || 'left', fontVariantNumeric: 'tabular-nums',
                      paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{row[col.key] ?? '—'}</span>
                  ))}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
          {count} product{count !== 1 ? 's' : ''}{count ? ' · tap a row to add it' : ''}
        </span>
        <button onClick={onClose} style={{
          height: 34, padding: '0 18px', borderRadius: 9,
          border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
          color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Close
        </button>
      </div>
    </Modal>
  )
}
