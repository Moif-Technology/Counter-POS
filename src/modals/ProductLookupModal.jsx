import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Loader2, RotateCcw, Keyboard as KeyboardIcon, ChevronUp, ChevronDown } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import Modal from '../components/common/Modal'
import Keyboard from '../components/common/Keyboard'

const COLUMNS = [
  { key: 'barcode',       label: 'Barcode',        w: 130 },
  { key: 'description',   label: 'Description',    flex: true },
  { key: 'packetDetails', label: 'Packet Details', w: 130 },
  { key: 'price',         label: 'Price',          w: 90, align: 'right' },
]

const DEBOUNCE_MS = 350

/**
 * Product Search — Short Description · Price · Group, Keyboard, Clear All;
 * results table (Barcode · Description · Packet Details · Price) with ↑ / ↓ to
 * move the highlighted row. Tap a row, or Enter on the highlighted one, to add it.
 */
export default function ProductLookupModal({ onClose, onSelect, groupId = null, groupLabel = '', searchFn = null }) {
  const [query,    setQuery]    = useState('')
  const [price,    setPrice]    = useState('')
  const [group,    setGroup]    = useState(groupId ?? '')
  const [results,  setResults]  = useState([])
  const [selIdx,   setSelIdx]   = useState(-1)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [searched, setSearched] = useState(false)
  const [kbOpen,   setKbOpen]   = useState(false)
  const queryRef    = useRef()
  const listRef     = useRef()
  const debounceRef = useRef(null)
  const accessToken        = usePosStore(s => s.accessToken)
  const productGroups      = usePosStore(s => s.productGroups)
  const fetchProductGroups = usePosStore(s => s.fetchProductGroups)

  useEffect(() => {
    queryRef.current?.focus()
  }, [onClose])

  useEffect(() => {
    if (accessToken && !productGroups.length) fetchProductGroups()
  }, [accessToken, productGroups.length, fetchProductGroups])

  const runSearch = useCallback(async (q, p, gid) => {
    if (!q.trim() && (gid == null || gid === '')) { setResults([]); setSearched(false); setSelIdx(-1); return }
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const doSearch = searchFn ?? ((qq, pp, gg) => api.counterPos.productLookup(qq, pp || null, accessToken, gg))
      const { products } = await doSearch(q, p, gid === '' ? null : gid)
      const rows = (products ?? []).map(prod => ({
        barcode:       prod.barcode ?? prod.productCode,
        description:   prod.description,
        packetDetails: prod.unitName ?? '—',
        price:         fmtMoney(prod.unitPrice ?? 0),
        _raw:          prod,
      }))
      setResults(rows)
      setSelIdx(rows.length ? 0 : -1)
    } catch (e) {
      setError(e.message)
      setResults([])
      setSelIdx(-1)
    } finally {
      setLoading(false)
    }
  }, [accessToken, searchFn])

  // Opened from a group: show that group's products straight away.
  useEffect(() => {
    if (groupId != null) runSearch('', '', groupId)
  }, [groupId, runSearch])

  const scheduleSearch = (q, p, g) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(q, p, g), DEBOUNCE_MS)
  }
  const fireNow = (q, p, g) => {
    clearTimeout(debounceRef.current)
    runSearch(q, p, g)
  }

  const changeQuery = (q) => { setQuery(q); scheduleSearch(q, price, group) }
  const changePrice = (p) => { setPrice(p); scheduleSearch(query, p, group) }
  const changeGroup = (g) => { setGroup(g); fireNow(query, price, g) }

  const handleClearAll = () => {
    clearTimeout(debounceRef.current)
    setQuery('')
    setPrice('')
    setGroup('')
    setResults([])
    setSelIdx(-1)
    setSearched(false)
    setError(null)
    queryRef.current?.focus()
  }

  const pick = (row) => {
    if (!row) return
    onSelect?.(row._raw ?? row)
    onClose()
  }

  // ↑ / ↓ move the highlighted row and keep it in view.
  const move = (step) => {
    if (!results.length) return
    const next = Math.min(results.length - 1, Math.max(0, (selIdx < 0 ? 0 : selIdx + step)))
    setSelIdx(next)
    listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
  }

  const handleQueryKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); move(-1); return }
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (selIdx >= 0 && results[selIdx]) { pick(results[selIdx]); return }
    fireNow(query, price, group)
  }

  // On-screen keyboard types into Short Description.
  const handleKbKey = (k) => {
    if (k === '123') return
    if (k === 'ENTER') { if (selIdx >= 0 && results[selIdx]) pick(results[selIdx]); else fireNow(query, price, group); return }
    changeQuery(k === '⌫' ? query.slice(0, -1) : query + k)
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

  const field = (label, input) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' }}>{label}</label>
      {input}
    </div>
  )

  const toolBtn = (active) => ({
    height: 38, padding: '0 14px', borderRadius: 8,
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--brand-border)'}`,
    background: active ? 'var(--brand)' : 'var(--brand-bg)',
    color: active ? '#fff' : 'var(--brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontFamily: 'inherit',
  })

  const arrowBtn = {
    width: 46, height: 46, borderRadius: '50%', padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)', color: 'var(--brand)', cursor: 'pointer',
  }

  const count = results.length

  // Same inside layout as the other popups (filter row · table card · footer).
  return (
    <Modal
      onClose={onClose}
      icon={Search}
      kicker="Product"
      title={groupLabel ? `Product Search · ${groupLabel}` : 'Product Search'}
      width={820}
      maxHeight="92vh"
    >
      <style>{`@keyframes pl-spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Filters: Short Description · Price · Group · Keyboard · Clear All ── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.6fr) minmax(0, 0.9fr) minmax(0, 1.3fr) auto auto', gap: 8, alignItems: 'end' }}>
          {field('Short Description',
            <div style={{ position: 'relative' }}>
              <input data-system-keyboard
                ref={queryRef}
                value={query}
                onChange={e => changeQuery(e.target.value)}
                onKeyDown={handleQueryKeyDown}
                placeholder="Name / Barcode / Code"
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
          {field('Price',
            <input data-system-keyboard
              value={price}
              onChange={e => changePrice(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fireNow(query, price, group)}
              placeholder="Any"
              inputMode="decimal"
              style={{ ...inputStyle, textAlign: 'right' }}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          )}
          {field('Group',
            <select
              value={group}
              onChange={e => changeGroup(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer', paddingRight: 6 }}
              onFocus={focusOn}
              onBlur={focusOff}
            >
              <option value="">All groups</option>
              {productGroups.map(g => <option key={g.groupId} value={g.groupId}>{g.groupDescription}</option>)}
            </select>
          )}
          <button type="button" onClick={() => setKbOpen(o => !o)} style={toolBtn(kbOpen)} aria-pressed={kbOpen}>
            <KeyboardIcon size={15} /> Keyboard
          </button>
          <button type="button" onClick={handleClearAll} style={toolBtn(false)}>
            <RotateCcw size={14} /> Clear All
          </button>
        </div>
      </div>

      {/* ── Results table card + ↑ / ↓ ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, padding: '12px 16px' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: '0 0 10px 10px', minHeight: kbOpen ? 150 : 260 }}>
            {loading ? (
              <div style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-4)', fontSize: 12 }}>
                <Loader2 size={16} color="var(--brand)" style={{ animation: 'pl-spin 0.8s linear infinite' }} /> Searching…
              </div>
            ) : error ? (
              <div style={{ padding: 16, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>{error}</div>
            ) : count === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                {searched ? 'No products found' : 'Type a description, barcode or code, or pick a group'}
              </div>
            ) : (
              results.map((row, i) => {
                const isActive = i === selIdx
                const stripe = i % 2 === 0 ? '#fff' : 'var(--surface-2)'
                return (
                  <div
                    key={row.barcode ?? row._raw?.productId ?? i}
                    onClick={() => pick(row)}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '0 12px', height: 38,
                      borderBottom: '1px solid var(--border)',
                      borderLeft: `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
                      background: isActive ? 'var(--brand-bg)' : stripe,
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
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

        {/* Move the highlighted row */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, flexShrink: 0 }}>
          <button type="button" onClick={() => move(-1)} disabled={!count} style={{ ...arrowBtn, opacity: count ? 1 : 0.4 }} aria-label="Previous product">
            <ChevronUp size={24} />
          </button>
          <button type="button" onClick={() => move(1)} disabled={!count} style={{ ...arrowBtn, opacity: count ? 1 : 0.4 }} aria-label="Next product">
            <ChevronDown size={24} />
          </button>
        </div>
      </div>

      {kbOpen && <Keyboard onKey={handleKbKey} onClose={() => setKbOpen(false)} />}

      {/* ── Footer ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>
          {count} product{count !== 1 ? 's' : ''}{count ? ' · tap a row, or Enter, to add it' : ''}
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
