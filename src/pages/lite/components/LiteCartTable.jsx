import { getCartRowKey } from '../../../lib/cartLine'
import { fmtMoney } from '../../../lib/currencyFormat'
import { thStyle, tdStyle, qtyBtnStyle, removeBtnStyle } from '../liteStyles'

export default function LiteCartTable({
  cartItems, selectedRowKey, onSelectRow, onAdjustQty, onRemoveItem,
}) {
  return (
    <div className="lite-panel-center lite-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, minWidth: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
            <th style={thStyle}>#</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Item</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Price</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((i, idx) => {
            const rowKey = getCartRowKey(i)
            return (
              <tr
                key={rowKey}
                onClick={() => onSelectRow(rowKey)}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selectedRowKey === rowKey ? 'var(--brand-bg)' : 'transparent',
                }}
              >
                <td style={tdStyle}>{idx + 1}</td>
                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{i.description}</td>
                <td style={tdStyle}>
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <button className="lite-btn" onClick={() => onAdjustQty(rowKey, -1)} style={qtyBtnStyle}>−</button>
                    <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700 }}>{i.qty}</span>
                    <button className="lite-btn" onClick={() => onAdjustQty(rowKey, 1)} style={qtyBtnStyle}>+</button>
                  </div>
                </td>
                <td style={tdStyle}>{fmtMoney(i.unitPriceGross ?? i.unitPrice)}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtMoney(i.lineTotal)}</td>
                <td style={tdStyle}>
                  <button className="lite-btn" onClick={e => { e.stopPropagation(); onRemoveItem(rowKey) }} style={removeBtnStyle}>✕</button>
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
