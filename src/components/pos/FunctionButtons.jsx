import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GroupModal from './GroupModal'
import {
  ShoppingCart, PauseCircle, Archive, Printer, Receipt,
  RefreshCw, Trash2, Minus, RotateCcw, LogOut,
  Search, Tag, Grid3x3, Percent, DollarSign,
  User, BarChart2, ArrowLeftRight, FileText, Package,
  Lock, Layers, Save, Hash, Plus,
} from 'lucide-react'
import { usePosStore } from '../../store/posStore'

/* ─── Side nav button data ───────────────────────────────────── */
const SIDE_BUTTONS = [
  { label: 'POS',        icon: ShoppingCart, isPOS: true },
  { label: 'Hold Bill',  icon: PauseCircle },
  { label: 'Recall',     icon: Archive },
  { label: 'Print',      icon: Printer },
  { label: 'Reprint',    icon: Printer },
  { label: 'Sub Total',  icon: Receipt },
  { label: 'Repeat',     icon: RefreshCw },
  { label: 'Clear All',  icon: Trash2,    danger: true },
  { label: 'Clear Line', icon: Minus,     danger: true },
  { label: 'Return',     icon: RotateCcw, danger: true },
]

/* ─── Bottom feature grid button data ───────────────────────── */
const FEATURE_BUTTONS = [
  { label: 'Look Up',      icon: Search,        color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Price Change', icon: Tag,           color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Group',        icon: Grid3x3,       color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Discount',     icon: Percent,       color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Price Check',  icon: Search,        color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Currency',     icon: DollarSign,    color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Sales Man',    icon: User,          color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Report',       icon: BarChart2,     color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'Cash In/Out',  icon: ArrowLeftRight,color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Receipt',      icon: FileText,      color: 'var(--text-2)', bg: 'var(--surface-2)', border: 'var(--border)' },
  { label: 'Comments',     icon: FileText,      color: 'var(--text-2)', bg: 'var(--surface-2)', border: 'var(--border)' },
  { label: 'Packet Scan',  icon: Package,       color: 'var(--text-2)', bg: 'var(--surface-2)', border: 'var(--border)' },
  { label: 'NP Scale',     icon: Hash,          color: 'var(--text-2)', bg: 'var(--surface-2)', border: 'var(--border)' },
  { label: 'Lock',         icon: Lock,          color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
  { label: 'Price Level',  icon: Layers,        color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Save Delivery',icon: Save,          color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Settlement',   icon: Receipt,       color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
]

/* ─────────────────────────────────────────────────────────────
   SideNav — narrow icon-only left sidebar
   ───────────────────────────────────────────────────────────── */
export function SideNav() {
  const navigate  = useNavigate()
  const clearAll  = usePosStore(s => s.clearAll)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflowY: 'auto', overflowX: 'hidden',
      padding: '6px 0',
    }}>
      {SIDE_BUTTONS.map((btn, i) => {
        const Icon = btn.icon
        const isPOS = btn.isPOS

        const handleClick = () => {
          if (btn.label === 'Clear All') { clearAll(); return }
          if (btn.label === 'Clear Line') {
            const { selectedRowKey, removeItem } = usePosStore.getState()
            if (selectedRowKey) removeItem(selectedRowKey)
            return
          }
        }

        return (
          <button
            key={i}
            onClick={handleClick}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4,
              padding: '10px 4px', margin: '1px 5px',
              borderRadius: 'var(--r-md)',
              border: isPOS ? '1.5px solid var(--brand-border)' : '1px solid transparent',
              background: isPOS ? 'var(--brand-bg)' : 'transparent',
              color: isPOS ? 'var(--brand)' : btn.danger ? 'var(--red)' : 'var(--text-2)',
              fontSize: 9, fontWeight: isPOS ? 800 : 600, lineHeight: 1.2,
              textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.1s',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={e => {
              if (!isPOS) {
                const bg = btn.danger ? 'var(--red-bg)' : 'var(--surface-2)'
                const bc = btn.danger ? 'var(--red-border)' : 'var(--border)'
                e.currentTarget.style.background  = bg
                e.currentTarget.style.borderColor  = bc
              }
            }}
            onMouseLeave={e => {
              if (!isPOS) {
                e.currentTarget.style.background  = 'transparent'
                e.currentTarget.style.borderColor  = 'transparent'
              }
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Icon size={17} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 8.5, letterSpacing: 0.2, maxWidth: 56, wordBreak: 'break-word' }}>
              {btn.label}
            </span>
          </button>
        )
      })}

      {/* Spacer + logout at bottom */}
      <div style={{ flex: 1 }} />
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 4,
          padding: '10px 4px', margin: '2px 5px 6px',
          borderRadius: 'var(--r-md)',
          border: '1px solid transparent', background: 'transparent',
          color: 'var(--text-3)', fontSize: 8.5, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <LogOut size={17} />
        <span>Logout</span>
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   FeatureGrid — horizontal button strip at center bottom
   ───────────────────────────────────────────────────────────── */
export function FeatureGrid() {
  const [groupOpen, setGroupOpen] = useState(false)

  return (
    <>
    <div style={{
      display: 'flex', alignItems: 'center',
      height: '100%', padding: '5px 8px', gap: 6,
      overflowX: 'auto',
    }}>
      {FEATURE_BUTTONS.map((btn, i) => {
        const Icon = btn.icon
        const isGroup = btn.label === 'Group'
        return (
          <button
            key={i}
            onClick={isGroup ? () => setGroupOpen(true) : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 5,
              flexShrink: 0, width: 72, height: 72,
              borderRadius: 12,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              fontSize: 10, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: 'var(--shadow-xs)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background   = btn.bg
              e.currentTarget.style.color        = btn.color
              e.currentTarget.style.borderColor  = btn.border
              e.currentTarget.style.transform    = 'translateY(-2px)'
              e.currentTarget.style.boxShadow    = '0 6px 16px rgba(0,0,0,0.10)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background   = 'var(--surface)'
              e.currentTarget.style.color        = 'var(--text-2)'
              e.currentTarget.style.borderColor  = 'var(--border)'
              e.currentTarget.style.transform    = 'translateY(0)'
              e.currentTarget.style.boxShadow    = 'var(--shadow-xs)'
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93) translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.10)' }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span style={{ textAlign: 'center', lineHeight: 1.2, maxWidth: 66, wordBreak: 'break-word' }}>{btn.label}</span>
          </button>
        )
      })}

      {/* Add custom button */}
      <button style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0, width: 72, height: 72,
        borderRadius: 12,
        border: '1.5px dashed var(--border)',
        background: 'transparent', color: 'var(--text-4)',
        cursor: 'pointer', transition: 'all 0.15s ease',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <Plus size={18} />
      </button>
    </div>

    {groupOpen && (
      <GroupModal
        onClose={() => setGroupOpen(false)}
        onSelect={({ group }) => { setGroupOpen(false) }}
      />
    )}
    </>
  )
}

/* Default export kept for any existing imports */
export default SideNav
