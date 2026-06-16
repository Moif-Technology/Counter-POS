import { useState, useEffect, useRef, useCallback } from 'react'
import { User, UserPlus, X, Search, CreditCard, Phone, ChevronDown } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { api } from '../../lib/api'
import { fmtMoney } from '../../lib/currencyFormat'
import { focusBarcodeScan } from '../../lib/posFocus'

const WALK_IN_LABEL = 'Walk-in Customer'

function CustomerRow({ c, onSelect }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => onSelect(c)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', cursor: 'pointer',
        background: hov ? 'var(--brand-bg)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, color: 'var(--text-2)',
      }}>
        {c.customerName?.[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {c.customerName}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 500, display: 'flex', gap: 8, marginTop: 1 }}>
          <span>{c.customerCode}</span>
          {c.mobileNo && <><span style={{ color: 'var(--border)' }}>·</span><span>{c.mobileNo}</span></>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        {c.paymentMode && c.paymentMode !== 'CASH' && (
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: 0.4,
            color: 'var(--amber)', background: 'var(--amber-bg)',
            border: '1px solid var(--amber-border)',
            borderRadius: 4, padding: '1px 5px',
          }}>{c.paymentMode}</span>
        )}
        {c.osAmount > 0 && (
          <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>
            O/S {fmtMoney(c.osAmount)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function CustomerSearch() {
  const customerName   = usePosStore(s => s.customerName)
  const setCustomer    = usePosStore(s => s.setCustomer)
  const clearCustomer  = usePosStore(s => s.clearCustomer)
  const setPaymentMode = usePosStore(s => s.setPaymentMode)
  const accessToken    = usePosStore(s => s.accessToken)

  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const inputRef  = useRef()
  const wrapRef   = useRef()
  const timerRef  = useRef()

  useEffect(() => {
    if (open) return
    focusBarcodeScan(50)
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const doSearch = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const { customers } = await api.counterPos.customerSearch(q, 40, accessToken)
      setResults(customers)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  // Debounced search
  const handleQueryChange = (val) => {
    setQuery(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 280)
  }

  // Load full list on open
  useEffect(() => {
    if (open) doSearch('')
  }, [open, doSearch])

  // Map DB payment mode → store mode keys
  function resolveMode(dbMode) {
    const m = String(dbMode || '').toUpperCase()
    if (m === 'CREDITCARD' || m === 'CARD') return 'CARD'
    if (m === 'CREDIT')                     return 'CREDIT'
    return 'CASH'
  }

  const handleSelect = (c) => {
    setCustomer(c.customerId, c.customerName, c.customerCode, c.paymentMode, c.osAmount)
    setPaymentMode(resolveMode(c.paymentMode))
    setOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    clearCustomer()
    setPaymentMode('CASH')
  }

  const hasCustomer = !!customerName

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>

      {/* ── Trigger button ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: hasCustomer ? 'var(--blue-bg)' : 'var(--surface)',
            border: `1.5px solid ${hasCustomer ? 'var(--blue-border)' : 'var(--border)'}`,
            borderRadius: 'var(--r-md)', padding: '0 11px', height: 38,
            color: hasCustomer ? 'var(--blue)' : 'var(--text-1)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.12s', maxWidth: 200,
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: hasCustomer ? 'rgba(59,130,246,0.15)' : 'var(--surface-2)',
            border: `1px solid ${hasCustomer ? 'var(--blue-border)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <User size={11} color={hasCustomer ? 'var(--blue)' : 'var(--text-3)'} />
          </div>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {customerName || WALK_IN_LABEL}
          </span>
          <ChevronDown size={11} color="var(--text-3)" style={{ flexShrink: 0 }} />
        </button>

        {hasCustomer && (
          <button
            onClick={handleClear}
            title="Clear customer"
            style={{
              width: 28, height: 28, borderRadius: 'var(--r-md)', flexShrink: 0,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)', cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.borderColor = 'var(--red-border)'; e.currentTarget.style.color = 'var(--red)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          data-pos-customer-dropdown
          style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 320, zIndex: 999,
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
          overflow: 'hidden',
        }}>

          {/* Search input */}
          <div style={{
            padding: '8px 10px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface-2)',
          }}>
            <Search size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search name, code, mobile…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 12.5, color: 'var(--text-1)', fontWeight: 500,
                fontFamily: 'inherit',
              }}
            />
            {loading && (
              <div style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                border: '2px solid var(--border)',
                borderTopColor: 'var(--brand)',
                animation: 'spin 0.6s linear infinite',
              }} />
            )}
          </div>

          {/* Walk-in option */}
          <div
            onClick={() => { clearCustomer(); setOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 12px', cursor: 'pointer',
              borderBottom: '1px solid var(--border)',
              background: !hasCustomer ? 'var(--brand-bg)' : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (hasCustomer) e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { if (hasCustomer) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={13} color="var(--text-3)" />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{WALK_IN_LABEL}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-4)', fontWeight: 500 }}>Cash sale — no customer account</div>
            </div>
            {!hasCustomer && (
              <span style={{
                marginLeft: 'auto', fontSize: 9, fontWeight: 800,
                color: 'var(--brand)', background: 'var(--brand-tint)',
                borderRadius: 4, padding: '2px 6px',
              }}>ACTIVE</span>
            )}
          </div>

          {/* Results list */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {error && (
              <div style={{ padding: '12px', fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>
                {error}
              </div>
            )}
            {!error && !loading && results.length === 0 && query.length > 0 && (
              <div style={{ padding: '16px', fontSize: 12, color: 'var(--text-4)', textAlign: 'center' }}>
                No customers found
              </div>
            )}
            {results.map(c => (
              <CustomerRow key={c.customerId} c={c} onSelect={handleSelect} />
            ))}
          </div>

        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
