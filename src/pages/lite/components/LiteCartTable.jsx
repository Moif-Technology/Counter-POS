import { useRef, useState } from 'react'
import { Trash2, X, Check, ShoppingCart } from 'lucide-react'
import { getCartRowKey } from '../../../lib/cartLine'
import { fmtMoney } from '../../../lib/currencyFormat'
import { thStyle, tdStyle, qtyBtnStyle, removeBtnStyle } from '../liteStyles'

const LONG_PRESS_MS = 450

export default function LiteCartTable({
  cartItems, selectedRowKey, onSelectRow, onAdjustQty, onRemoveItem, onDeleteMany,
}) {
  const [selectMode, setSelectMode] = useState(false)
  const [checkedKeys, setCheckedKeys] = useState(() => new Set())
  const [removingRowKey, setRemovingRowKey] = useState(null)
  const pressTimerRef = useRef(null)

  const clearPressTimer = () => {
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null }
  }

  const toggleChecked = (rowKey) => {
    setCheckedKeys(prev => {
      const next = new Set(prev)
      if (next.has(rowKey)) next.delete(rowKey)
      else next.add(rowKey)
      if (next.size === 0) setSelectMode(false)
      return next
    })
  }

  const startLongPress = (rowKey) => {
    clearPressTimer()
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null
      setSelectMode(true)
      setCheckedKeys(new Set([rowKey]))
    }, LONG_PRESS_MS)
  }

  const handleRowClick = (rowKey) => {
    if (selectMode) toggleChecked(rowKey)
    else onSelectRow(rowKey)
  }

  const cancelSelectMode = () => {
    setSelectMode(false)
    setCheckedKeys(new Set())
  }

  const deleteChecked = () => {
    onDeleteMany(Array.from(checkedKeys))
    cancelSelectMode()
  }

  const handleRemoveRow = (rowKey) => {
    if (removingRowKey === rowKey) return
    setRemovingRowKey(rowKey)
    window.setTimeout(() => {
      onRemoveItem(rowKey)
      setRemovingRowKey(null)
    }, 140)
  }

  return (
    <div 
      className="lite-panel-center lite-scroll" 
      style={{ 
        flex: 1, 
        height: '100%',
        overflowY: 'auto', 
        paddingBottom: '80px', 
        minWidth: 0, 
        minHeight: 0,
        position: 'relative'
      }}
    >
      {selectMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          margin: '12px 16px 0 16px', padding: '10px 12px', borderRadius: 10,
          background: 'var(--brand-bg)', border: '1.5px solid var(--brand-border)',
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand)' }}>
            {checkedKeys.size} selected
          </span>
          <div style={{ flex: 1 }} />
          <button
            className="lite-btn"
            onClick={deleteChecked}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px', borderRadius: 8, border: 'none',
              background: 'var(--red)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
          <button
            className="lite-btn"
            onClick={cancelSelectMode}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-2)', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 'clamp(11.5px, 0.9vw, 13px)', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '36px' }} />
          <col style={{ width: 'auto' }} />
          <col style={{ width: '90px' }} />
          <col style={{ width: '75px' }} />
          <col style={{ width: '85px' }} />
          <col style={{ width: '40px' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...thStyle, position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface, #fff)', paddingLeft: 'clamp(10px, 1.6vw, 16px)' }}>#</th>
            <th style={{ ...thStyle, textAlign: 'left', position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface, #fff)' }}>Item</th>
            <th style={{ ...thStyle, position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface, #fff)' }}>Qty</th>
            <th style={{ ...thStyle, color: 'var(--text-3)', fontWeight: 500, position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface, #fff)' }}>Price</th>
            <th style={{ ...thStyle, color: 'var(--text-1)', fontWeight: 700, position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface, #fff)' }}>Total</th>
            <th style={{ ...thStyle, position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface, #fff)', paddingRight: 'clamp(10px, 1.6vw, 16px)' }}></th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((item, idx) => ({ item, idx })).reverse().map(({ item: i, idx }) => {
            const rowKey = getCartRowKey(i)
            const selected = rowKey === selectedRowKey
            const checked = checkedKeys.has(rowKey)
            const isRemoving = removingRowKey === rowKey
            return (
              <tr
                key={rowKey}
                onClick={() => handleRowClick(rowKey)}
                onPointerDown={() => startLongPress(rowKey)}
                onPointerUp={clearPressTimer}
                onPointerLeave={clearPressTimer}
                onPointerCancel={clearPressTimer}
                onContextMenu={e => e.preventDefault()}
                style={{
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  opacity: isRemoving ? 0.2 : 1,
                  transform: isRemoving ? 'translateX(8px)' : 'translateX(0)',
                  // സെലക്ട് ചെയ്ത റോയ്ക്ക് പ്രത്യേക കളറും ഇടതുവശത്ത് കട്ടിയുള്ള ബോർഡറും നൽകിയിരിക്കുന്നു
                  background: checked
                    ? 'var(--brand-bg)'
                    : selected 
                      ? 'rgba(107, 0, 0, 0.08)' 
                      : idx % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                  boxShadow: selected ? 'inset 4px 0 0 var(--brand, #6b0000)' : 'none',
                  borderBottom: `1px solid ${selected || checked ? 'rgba(107,0,0,0.12)' : 'var(--border)'}`,
                  transition: 'background 0.1s, box-shadow 0.1s, opacity 0.14s ease, transform 0.14s ease',
                }}
              >
                <td style={{ ...tdStyle, padding: '6px 4px', paddingLeft: 'clamp(10px, 1.6vw, 16px)' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 20, height: 20, borderRadius: 5, fontSize: 10, fontWeight: 800,
                    background: checked || selected ? 'var(--brand)' : 'var(--surface-2)',
                    color: checked || selected ? '#fff' : 'var(--text-3)',
                  }}>
                    {idx + 1}
                  </span>
                </td>
                <td style={{ 
                  ...tdStyle, 
                  textAlign: 'left', 
                  fontWeight: selected ? 700 : 600, 
                  padding: '6px 8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' 
                }} title={i.description}>
                  {i.description}
                </td>
                <td style={{ ...tdStyle, padding: '6px 4px' }}>
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                  >
                    <button className="lite-btn" disabled={selectMode} onClick={() => onAdjustQty(rowKey, -1)} style={qtyBtnStyle}>−</button>
                    <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 700 }}>{i.qty}</span>
                    <button className="lite-btn" disabled={selectMode} onClick={() => onAdjustQty(rowKey, 1)} style={qtyBtnStyle}>+</button>
                  </div>
                </td>
                <td style={{ ...tdStyle, padding: '6px 6px', color: 'var(--text-3)' }}>{fmtMoney(i.unitPriceGross ?? i.unitPrice)}</td>
                <td style={{ ...tdStyle, padding: '6px 6px', fontWeight: 700, color: 'var(--text-1)' }}>{fmtMoney(i.lineTotal)}</td>
                <td style={{ ...tdStyle, padding: '6px 4px', paddingRight: 'clamp(10px, 1.6vw, 16px)' }}>
                  {selectMode ? (
                    <button
                      className="lite-btn"
                      onClick={e => { e.stopPropagation(); toggleChecked(rowKey) }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: 6, margin: '0 auto',
                        border: `1.5px solid ${checked ? 'var(--brand)' : 'var(--border)'}`,
                        background: checked ? 'var(--brand)' : 'var(--surface)',
                        color: '#fff', cursor: 'pointer',
                      }}
                    >
                      {checked && <Check size={14} strokeWidth={3} />}
                    </button>
                  ) : (
                    <button className="lite-btn" onClick={e => { e.stopPropagation(); handleRemoveRow(rowKey) }} style={removeBtnStyle}>✕</button>
                  )}
                </td>
              </tr>
            )
          })}
          {cartItems.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={32} strokeWidth={1.5} style={{ opacity: 0.4 }} />
                  <span>Cart is empty — search and tap an item to add it</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}