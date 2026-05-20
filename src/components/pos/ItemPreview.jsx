import { usePosStore } from '../../store/posStore'
import { fmt3 } from '../../lib/utils'
import { ScanLine } from 'lucide-react'

export default function ItemPreview() {
  const cartItems = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const item = cartItems.find(i => i.barcode === selectedRowKey)

  if (!item) return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 14px', color: 'var(--text-3)', background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
    }}>
      <ScanLine size={15} />
      <span style={{ fontSize: 12 }}>Select an item to see details</span>
    </div>
  )

  const Cell = ({ label, value, accent }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.6 }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700,
        color: accent ? 'var(--brand)' : 'var(--text-1)',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: accent ? "'DM Mono', monospace" : undefined,
      }}>
        {value}
      </span>
    </div>
  )

  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', gap: 24,
      padding: '0 14px', background: 'var(--brand-bg)',
      borderBottom: '2px solid var(--brand-tint)',
    }}>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.description}
      </div>
      <Cell label="BARCODE" value={item.barcode} />
      <Cell label="QTY" value={item.qty} />
      <Cell label="UNIT PRICE" value={fmt3(item.unitPrice)} />
      <Cell label="VAT%" value={(item.vatPer || 0).toFixed(2) + '%'} />
      <Cell label="LINE TOTAL" value={fmt3(item.lineTotal)} accent />
    </div>
  )
}
