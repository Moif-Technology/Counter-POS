import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Loader2, RotateCcw, Keyboard as KeyboardIcon, ChevronUp, ChevronDown, X, PackageSearch } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import Modal from '../components/common/Modal'
import Keyboard from '../components/common/Keyboard'
import './ProductLookupModal.css'

const DEBOUNCE_MS = 350

/**
 * Product Search — one search bar (name / barcode / code) with a keyboard toggle,
 * group chips, max price and Clear; results as a clean list (name, barcode ·
 * packet details, price) with ↑ / ↓ in the footer. Tap a row, or Enter on the
 * highlighted one, to add it.
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

  const count = results.length
  const groupName = group === '' ? '' : (productGroups.find(g => String(g.groupId) === String(group))?.groupDescription ?? groupLabel)

  return (
    <Modal
      onClose={onClose}
      icon={Search}
      kicker="Product"
      title="Product Search"
      width={720}
      maxHeight="92vh"
    >
      <div className="pls">
        {/* ── Search bar + filters ── */}
        <div className="pls-top">
          <div className="pls-search">
            {loading ? <Loader2 size={18} className="pls-spin" /> : <Search size={18} />}
            <input data-system-keyboard
              ref={queryRef}
              value={query}
              onChange={e => changeQuery(e.target.value)}
              onKeyDown={handleQueryKeyDown}
              placeholder="Search name, barcode or code"
              aria-label="Short description: name, barcode or code"
            />
            {query && (
              <button type="button" className="pls-icon-btn" onClick={() => { changeQuery(''); queryRef.current?.focus() }} aria-label="Clear search">
                <X size={17} />
              </button>
            )}
            <button
              type="button"
              className={`pls-icon-btn${kbOpen ? ' is-on' : ''}`}
              onClick={() => setKbOpen(o => !o)}
              aria-pressed={kbOpen}
              aria-label="On-screen keyboard"
              title="Keyboard"
            >
              <KeyboardIcon size={19} />
            </button>
          </div>

          <div className="pls-filters">
            <div className="pls-chips" role="tablist" aria-label="Group">
              <button type="button" className={`pls-chip${group === '' ? ' is-on' : ''}`} onClick={() => changeGroup('')}>All</button>
              {productGroups.map(g => (
                <button
                  key={g.groupId}
                  type="button"
                  className={`pls-chip${String(group) === String(g.groupId) ? ' is-on' : ''}`}
                  onClick={() => changeGroup(String(g.groupId))}
                >
                  {g.groupDescription}
                </button>
              ))}
            </div>
            <label className="pls-price">
              <span>Max</span>
              <input data-system-keyboard
                value={price}
                onChange={e => changePrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fireNow(query, price, group)}
                placeholder="Any"
                inputMode="decimal"
                aria-label="Max price"
              />
            </label>
            <button type="button" className="pls-clear" onClick={handleClearAll}>
              <RotateCcw size={13} /> Clear
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        <div ref={listRef} className="pls-list" style={{ minHeight: kbOpen ? 140 : 260 }}>
          {error ? (
            <div className="pls-error">{error}</div>
          ) : count === 0 ? (
            <div className="pls-empty">
              <PackageSearch size={34} />
              {loading ? 'Searching…'
                : searched ? 'No products found'
                : 'Type to search, or pick a group'}
            </div>
          ) : (
            results.map((row, i) => (
              <div
                key={row.barcode ?? row._raw?.productId ?? i}
                className={`pls-row${i === selIdx ? ' is-active' : ''}`}
                onClick={() => pick(row)}
                onMouseEnter={() => setSelIdx(i)}
              >
                <div className="pls-row-main">
                  <span className="pls-row-name">{row.description ?? '—'}</span>
                  <span className="pls-row-meta">
                    {row.barcode ?? '—'}{row.packetDetails && row.packetDetails !== '—' ? ` · ${row.packetDetails}` : ''}
                  </span>
                </div>
                <span className="pls-row-price">{row.price}</span>
              </div>
            ))
          )}
        </div>

        {kbOpen && <Keyboard onKey={handleKbKey} onClose={() => setKbOpen(false)} />}

        {/* ── Footer ── */}
        <div className="pls-foot">
          <span className="pls-count">
            {count ? `${count} product${count !== 1 ? 's' : ''}${groupName ? ` in ${groupName}` : ''}` : ''}
          </span>
          <button type="button" className="pls-icon-btn pls-nav" onClick={() => move(-1)} disabled={!count} aria-label="Previous product">
            <ChevronUp size={20} />
          </button>
          <button type="button" className="pls-icon-btn pls-nav" onClick={() => move(1)} disabled={!count} aria-label="Next product">
            <ChevronDown size={20} />
          </button>
          <button type="button" className="pls-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  )
}
