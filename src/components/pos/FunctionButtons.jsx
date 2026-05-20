import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Trash2, Minus, RotateCcw, Hash, Edit3, Receipt,
  RefreshCw, Search, Archive, PauseCircle, Grid3x3,
  Printer, Star, Package, Tag, Lock,
  User, Percent, BarChart2, FileText, ArrowLeftRight,
  LogOut, X, Save, ChevronRight, DollarSign,
} from 'lucide-react'
import { usePosStore } from '../../store/posStore'

const TABS = [
  {
    key: 'fn', label: 'Functions',
    buttons: [
      { label: 'Clear All',   icon: Trash2,       danger: true,  onClick: () => usePosStore.getState().clearAll() },
      { label: 'Clear Line',  icon: Minus,        danger: true,  onClick: () => { const s = usePosStore.getState(); s.selectedRowKey && s.removeItem(s.selectedRowKey) } },
      { label: 'Return',      icon: RotateCcw,    danger: true },
      { label: 'Qty Mode',    icon: Hash,         success: true, onClick: () => usePosStore.setState({ inputMode: 'qty' }) },
      { label: 'Qty Change',  icon: Edit3,        success: true },
      { label: 'Sub Total',   icon: Receipt },
      { label: 'Repeat',      icon: RefreshCw },
      { label: 'Look Up',     icon: Search,       info: true },
      { label: 'Recall Bill', icon: Archive,      purple: true },
      { label: 'Hold Bill',   icon: PauseCircle,  purple: true },
      { label: 'Groups',      icon: Grid3x3,      info: true },
      { label: 'Bill Print',  icon: Printer },
      { label: 'Reprint',     icon: Printer },
      { label: 'Price Change',icon: Tag,          amber: true },
    ],
  },
  {
    key: 'feat', label: 'Features',
    buttons: [
      { label: 'Privilege',   icon: Star,         amber: true },
      { label: 'Packet Scan', icon: Package },
      { label: 'Price Check', icon: Search,       info: true },
      { label: 'Currency',    icon: DollarSign,   success: true },
      { label: 'Lock',        icon: Lock,         danger: true },
      { label: 'No Sale',     icon: ChevronRight },
      { label: 'Sub Total',   icon: Receipt },
      { label: 'Sales Man',   icon: User,         info: true },
      { label: 'Discount',    icon: Percent,      amber: true },
      { label: 'Reports',     icon: BarChart2,    purple: true },
      { label: 'Receipt',     icon: FileText },
      { label: 'Comments',    icon: FileText },
      { label: 'Cash In/Out', icon: ArrowLeftRight, success: true },
    ],
  },
  {
    key: 'del', label: 'Delivery',
    buttons: [
      { label: 'Price Level',   icon: Tag,      amber: true },
      { label: 'Save Delivery', icon: Save,     success: true },
      { label: 'Settlement',    icon: Receipt,  info: true },
    ],
  },
]

function getColors(b) {
  if (b.danger)  return { color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: '#fecaca' }
  if (b.success) return { color: 'var(--green)',  bg: 'var(--green-bg)',  border: '#bbf7d0' }
  if (b.info)    return { color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: '#bfdbfe' }
  if (b.amber)   return { color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: '#fde68a' }
  if (b.purple)  return { color: 'var(--purple)', bg: 'var(--purple-bg)',border: '#ddd6fe' }
  return { color: 'var(--text-2)', bg: 'var(--surface-2)', border: 'var(--border)' }
}

export default function FunctionButtons() {
  const [tab, setTab] = useState('fn')
  const navigate = useNavigate()
  const current = TABS.find(t => t.key === tab)
  const isSession = tab === 'sess'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '4px 6px 6px' }}>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 3, marginBottom: 8,
        background: 'var(--surface-2)', borderRadius: 10, padding: 4,
        border: '1px solid var(--border)',
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '7px 2px', borderRadius: 8, border: 'none',
            background: tab === t.key ? 'var(--surface)' : 'transparent',
            color: tab === t.key ? 'var(--text-1)' : 'var(--text-3)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
        <button onClick={() => setTab('sess')} style={{
          flex: 1, padding: '7px 2px', borderRadius: 8, border: 'none',
          background: isSession ? 'var(--brand-tint)' : 'transparent',
          color: isSession ? 'var(--brand)' : 'var(--text-3)',
          fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
        }}>
          Session
        </button>
      </div>

      {/* Content */}
      {!isSession ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 5, alignContent: 'start' }}>
          {current?.buttons.map((b, i) => {
            const Icon = b.icon
            const c = getColors(b)
            return (
              <button key={i} onClick={b.onClick} style={{
                padding: '10px 8px', borderRadius: 10,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                fontWeight: 500, fontSize: 11.5, transition: 'all 0.12s',
                textAlign: 'left', boxShadow: 'var(--shadow-sm)',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = c.bg
                  e.currentTarget.style.color = c.color
                  e.currentTarget.style.borderColor = c.border
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--surface)'
                  e.currentTarget.style.color = 'var(--text-2)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Icon size={13} style={{ flexShrink: 0 }} />
                {b.label}
              </button>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            background: 'var(--bg)', borderRadius: 10, padding: '10px 14px',
            border: '1px solid var(--border)', color: 'var(--text-3)',
            fontSize: 12, minHeight: 56, fontStyle: 'italic',
          }}>
            Reminders area
          </div>
          <button onClick={() => navigate('/')} style={{
            padding: '13px 0', borderRadius: 10, border: 'none',
            background: 'linear-gradient(160deg, var(--brand) 0%, var(--brand-2) 100%)',
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 3px 12px rgba(92,0,0,0.2)',
          }}>
            <LogOut size={15} /> Logout
          </button>
          <button onClick={() => window.close()} style={{
            padding: '13px 0', borderRadius: 10,
            border: '1.5px solid var(--border)',
            background: 'var(--surface)', color: 'var(--brand)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <X size={15} /> Exit
          </button>
        </div>
      )}
    </div>
  )
}
