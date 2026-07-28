import {
  X, PauseCircle, Archive, Printer, Minus, RotateCcw, Percent, Search, Tag,
  SlidersHorizontal, Grid3x3, Package, DollarSign, User, Crown,
  BarChart2, ArrowLeftRight, FileText, Hash, Lock, Layers, Truck, Save, Receipt,
} from 'lucide-react'

/* Mirrors the main POS's feature grid — most actions are informational in Lite mode. */
export const MORE_OPTIONS = [
  { label: 'Hold Bill',    icon: PauseCircle,      color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Recall',       icon: Archive,          color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Reprint',      icon: Printer,          color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Clear Line',   icon: Minus,            color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
  { label: 'Return',       icon: RotateCcw,        color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
  { label: 'Look Up',      icon: Search,           color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Price Change', icon: Tag,              color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Qty Change',   icon: SlidersHorizontal,color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Group',        icon: Grid3x3,          color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Packet Scan',  icon: Package,          color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'Discount',     icon: Percent,          color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Price Enquiry',icon: Search,           color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Currency',     icon: DollarSign,       color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Sales Man',    icon: User,             color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Privilege',    icon: Crown,            color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Report',       icon: BarChart2,        color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'Cash In/Out',  icon: ArrowLeftRight,   color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Receipt',      icon: FileText,         color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Comments',     icon: FileText,         color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'NP Scale',     icon: Hash,             color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Lock',         icon: Lock,             color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
  { label: 'Price Level',  icon: Layers,           color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Delivery',     icon: Truck,            color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Save Delivery',icon: Save,             color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Settlement',   icon: Receipt,          color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
]

export default function LiteMoreOptionsModal({ onClose, onSelect }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="lite-scroll"
        style={{
          width: 640, maxWidth: '92vw', maxHeight: '82vh', overflowY: 'auto',
          background: 'var(--surface)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.3))',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>More Options</span>
          <button
            className="lite-btn"
            onClick={onClose}
            style={{ border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 10, minWidth: 40, minHeight: 40 }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
          {MORE_OPTIONS.map(({ label, icon: Icon, color, bg, border }) => (
            <button
              key={label}
              className="lite-btn"
              onClick={() => onSelect(label)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '16px 6px', borderRadius: 'var(--r-md)', minHeight: 76,
                border: `1.5px solid ${border}`, background: bg,
                color, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
              }}
            >
              <Icon size={18} />
              <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
