import { useState } from 'react'
import { Trash2, Minus, Plus, Save } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { calcLineTotals, getCartRowKey } from '../../lib/cartLine'
import { fmt3 } from '../../lib/utils'
import ItemDetailModal from '../popup/ItemDetailModal'
import { closeAndFocusBarcode } from '../../lib/posFocus'

const COLS = [
  { key: 'slNo',        label: '#',         w: 36,  align: 'center' },
  { key: 'barcode',     label: 'Barcode',   w: 110 },
  { key: 'description', label: 'Item',      flex: true },
  { key: 'qty',         label: 'Qty',       w: 88,  align: 'center' },
  { key: 'unitPrice',   label: 'Price',     w: 78,  align: 'right', render: v => fmt3(v) },
  { key: 'discount',    label: 'Disc',      w: 60,  align: 'right', render: v => fmt3(v || 0) },
  { key: '_sub',        label: 'Sub Total', w: 84,  align: 'right', render: (_, r) => fmt3(calcLineTotals(r).subTotal) },
  { key: 'vatPer',      label: 'VAT%',      w: 52,  align: 'right', render: v => (v || 0).toFixed(2) + '%' },
  { key: 'lineTotal',   label: 'Total',     w: 84,  align: 'right', render: v => fmt3(v) },
  { key: '_del',        label: '',          w: 34,  align: 'center' },
]

const NUM_KEYS = new Set(['unitPrice', 'discount', '_sub', 'vatPer', 'lineTotal'])

export default function ItemsGrid() {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const removeItem     = usePosStore(s => s.removeItem)
  const adjustLineQty  = usePosStore(s => s.adjustLineQty)
  const netAmount      = usePosStore(s => s.netAmount)
  const [modalItem, setModalItem] = useState(null)

  const totalQty = cartItems.reduce((s, r) => s + r.qty, 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Column headers ──────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--brand-bg)',
        borderBottom: '1.5px solid var(--brand-border)',
        flexShrink: 0,
      }}>
        {COLS.map(col => (
          <div key={col.key} style={{
            padding: '8px 10px',
            textAlign: col.align || 'left',
            fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
            color: 'var(--brand)', whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            ...(col.flex ? { flex: 1, minWidth: 0 } : { width: col.w, flexShrink: 0 }),
          }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* ── Rows ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface)' }}>

        {cartItems.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '70%', gap: 10,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'var(--surface-2)', border: '1.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>No items added</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-4)' }}>Scan or type a barcode to start</div>
          </div>
        ) : cartItems.map((row, idx) => {
          const rowKey   = row._key ?? (row.productId != null ? `pid_${row.productId}` : `bc_${row.barcode}`)
          const selected = rowKey === selectedRowKey
          return (
            <div
              key={rowKey}
              onClick={() => usePosStore.setState({ selectedRowKey: rowKey })}
              onDoubleClick={() => setModalItem(row)}
              style={{
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                background: selected
                  ? 'rgba(107,0,0,0.06)'
                  : idx % 2 === 0 ? 'var(--surface)' : '#fafaf8',
                borderBottom: `1px solid ${selected ? 'rgba(107,0,0,0.12)' : 'var(--border)'}`,
                borderLeft: `3px solid ${selected ? 'var(--brand)' : 'transparent'}`,
                transition: 'background 0.1s',
                minHeight: 40,
              }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f5f5f5' }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.background = idx % 2 === 0 ? 'var(--surface)' : '#fafaf8' }}
            >
              {COLS.map(col => {

                /* Delete button */
                if (col.key === '_del') return (
                  <div key="_del" style={{ width: 34, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={e => { e.stopPropagation(); removeItem(rowKey) }}
                      aria-label="Remove item"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-4)', padding: 5, borderRadius: 6,
                        display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )

                /* Qty cell — simple grouped stepper */
                if (col.key === 'qty') return (
                  <div key="qty" style={{
                    width: col.w, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px',
                  }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center',
                      border: '1px solid var(--border)', borderRadius: 7,
                      overflow: 'hidden', background: 'var(--surface)',
                    }}>
                      <button
                        onClick={e => { e.stopPropagation(); adjustLineQty(rowKey, -1) }}
                        style={{
                          width: 24, height: 26, border: 'none',
                          borderRight: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-3)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.1s, color 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
                      >
                        <Minus size={9} />
                      </button>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '0 8px',
                        fontVariantNumeric: 'tabular-nums',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: 'var(--text-1)', userSelect: 'none',
                      }}>
                        {row.qty % 1 === 0 ? row.qty : row.qty.toFixed(3)}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); adjustLineQty(rowKey, 1) }}
                        style={{
                          width: 24, height: 26, border: 'none',
                          borderLeft: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-3)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.1s, color 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-bg)'; e.currentTarget.style.color = 'var(--blue)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
                      >
                        <Plus size={9} />
                      </button>
                    </div>
                  </div>
                )

                /* Standard cells */
                const raw     = col.key.startsWith('_') ? null : row[col.key]
                const display = col.render ? col.render(raw, row) : (raw ?? '—')
                const isNum   = NUM_KEYS.has(col.key)
                const isTotal = col.key === 'lineTotal'
                const isDesc  = col.key === 'description'

                return (
                  <div key={col.key} style={{
                    padding: '6px 10px',
                    textAlign: col.align || 'left',
                    fontSize: 12,
                    fontWeight: isTotal ? 700 : isDesc ? 500 : 400,
                    color: isTotal ? 'var(--blue)' : isDesc ? 'var(--text-1)' : 'var(--text-2)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontVariantNumeric: isNum ? 'tabular-nums' : undefined,
                    fontFamily: isNum ? "'JetBrains Mono', monospace" : undefined,
                    ...(col.flex ? { flex: 1, minWidth: 0 } : { width: col.w, flexShrink: 0 }),
                  }}>
                    {col.key === 'slNo' ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: 5, fontSize: 10, fontWeight: 800,
                        background: selected ? 'var(--brand)' : 'var(--surface-2)',
                        color: selected ? '#fff' : 'var(--text-3)',
                      }}>
                        {display}
                      </span>
                    ) : display}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Footer bar — totals + Save Bill ─────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--surface-2)',
        borderTop: '2px solid var(--border)',
        flexShrink: 0, padding: '0 10px', gap: 0,
        minHeight: 46,
      }}>
        {/* Total Items */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 14px 6px 4px', borderRight: '1px solid var(--border)' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Total Items</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>
            {cartItems.length}
          </span>
        </div>

        {/* Total Qty */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 14px', borderRight: '1px solid var(--border)' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Total Qty</span>
          <span style={{
            fontSize: 14, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2,
            fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums',
          }}>
            {totalQty % 1 === 0 ? totalQty : totalQty.toFixed(3)}
          </span>
        </div>

        {/* Total Amount — main highlight */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 14px', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Total Amount</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{
              fontSize: 20, fontWeight: 900, color: 'var(--blue)', lineHeight: 1,
              fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums',
            }}>
              {fmt3(netAmount)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', opacity: 0.6 }}>AED</span>
          </div>
        </div>

        {/* Save Bill button */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 18px', height: 36, borderRadius: 'var(--r-md)',
          background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
          border: 'none', color: '#fff',
          fontSize: 12, fontWeight: 800, cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(107,0,0,0.2)',
          transition: 'box-shadow 0.12s, transform 0.08s',
          flexShrink: 0,
        }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 16px rgba(107,0,0,0.32)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(107,0,0,0.2)' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <Save size={13} /> Save Bill
        </button>
      </div>

      {/* ── Item detail modal ───────────────────────── */}
      {modalItem && (
        <ItemDetailModal
          item={cartItems.find(i => getCartRowKey(i) === getCartRowKey(modalItem)) || modalItem}
          onClose={closeAndFocusBarcode(() => setModalItem(null))}
        />
      )}

    </div>
  )
}
