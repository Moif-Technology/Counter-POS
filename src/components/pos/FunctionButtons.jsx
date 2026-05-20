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

const SECTIONS = [
  {
    label: 'Bill',
    color: 'var(--purple)',
    bg: 'var(--purple-bg)',
    border: 'var(--purple-border)',
    buttons: [
      { label: 'Hold Bill',   icon: PauseCircle },
      { label: 'Recall Bill', icon: Archive },
      { label: 'Bill Print',  icon: Printer },
      { label: 'Reprint',     icon: Printer },
      { label: 'Sub Total',   icon: Receipt },
      { label: 'Repeat',      icon: RefreshCw },
    ],
  },
  {
    label: 'Items',
    color: 'var(--red)',
    bg: 'var(--red-bg)',
    border: 'var(--red-border)',
    buttons: [
      { label: 'Clear All',   icon: Trash2,   color: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-border)' },
      { label: 'Clear Line',  icon: Minus,    color: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-border)' },
      { label: 'Return',      icon: RotateCcw, color: 'var(--red)',  bg: 'var(--red-bg)',   border: 'var(--red-border)' },
      { label: 'Qty Mode',    icon: Hash,     color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)' },
      { label: 'Qty Change',  icon: Edit3,    color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)' },
      { label: 'Look Up',     icon: Search,   color: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'var(--blue-border)' },
    ],
  },
  {
    label: 'Price',
    color: 'var(--amber)',
    bg: 'var(--amber-bg)',
    border: 'var(--amber-border)',
    buttons: [
      { label: 'Price Change', icon: Tag,      color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-border)' },
      { label: 'Groups',       icon: Grid3x3,  color: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'var(--blue-border)' },
    ],
  },
]

const FEATURES_BUTTONS = [
  { label: 'Discount',    icon: Percent,        color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Price Check', icon: Search,         color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Privilege',   icon: Star,           color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Currency',    icon: DollarSign,     color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Sales Man',   icon: User,           color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Reports',     icon: BarChart2,      color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'Cash In/Out', icon: ArrowLeftRight, color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Receipt',     icon: FileText,       color: 'var(--text-2)', bg: 'var(--surface-2)', border: 'var(--border)' },
  { label: 'Comments',    icon: FileText,       color: 'var(--text-2)', bg: 'var(--surface-2)', border: 'var(--border)' },
  { label: 'Packet Scan', icon: Package,        color: 'var(--text-2)', bg: 'var(--surface-2)', border: 'var(--border)' },
  { label: 'No Sale',     icon: ChevronRight,   color: 'var(--text-2)', bg: 'var(--surface-2)', border: 'var(--border)' },
  { label: 'Lock',        icon: Lock,           color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
]

const DELIVERY_BUTTONS = [
  { label: 'Price Level',   icon: Tag,     color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-border)' },
  { label: 'Save Delivery', icon: Save,    color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)' },
  { label: 'Settlement',    icon: Receipt, color: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'var(--blue-border)' },
]

function SectionHeader({ label, color }) {
  return (
    <div style={{
      fontSize: 8.5, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase',
      color, paddingLeft: 2, marginBottom: 4, marginTop: 2,
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ flex: 1, height: 1, background: color, opacity: 0.25 }} />
      {label}
      <span style={{ flex: 1, height: 1, background: color, opacity: 0.25 }} />
    </div>
  )
}

function TouchBtn({ b, sectionColor, sectionBg, sectionBorder }) {
  const Icon    = b.icon
  const color   = b.color   || sectionColor
  const bg      = b.bg      || sectionBg
  const border  = b.border  || sectionBorder
  const defBg     = 'var(--surface)'
  const defColor  = 'var(--text-2)'
  const defBorder = 'var(--border)'

  return (
    <button
      onClick={b.onClick}
      style={{
        flex: '0 0 calc(50% - 3px)',
        minHeight: 62,
        borderRadius: 'var(--r-md)',
        border: `1.5px solid ${defBorder}`,
        background: defBg,
        color: defColor,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 6,
        fontWeight: 700, fontSize: 11.5,
        transition: 'all 0.1s',
        lineHeight: 1.2,
        padding: '8px 4px',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={e => {
        e.currentTarget.style.background  = bg
        e.currentTarget.style.color       = color
        e.currentTarget.style.borderColor = border
        e.currentTarget.style.transform   = 'scale(0.95)'
        e.currentTarget.style.boxShadow   = 'none'
      }}
      onPointerUp={e => {
        e.currentTarget.style.transform  = 'scale(1)'
        e.currentTarget.style.background = bg
        e.currentTarget.style.color      = color
        e.currentTarget.style.borderColor = border
        e.currentTarget.style.boxShadow  = 'var(--shadow-sm)'
      }}
      onPointerLeave={e => {
        e.currentTarget.style.background  = defBg
        e.currentTarget.style.color       = defColor
        e.currentTarget.style.borderColor = defBorder
        e.currentTarget.style.transform   = 'scale(1)'
        e.currentTarget.style.boxShadow   = 'none'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background  = bg
        e.currentTarget.style.color       = color
        e.currentTarget.style.borderColor = border
        e.currentTarget.style.boxShadow   = 'var(--shadow-sm)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background  = defBg
        e.currentTarget.style.color       = defColor
        e.currentTarget.style.borderColor = defBorder
        e.currentTarget.style.boxShadow   = 'none'
      }}
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      <span style={{ textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%', padding: '0 3px', fontSize: 11 }}>
        {b.label}
      </span>
    </button>
  )
}

function FlatGrid({ buttons }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, height: '100%', alignContent: 'stretch' }}>
      {buttons.map((b, i) => (
        <TouchBtn key={i} b={b} sectionColor={b.color} sectionBg={b.bg} sectionBorder={b.border} />
      ))}
    </div>
  )
}

export default function FunctionButtons() {
  const [tab, setTab] = useState('fn')
  const navigate      = useNavigate()
  const isSess        = tab === 'sess'

  const TABS = [
    { key: 'fn',   label: 'Fn' },
    { key: 'feat', label: 'Feat' },
    { key: 'del',  label: 'Del' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Tab bar ─────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, flexShrink: 0,
        background: 'var(--surface-2)',
        borderBottom: '2px solid var(--border)',
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '9px 2px',
            border: 'none', borderBottom: tab === t.key ? '2px solid var(--brand)' : '2px solid transparent',
            marginBottom: -2,
            background: 'transparent',
            color: tab === t.key ? 'var(--text-1)' : 'var(--text-4)',
            fontSize: 11, fontWeight: tab === t.key ? 800 : 500,
            cursor: 'pointer', transition: 'all 0.13s',
          }}>
            {t.label}
          </button>
        ))}
        <button onClick={() => setTab('sess')} style={{
          flex: 1, padding: '9px 2px',
          border: 'none', borderBottom: isSess ? '2px solid var(--brand)' : '2px solid transparent',
          marginBottom: -2,
          background: 'transparent',
          color: isSess ? 'var(--brand)' : 'var(--text-4)',
          fontSize: 11, fontWeight: isSess ? 800 : 500,
          cursor: 'pointer', transition: 'all 0.13s',
        }}>
          Sess
        </button>
      </div>

      {/* ── Button area ──────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden auto', padding: '6px 7px 7px' }}>

        {tab === 'fn' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(sec => (
              <div key={sec.label}>
                <SectionHeader label={sec.label} color={sec.color} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {sec.buttons.map((b, i) => (
                    <TouchBtn key={i} b={b} sectionColor={sec.color} sectionBg={sec.bg} sectionBorder={sec.border} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'feat' && <FlatGrid buttons={FEATURES_BUTTONS} />}

        {tab === 'del' && <FlatGrid buttons={DELIVERY_BUTTONS} />}

        {isSess && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, height: '100%' }}>
            <div style={{
              flex: 1,
              background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: '10px 12px',
              border: '1px solid var(--border)', color: 'var(--text-4)',
              fontSize: 11.5, fontStyle: 'italic', lineHeight: 1.5,
            }}>
              Reminders area
            </div>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '16px 0', borderRadius: 'var(--r-md)', border: 'none',
                background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 3px 12px rgba(107,0,0,0.2)',
              }}
            >
              <LogOut size={15} /> Logout
            </button>
            <button
              onClick={() => window.close()}
              style={{
                padding: '16px 0', borderRadius: 'var(--r-md)',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text-2)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              <X size={15} /> Exit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
