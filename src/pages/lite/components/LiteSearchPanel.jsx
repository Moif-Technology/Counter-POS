import { useState } from 'react'
import { Keyboard, MoreHorizontal } from 'lucide-react'
import NeumorphicKeyboard from './common/NeumorphicKeyboard'
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
      display: 'flex', flexDirection: 'column', padding: 'clamp(10px, 1.6vw, 16px)',
      minHeight: 0, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 'clamp(6px, 1.2vh, 10px)' }}>
        <input
          ref={searchInputRef}
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search item or scan barcode..."
          style={{
            flex: 1, height: 'clamp(38px, 6vh, 44px)', boxSizing: 'border-box', padding: '0 14px', borderRadius: 'var(--r-md)',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-1)', fontSize: 'clamp(13px, 1.1vw, 15px)', outline: 'none',
          }}
        />
        <button
          className="lite-btn"
          onClick={() => setShowKeyboard(o => !o)}
          title="On-screen keyboard"
          style={{
            width: 'clamp(38px, 6vh, 44px)', height: 'clamp(38px, 6vh, 44px)', boxSizing: 'border-box', borderRadius: 'var(--r-md)', flexShrink: 0,
            border: `1.5px solid ${showKeyboard ? 'var(--brand)' : 'var(--border)'}`,
            background: showKeyboard ? 'var(--brand-bg)' : 'var(--surface)',
            color: showKeyboard ? 'var(--brand)' : 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Keyboard size={17} />
        </button>
      </div>

      {/* Group chips — one scrollable row, so wrapping never eats the
          vertical space the product list needs to stay fully visible. */}
      <div className="lite-scroll" style={{
        display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', flexShrink: 0,
        gap: 'clamp(5px, 1vh, 8px)', marginBottom: 'clamp(7px, 1.4vh, 12px)',
      }}>
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

      {/* Results — flex items share the available height evenly and shrink
          as the list grows, so every result stays visible with no scroll.
          maxHeight keeps a short list from stretching into oversized rows. */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 'clamp(3px, 0.8vh, 8px)' }}>
        {results.map(p => (
          <button
            key={p.productId}
            className="lite-btn"
            onClick={() => onAddToCart(p)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
              padding: 'clamp(3px, 1vh, 12px) 14px', borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)', background: 'var(--surface)',
              cursor: 'pointer', textAlign: 'left', minWidth: 0,
              flex: '1 1 0', minHeight: 0, maxHeight: 50,
            }}
          >
            <span style={{
              fontSize: 'clamp(10.5px, 1.7vh, 13.5px)', color: 'var(--text-1)', fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
              {p.description}
            </span>
            <span style={{ fontSize: 'clamp(9.5px, 1.5vh, 13px)', color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
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

      {/* Actions — reveals the full function grid, like the normal POS */}
      <button
        className="lite-btn"
        onClick={onOpenMore}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: 'clamp(8px, 1.6vh, 12px) 0', marginTop: 'clamp(7px, 1.4vh, 12px)', borderRadius: 'var(--r-md)',
          border: '1.5px solid var(--border)', background: 'var(--surface)',
          color: 'var(--text-2)', fontSize: 'clamp(11.5px, 1vw, 13px)', fontWeight: 700, cursor: 'pointer',
          flexShrink: 0, minHeight: 'clamp(36px, 5.5vh, 42px)',
        }}
      >
        <MoreHorizontal size={16} /> Actions
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
            <NeumorphicKeyboard
              onKey={handleKbKey}
              onClose={() => setShowKeyboard(false)}
            />
          </div>
        </>
      )}
    </div>
  )
}
