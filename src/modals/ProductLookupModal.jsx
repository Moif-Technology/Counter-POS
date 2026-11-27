import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Loader2, RotateCcw, Keyboard as KeyboardIcon, ChevronUp, ChevronDown, X, PackageSearch, LayoutGrid } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import { fmtQty } from '../lib/utils'
import { STOCK_CHANGED_EVENT } from '../lib/stockCheck'
import Modal from '../components/common/Modal'
import Keyboard from '../components/common/Keyboard'
import { applyAmountKey } from '../lib/posNumpadKeys'
import './ProductLookupModal.css'

const DEBOUNCE_MS = 350

/**
 * Product Search — search bar (name / barcode / code), max price, keyboard and
 * clear on top; groups listed on the left; products as tiles (name, barcode ·
 * packet, price). Tap a tile, or move with the arrows and press Enter, to add it.
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
  const [field,    setField]    = useState('query')   // which box the on-screen keyboard types into
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
        stock:         prod.trackStock === false ? null : fmtQty(Number(prod.qtyOnHand ?? 0)),
        _low:          prod.trackStock !== false && Number(prod.qtyOnHand ?? 0) <= 0,
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

  // A bill saved elsewhere changes qty on hand: reload the visible rows.
  const lastSearchRef = useRef({ q: '', p: '', g: null })
  useEffect(() => { lastSearchRef.current = { q: query, p: price, g: group } }, [query, price, group])
  useEffect(() => {
    const onStock = () => {
      const { q, p, g } = lastSearchRef.current
      if (q.trim() || (g != null && g !== '')) runSearch(q, p, g)
    }
    window.addEventListener(STOCK_CHANGED_EVENT, onStock)
    return () => window.removeEventListener(STOCK_CHANGED_EVENT, onStock)
  }, [runSearch])

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

  // Tiles per row in the grid, so ↑ / ↓ keys jump a whole row.
  const perRow = () => {
    const tiles = [...(listRef.current?.children ?? [])]
    return Math.max(1, tiles.filter(el => el.offsetTop === tiles[0]?.offsetTop).length)
  }

  const handleQueryKeyDown = (e) => {
    if (e.key === 'ArrowDown')  { e.preventDefault(); move(perRow()); return }
    if (e.key === 'ArrowUp')    { e.preventDefault(); move(-perRow()); return }
    if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length && selIdx >= 0) { e.preventDefault(); move(1); return }
    if (e.key === 'ArrowLeft'  && e.currentTarget.selectionStart === 0 && selIdx > 0) { e.preventDefault(); move(-1); return }
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (selIdx >= 0 && results[selIdx]) { pick(results[selIdx]); return }
    fireNow(query, price, group)
  }

  // On-screen keyboard types into the last focused box: Search, or Max price (digits / dot only).
  const handleKbKey = (k) => {
    if (k === '123') return
    if (k === 'ENTER') { if (selIdx >= 0 && results[selIdx]) pick(results[selIdx]); else fireNow(query, price, group); return }
    if (field === 'price') { changePrice(applyAmountKey(price, k)); return }
    changeQuery(k === '⌫' ? query.slice(0, -1) : query + k)
  }

  const count = results.length
  const groupName = group === '' ? '' : (productGroups.find(g => String(g.groupId) === String(group))?.groupDescription ?? groupLabel)

  // Layout: search bar on top · groups list on the left · product tiles on the right.
  return (
    <Modal
      onClose={onClose}
      icon={Search}
      kicker="Product"
      title="Product Search"
      width={940}
      maxHeight="92vh"
    >
      <div className="plg">
        {/* ── Search bar ── */}
        <div className="plg-top">
          <div className="plg-search">
            {loading ? <Loader2 size={18} className="plg-spin" /> : <Search size={18} />}
            <input data-system-keyboard
              ref={queryRef}
              value={query}
              onChange={e => changeQuery(e.target.value)}
              onKeyDown={handleQueryKeyDown}
              onFocus={() => setField('query')}
              placeholder="Search name, barcode or code"
              aria-label="Short description: name, barcode or code"
            />
            {query && (
              <button type="button" className="plg-icon-btn" onClick={() => { changeQuery(''); queryRef.current?.focus() }} aria-label="Clear search">
                <X size={17} />
              </button>
            )}
          </div>
          <label className="plg-price">
            <span>Max price</span>
            <input data-system-keyboard
              value={price}
              onFocus={() => setField('price')}
              onChange={e => changePrice(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fireNow(query, price, group)}
              placeholder="Any"
              inputMode="decimal"
              aria-label="Max price"
            />
          </label>
          <button
            type="button"
            className={`plg-tool${kbOpen ? ' is-on' : ''}`}
            onClick={() => setKbOpen(o => !o)}
            aria-pressed={kbOpen}
            aria-label="On-screen keyboard"
          >
            <KeyboardIcon size={19} />
          </button>
          <button type="button" className="plg-tool" onClick={handleClearAll} aria-label="Clear all" title="Clear all">
            <RotateCcw size={17} />
          </button>
        </div>

        <div className="plg-body">
          {/* ── Groups ── */}
          <nav className="plg-groups" aria-label="Group">
            <button type="button" className={`plg-group${group === '' ? ' is-on' : ''}`} onClick={() => changeGroup('')}>
              <LayoutGrid size={15} /> All products
            </button>
            {productGroups.map(g => (
              <button
                key={g.groupId}
                type="button"
                className={`plg-group${String(group) === String(g.groupId) ? ' is-on' : ''}`}
                onClick={() => changeGroup(String(g.groupId))}
              >
                {g.groupDescription}
              </button>
            ))}
          </nav>

          {/* ── Product tiles ── */}
          <div className="plg-results">
            {error ? (
              <div className="plg-error">{error}</div>
            ) : count === 0 ? (
              <div className="plg-empty">
                <PackageSearch size={38} />
                <b>{loading ? 'Searching…' : searched ? 'No products found' : 'Find a product'}</b>
                {!loading && !searched && <span>Type a name, barcode or code — or pick a group on the left</span>}
              </div>
            ) : (
              <div ref={listRef} className="plg-grid">
                {results.map((row, i) => (
                  <button
                    type="button"
                    key={row.barcode ?? row._raw?.productId ?? i}
                    className={`plg-tile${i === selIdx ? ' is-active' : ''}`}
                    onClick={() => pick(row)}
                    onMouseEnter={() => setSelIdx(i)}
                  >
                    <span className="plg-tile-name">{row.description ?? '—'}</span>
                    <span className="plg-tile-meta">
                      {row.barcode ?? '—'}{row.packetDetails && row.packetDetails !== '—' ? ` · ${row.packetDetails}` : ''}
                      {row.stock != null && (
                        <> · <b style={{ color: row._low ? 'var(--red)' : undefined }}>Stock {row.stock}</b></>
                      )}
                    </span>
                    <span className="plg-tile-price">{row.price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {kbOpen && <Keyboard onKey={handleKbKey} onClose={() => setKbOpen(false)} />}

        {/* ── Footer ── */}
        <div className="plg-foot">
          <span className="plg-count">
            {count ? <><b>{count}</b> product{count !== 1 ? 's' : ''}{groupName ? ` in ${groupName}` : ''} · tap a tile to add</> : ''}
          </span>
          <button type="button" className="plg-tool" onClick={() => move(-1)} disabled={!count} aria-label="Previous product">
            <ChevronUp size={20} />
          </button>
          <button type="button" className="plg-tool" onClick={() => move(1)} disabled={!count} aria-label="Next product">
            <ChevronDown size={20} />
          </button>
          <button type="button" className="plg-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  )
}
