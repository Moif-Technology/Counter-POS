import { usePosStore } from '../../store/posStore'
import { fmt3 } from '../../lib/utils'
import { ScanLine } from 'lucide-react'

function Cell({ label, value, accent, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, lineHeight: 1,
        color: accent ? 'var(--brand)' : 'var(--text-1)',
        fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
      }}>
        {value}
      </span>
    </div>
  )
}

export default function ItemPreview() {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const item           = cartItems.find(i => (i.productId != null ? `pid_${i.productId}` : `bc_${i.barcode}`) === selectedRowKey)

  if (!item) return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 14px', background: 'var(--surface)',
    }}>
      <ScanLine size={13} color="var(--text-4)" />
      <span style={{ fontSize: 11.5, color: 'var(--text-4)', fontWeight: 500 }}>Select a row to preview item details</span>
    </div>
  )

  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', gap: 20,
      padding: '0 14px',
      background: 'linear-gradient(90deg, var(--brand-bg) 0%, var(--surface) 100%)',
      borderLeft: '3px solid var(--brand)',
    }}>

      {/* Item name — fills space */}
      <div style={{
        flex: 1, minWidth: 0,
        fontSize: 13, fontWeight: 700, color: 'var(--text-1)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.description}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 26, background: 'var(--border)', flexShrink: 0 }} />

      <Cell label="Barcode"    value={item.barcode} />
      <Cell label="Qty"        value={item.qty} mono />
      <Cell label="Unit Price" value={fmt3(item.unitPrice)} mono />
      <Cell label="VAT %"      value={(item.vatPer || 0).toFixed(2) + '%'} mono />

      {/* Divider */}
      <div style={{ width: 1, height: 26, background: 'var(--border-2)', flexShrink: 0 }} />

      <Cell label="Line Total" value={fmt3(item.lineTotal)} accent mono />
    </div>
  )
}
