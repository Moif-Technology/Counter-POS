import { Trash2 } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { fmt3 } from '../../lib/utils'

const COLS = [
  { key: 'slNo',        label: '#',         w: 38,  align: 'center' },
  { key: 'barcode',     label: 'Barcode',   w: 108 },
  { key: 'description', label: 'Item',      flex: true },
  { key: 'qty',         label: 'Qty',       w: 50,  align: 'center' },
  { key: 'unitPrice',   label: 'Price',     w: 84,  align: 'right', render: v => fmt3(v) },
  { key: 'discount',    label: 'Disc',      w: 64,  align: 'right', render: v => fmt3(v || 0) },
  { key: '_sub',        label: 'Sub Total', w: 90,  align: 'right', render: (_, r) => fmt3(r.qty * r.unitPrice) },
  { key: 'vatPer',      label: 'VAT%',      w: 56,  align: 'right', render: v => (v || 0).toFixed(2) + '%' },
  { key: 'lineTotal',   label: 'Total',     w: 94,  align: 'right', render: v => fmt3(v) },
  { key: '_del',        label: '',          w: 38,  align: 'center' },
]

const NUM_KEYS = new Set(['unitPrice','discount','_sub','vatPer','lineTotal'])

export default function ItemsGrid() {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const removeItem     = usePosStore(s => s.removeItem)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Column headers ──────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--surface-2)',
        borderBottom: '2px solid var(--border)',
        flexShrink: 0,
      }}>
        {COLS.map(col => (
          <div key={col.key} style={{
            padding: '9px 10px',
            textAlign: col.align || 'left',
            fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
            color: 'var(--text-3)', whiteSpace: 'nowrap',
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
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60%', gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--surface-2)', border: '1.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>No items added</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 400 }}>Scan or type a barcode to start</div>
          </div>
        ) : cartItems.map((row, idx) => {
          const selected = row.barcode === selectedRowKey
          return (
            <div
              key={row.barcode}
              onClick={() => usePosStore.setState({ selectedRowKey: row.barcode })}
              style={{
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                background: selected
                  ? 'var(--brand-tint)'
                  : idx % 2 === 0 ? 'var(--surface)' : '#fafaf8',
                borderBottom: '1px solid var(--border)',
                borderLeft: `3px solid ${selected ? 'var(--brand)' : 'transparent'}`,
                transition: 'background 0.1s',
                minHeight: 38,
              }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--brand-bg)' }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.background = idx % 2 === 0 ? 'var(--surface)' : '#fafaf8' }}
            >
              {COLS.map(col => {

                if (col.key === '_del') return (
                  <div key="_del" style={{ width: 38, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={e => { e.stopPropagation(); removeItem(row.barcode) }}
                      aria-label="Remove item"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-4)', padding: 5, borderRadius: 6,
                        display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )

                const raw     = col.key.startsWith('_') ? null : row[col.key]
                const display = col.render ? col.render(raw, row) : (raw ?? '—')
                const isNum   = NUM_KEYS.has(col.key)
                const isTotal = col.key === 'lineTotal'
                const isDesc  = col.key === 'description'

                return (
                  <div key={col.key} style={{
                    padding: '7px 10px',
                    textAlign: col.align || 'left',
                    fontSize: 12.5,
                    fontWeight: isTotal ? 700 : isDesc ? 500 : 400,
                    color: isTotal ? 'var(--brand)' : isDesc ? 'var(--text-1)' : 'var(--text-2)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontVariantNumeric: isNum ? 'tabular-nums' : undefined,
                    fontFamily: isNum ? "'JetBrains Mono', monospace" : undefined,
                    ...(col.flex ? { flex: 1, minWidth: 0 } : { width: col.w, flexShrink: 0 }),
                  }}>
                    {col.key === 'slNo' ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 6, fontSize: 10.5, fontWeight: 800,
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

      {/* ── Footer totals row ───────────────────────── */}
      {cartItems.length > 0 && (
        <div style={{
          display: 'flex', background: 'var(--surface-2)',
          borderTop: '2px solid var(--border)', flexShrink: 0,
        }}>
          {COLS.map(col => {
            let content = ''
            if (col.key === 'slNo')      content = `${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}`
            if (col.key === 'qty')       content = cartItems.reduce((s, r) => s + r.qty, 0)
            if (col.key === '_sub')      content = fmt3(cartItems.reduce((s, r) => s + r.qty * r.unitPrice, 0))
            if (col.key === 'lineTotal') content = fmt3(cartItems.reduce((s, r) => s + r.lineTotal, 0))
            const isTotal = col.key === 'lineTotal'
            return (
              <div key={col.key} style={{
                padding: '8px 10px',
                textAlign: col.align || 'left',
                fontSize: col.key === 'slNo' ? 10.5 : 12,
                fontWeight: 700,
                color: content
                  ? (isTotal ? 'var(--brand)' : 'var(--text-1)')
                  : 'transparent',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: isTotal || col.key === '_sub' ? "'JetBrains Mono', monospace" : undefined,
                ...(col.flex ? { flex: 1, minWidth: 0 } : { width: col.w, flexShrink: 0 }),
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
