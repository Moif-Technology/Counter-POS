import { useRef, useState } from 'react'
import { Trash2, X, Check } from 'lucide-react'
import { getCartRowKey } from '../../../lib/cartLine'
import { fmtMoney } from '../../../lib/currencyFormat'
import { thStyle, tdStyle, qtyBtnStyle, removeBtnStyle } from '../liteStyles'

const LONG_PRESS_MS = 450

export default function LiteCartTable({
  cartItems, selectedRowKey, onSelectRow, onAdjustQty, onRemoveItem, onDeleteMany,
}) {
  const [selectMode, setSelectMode] = useState(false)
  const [checkedKeys, setCheckedKeys] = useState(() => new Set())
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

  return (
    <div className="lite-panel-center lite-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, minWidth: 0 }}>
      {selectMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', marginBottom: 10, borderRadius: 10,
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

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={thStyle}>#</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Item</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Price</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((item, idx) => ({ item, idx })).reverse().map(({ item: i, idx }) => {
            const rowKey = getCartRowKey(i)
            const selected = rowKey === selectedRowKey
            const checked = checkedKeys.has(rowKey)
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
                  background: checked
                    ? 'var(--brand-bg)'
                    : selected ? 'rgba(107,0,0,0.06)' : idx % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                  borderBottom: `1px solid ${selected || checked ? 'rgba(107,0,0,0.12)' : 'var(--border)'}`,
                  transition: 'background 0.1s',
                }}
              >
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 20, height: 20, borderRadius: 5, fontSize: 10, fontWeight: 800,
                    background: checked || selected ? 'var(--brand)' : 'var(--surface-2)',
                    color: checked || selected ? '#fff' : 'var(--text-3)',
                  }}>
                    {idx + 1}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{i.description}</td>
                <td style={tdStyle}>
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <button className="lite-btn" disabled={selectMode} onClick={() => onAdjustQty(rowKey, -1)} style={qtyBtnStyle}>−</button>
                    <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700 }}>{i.qty}</span>
                    <button className="lite-btn" disabled={selectMode} onClick={() => onAdjustQty(rowKey, 1)} style={qtyBtnStyle}>+</button>
                  </div>
                </td>
                <td style={tdStyle}>{fmtMoney(i.unitPriceGross ?? i.unitPrice)}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtMoney(i.lineTotal)}</td>
                <td style={tdStyle}>
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
                    <button className="lite-btn" onClick={e => { e.stopPropagation(); onRemoveItem(rowKey) }} style={removeBtnStyle}>✕</button>
                  )}
                </td>
              </tr>
            )
          })}
          {cartItems.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                Cart is empty — search and tap an item to add it
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
