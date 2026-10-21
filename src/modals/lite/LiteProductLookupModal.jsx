import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Keyboard, Check, Loader2 } from 'lucide-react'
import { api } from '../../lib/api'
import { usePosStore } from '../../store/posStore'
import { fmtMoney } from '../../lib/currencyFormat'
import Table from '../../components/common/Table'
import Numpad from '../../components/common/Numpad'
import TouchKeyboard from '../../components/common/Keyboard'
import Modal from '../../components/common/Modal'

const COLUMNS = [
  { key: 'barcode',       label: 'Barcode',     width: 110, mono: true },
  { key: 'description',   label: 'Description' },
  { key: 'packetDetails', label: 'Unit',        width: 90 },
  { key: 'price',         label: 'Price',       width: 80, align: 'right' },
]

const DEBOUNCE_MS = 350

/*
 * LiteProductLookupModal — Lite-only fork of the normal POS's
 * ProductLookupModal, styled to match the Sales Man Lookup layout
 * (results table + right-hand fields/numpad panel) and using the
 * shared neumorphic keyboard/numpad from ./common instead of the
 * plain shared components, so the normal POS's Look Up is unaffected.
 */
export default function LiteProductLookupModal({ onClose, onSelect, groupId = null, searchFn = null }) {
  const [query,    setQuery]    = useState('')
  const [price,    setPrice]    = useState('')
  const [results,  setResults]  = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [searched, setSearched] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
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

  const handleNumKey = k => {
    if (k === 'C')  { setPrice(''); scheduleSearch(query, ''); return }
    if (k === '⌫') { setPrice(v => { const p = v.slice(0, -1); scheduleSearch(query, p); return p }); return }
    setPrice(v => { const p = v + k; scheduleSearch(query, p); return p })
  }

  const handleKbKey = (key) => {
    if (key === '⌫') { setQuery(v => { const q = v.slice(0, -1); scheduleSearch(q, price); return q }); return }
    if (key === 'ENTER') { setKeyboardOpen(false); fireNow(query, price); return }
    if (key === '123') return
    setQuery(v => { const q = v + key; scheduleSearch(q, price); return q })
  }

  const handleSelectResult = (row) => {
    setSelected(row)
  }

  const handleApply = (row = selected) => {
    if (!row) return
    onSelect?.(row._raw ?? row)
    onClose()
  }

  const handleQueryKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (results.length === 1) { handleApply(results[0]); return }
    if (selected) { handleApply(selected); return }
    fireNow(query, price)
  }

  return (
    <Modal
      onClose={onClose}
      icon={Search}
      kicker="Product"
      title="Product Search"
      width={780}
      maxHeight="92vh"
    >
      <style>{`
        @keyframes pl-spin  { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @media (max-width: 640px) {
          .pl-body { flex-direction: column !important; }
          .pl-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; min-height: 200px; }
          .pl-right { width: 100% !important; max-height: 380px; }
        }
      `}</style>

      {/* ── Body ── */}
      <div className="pl-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — results table */}
        <div className="pl-left" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, color: 'var(--text-4)', fontSize: 13, fontWeight: 500 }}>
              <Loader2 size={16} color="var(--brand)" style={{ animation: 'pl-spin 0.8s linear infinite' }} /> Searching…
            </div>
          ) : error ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
              {error}
            </div>
          ) : (
            <Table
              columns={COLUMNS}
              rows={results}
              rowKey="barcode"
              selected={selected?.barcode}
              onRowClick={handleSelectResult}
              emptyText={searched ? 'No products found' : 'Enter search term on the right'}
            />
          )}
        </div>

        {/* RIGHT — fields + persistent numpad */}
        <div className="pl-right" style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Name / Barcode / Code */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Name / Barcode / Code</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={queryRef}
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleQueryKeyDown}
                  placeholder="Type or scan barcode…"
                  style={{ ...inputStyle(keyboardOpen), flex: 1 }}
                />
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setKeyboardOpen(o => !o); queryRef.current?.focus() }}
                  style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    border: `1.5px solid ${keyboardOpen ? 'var(--brand)' : 'var(--border)'}`,
                    background: keyboardOpen ? 'var(--brand-bg)' : 'var(--surface)',
                    color: keyboardOpen ? 'var(--brand)' : 'var(--text-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.14s',
                  }}
                  title="On-screen keyboard"
                >
                  <Keyboard size={14} />
                </button>
              </div>
            </div>

            {/* Max Price */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Max Price</label>
              <input
                value={price}
                onChange={handlePriceChange}
                onKeyDown={e => e.key === 'Enter' && fireNow(query, price)}
                onFocus={() => setKeyboardOpen(false)}
                placeholder="Any"
                style={{ ...inputStyle(false), textAlign: 'right' }}
              />
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', flexShrink: 0, marginInline: 14 }} />

          {/* Numpad — always available for Max Price */}
          <div style={{ padding: '10px 14px', flex: 1 }}>
            <Numpad variant="neumorphic"
              onKey={handleNumKey}
              showDot
              showClear
              showBackspace
              btnHeight={40}
              fontSize={15}
              gap={5}
            />
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', gap: 6, padding: '0 14px 14px' }}>
            <button
              onClick={() => handleApply()}
              disabled={!selected}
              style={{
                flex: 2, height: 38, borderRadius: 9, border: 'none',
                background: selected ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--surface-3)',
                color: selected ? '#fff' : 'var(--text-3)',
                fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: selected ? 'pointer' : 'not-allowed',
                boxShadow: selected ? '0 3px 10px rgba(120,8,41,0.2)' : 'none',
              }}
            >
              <Check size={14} /> Select
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1, height: 38, borderRadius: 9,
                border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ── Neumorphic Keyboard ── */}
      {keyboardOpen && (
        <TouchKeyboard variant="neumorphic" onKey={handleKbKey} onClose={() => setKeyboardOpen(false)} />
      )}
    </Modal>
  )
}

const labelStyle = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
  letterSpacing: 0.7, textTransform: 'uppercase',
}

const inputStyle = active => ({
  height: 36, borderRadius: 8, padding: '0 10px',
  border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
  background: active ? 'var(--brand-bg)' : '#fff',
  fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)',
  fontFamily: 'inherit',
  outline: 'none', width: '100%', boxSizing: 'border-box',
  transition: 'border-color 0.12s, background 0.12s',
})
