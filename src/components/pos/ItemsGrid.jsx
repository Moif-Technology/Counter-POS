import { Trash2 } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { fmt3 } from '../../lib/utils'

const COLS = [
  { key: 'slNo', label: '#', w: 36, align: 'center' },
  { key: 'barcode', label: 'Barcode', w: 110 },
  { key: 'description', label: 'Description', flex: true },
  { key: 'qty', label: 'Qty', w: 52, align: 'center' },
  { key: 'unitPrice', label: 'Price', w: 82, align: 'right', render: v => fmt3(v) },
  { key: 'discount', label: 'Disc', w: 66, align: 'right', render: v => fmt3(v || 0) },
  { key: '_sub', label: 'Sub Total', w: 90, align: 'right', render: (_, r) => fmt3(r.qty * r.unitPrice) },
  { key: 'vatPer', label: 'VAT%', w: 58, align: 'right', render: v => (v || 0).toFixed(2) + '%' },
  { key: 'lineTotal', label: 'Total', w: 92, align: 'right', render: v => fmt3(v) },
  { key: '_del', label: '', w: 40, align: 'center' },
]

export default function ItemsGrid() {
  const cartItems = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const removeItem = usePosStore(s => s.removeItem)

  const isNum = (key) => ['unitPrice','discount','_sub','vatPer','lineTotal'].includes(key)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* TH */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--surface-2)', borderBottom: '2px solid var(--border)',
        flexShrink: 0,
      }}>
        {COLS.map(col => (
          <div key={col.key} style={{
            padding: '10px 10px',
            textAlign: col.align || 'left',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            color: 'var(--text-2)', whiteSpace: 'nowrap',
            width: col.flex ? undefined : col.w,
            ...(col.flex ? { flex: 1 } : {}),
          }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface)' }}>
        {cartItems.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 220, gap: 10, color: 'var(--text-3)',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>No items added</div>
            <div style={{ fontSize: 12 }}>Scan or type a barcode to start</div>
          </div>
        ) : cartItems.map((row, idx) => {
          const selected = row.barcode === selectedRowKey
          return (
            <div
              key={row.barcode}
              onClick={() => usePosStore.setState({ selectedRowKey: row.barcode })}
              style={{
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                background: selected ? 'var(--brand-tint)' : idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)',
                borderBottom: '1px solid var(--border)',
                outline: selected ? '2px solid rgba(92,0,0,0.15)' : 'none',
                outlineOffset: -1,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--brand-bg)' }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.background = idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}
            >
              {COLS.map(col => {
                if (col.key === '_del') return (
                  <div key="_del" style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={e => { e.stopPropagation(); removeItem(row.barcode) }}
                      aria-label="Remove item"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-3)', padding: 6, borderRadius: 6,
                        display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#c00000'; e.currentTarget.style.background = '#fff0f0' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )

                const raw = col.key.startsWith('_') ? null : row[col.key]
                const display = col.render ? col.render(raw, row) : (raw ?? '—')

                return (
                  <div key={col.key} style={{
                    padding: '8px 10px',
                    textAlign: col.align || 'left',
                    fontSize: 13,
                    fontWeight: col.key === 'lineTotal' ? 600 : col.key === 'description' ? 500 : 400,
                    color: col.key === 'lineTotal' ? 'var(--brand)' : col.key === 'description' ? 'var(--text-1)' : 'var(--text-2)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontVariantNumeric: isNum(col.key) ? 'tabular-nums' : undefined,
                    fontFamily: isNum(col.key) ? "'DM Mono', monospace" : undefined,
                    maxWidth: col.flex ? 0 : undefined,
                    width: col.flex ? undefined : col.w,
                    ...(col.flex ? { flex: 1, minWidth: 0 } : {}),
                  }}>
                    {col.key === 'slNo' ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: selected ? 'var(--brand)' : 'var(--surface-2)',
                        color: selected ? '#fff' : 'var(--text-2)',
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

      {/* Summary footer */}
      {cartItems.length > 0 && (
        <div style={{
          display: 'flex', background: 'var(--surface-2)',
          borderTop: '2px solid var(--border)', flexShrink: 0,
        }}>
          {COLS.map(col => {
            let content = ''
            if (col.key === 'slNo') content = `${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}`
            if (col.key === 'qty') content = cartItems.reduce((s, r) => s + r.qty, 0)
            if (col.key === 'lineTotal') content = fmt3(cartItems.reduce((s, r) => s + r.lineTotal, 0))
            if (col.key === '_sub') content = fmt3(cartItems.reduce((s, r) => s + r.qty * r.unitPrice, 0))
            return (
              <div key={col.key} style={{
                padding: '9px 10px',
                textAlign: col.align || 'left',
                fontSize: col.key === 'slNo' ? 11 : 12,
                fontWeight: 700,
                color: content ? (col.key === 'lineTotal' ? 'var(--brand)' : 'var(--text-1)') : 'transparent',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: ['lineTotal','_sub'].includes(col.key) ? "'DM Mono', monospace" : undefined,
                width: col.flex ? undefined : col.w,
                ...(col.flex ? { flex: 1 } : {}),
              }}>
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
