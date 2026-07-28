import { useState } from 'react'
import { Keyboard, MoreHorizontal } from 'lucide-react'
import TouchKeyboard from '../../../components/ui/TouchKeyboard'
import { fmtMoney } from '../../../lib/currencyFormat'
import { LITE_GROUPS } from '../liteProducts'
import { groupChipStyle } from '../liteStyles'

export default function LiteSearchPanel({
  searchInputRef, query, setQuery, activeGroup, setActiveGroup,
  results, onAddToCart, onOpenMore,
}) {
  const [showKeyboard, setShowKeyboard] = useState(false)

  const handleKbKey = (key) => {
    if (key === '⌫') { setQuery(v => v.slice(0, -1)); return }
    if (key === 'ENTER') { setShowKeyboard(false); return }
    if (key === '123') return
    setQuery(v => v + key)
  }

  return (
    <div className="lite-panel-left" style={{
      display: 'flex', flexDirection: 'column', padding: 16, minHeight: 0,
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          ref={searchInputRef}
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search item or scan barcode..."
          style={{
            flex: 1, height: 44, boxSizing: 'border-box', padding: '0 14px', borderRadius: 'var(--r-md)',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-1)', fontSize: 15, outline: 'none',
          }}
        />
        <button
          className="lite-btn"
          onClick={() => setShowKeyboard(o => !o)}
          title="On-screen keyboard"
          style={{
            width: 44, height: 44, boxSizing: 'border-box', borderRadius: 'var(--r-md)', flexShrink: 0,
            border: `1.5px solid ${showKeyboard ? 'var(--brand)' : 'var(--border)'}`,
            background: showKeyboard ? 'var(--brand-bg)' : 'var(--surface)',
            color: showKeyboard ? 'var(--brand)' : 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Keyboard size={17} />
        </button>
      </div>

      {/* Group chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button
          className="lite-btn"
          onClick={() => setActiveGroup(null)}
          style={groupChipStyle(activeGroup === null)}
        >
          All
        </button>
        {LITE_GROUPS.map(g => (
          <button
            key={g}
            className="lite-btn"
            onClick={() => setActiveGroup(prev => (prev === g ? null : g))}
            style={groupChipStyle(activeGroup === g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="lite-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.map(p => (
          <button
            key={p.productId}
            className="lite-btn"
            onClick={() => onAddToCart(p)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 14px', borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)', background: 'var(--surface)',
              cursor: 'pointer', textAlign: 'left', minHeight: 48,
            }}
          >
            <span style={{ fontSize: 13.5, color: 'var(--text-1)', fontWeight: 600 }}>{p.description}</span>
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
              {fmtMoney(p.price)}
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>
            No items found
          </div>
        )}
      </div>

      {/* More — reveals the full function grid, like the normal POS */}
      <button
        className="lite-btn"
        onClick={onOpenMore}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '13px 0', marginTop: 12, borderRadius: 'var(--r-md)',
          border: '1.5px solid var(--border)', background: 'var(--surface)',
          color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          flexShrink: 0, minHeight: 46,
        }}
      >
        <MoreHorizontal size={16} /> More
      </button>

      {showKeyboard && (
        <>
          {/* Backdrop — tap outside the keyboard to close it */}
          <div
            onClick={() => setShowKeyboard(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9 }}
          />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10,
              boxShadow: '0 -8px 28px rgba(0,0,0,0.18)',
            }}
          >
            <TouchKeyboard
              onKey={handleKbKey}
              onClose={() => setShowKeyboard(false)}
            />
          </div>
        </>
      )}
    </div>
  )
}
