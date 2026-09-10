import React from 'react'
import {
  X,
  Printer,
  Minus,
  Search,
  Grid3x3,
  Package,
  DollarSign,
  User,
  Crown,
  BarChart2,
  Wallet,
  FileText,
  MessageSquare,
  Hash,
  Lock,
  Layers,
  Truck,
  Save,
  ScanBarcode,
  Receipt,
  ShoppingCart,
  Tag,
  Box,
  ShieldCheck,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/* Action Groups configured with custom transparent variant backgrounds       */
/* -------------------------------------------------------------------------- */

const ACTION_GROUPS = [
  {
    title: 'TRANSACTION',
    icon: ShoppingCart,
    headerColor: 'var(--brand)',
    cardBg: 'var(--brand-bg)',
    cardBorder: 'var(--brand-border)',
    actions: [
      { label: 'Clear Line', icon: Minus, tone: 'danger', danger: true },
      { label: 'Reprint', icon: Printer, tone: 'brand' },
    ],
  },
  {
    title: 'PRICING',
    icon: Tag,
    headerColor: 'var(--amber)',
    cardBg: 'var(--amber-bg)',
    cardBorder: 'var(--amber-border)',
    actions: [
      { label: 'Price Enquiry', icon: ScanBarcode, tone: 'amber' },
      { label: 'Currency', icon: DollarSign, tone: 'amber' },
      { label: 'NP Scale', icon: Hash, tone: 'amber' },
    ],
  },
  {
    title: 'PRODUCTS & SALES',
    icon: Box,
    headerColor: 'var(--text-1)',
    cardBg: 'var(--surface-2)',
    cardBorder: 'var(--border)',
    actions: [
      { label: 'Look Up', icon: Search, tone: 'slate' },
      { label: 'Group', icon: Grid3x3, tone: 'slate' },
      { label: 'Packet Scan', icon: Package, tone: 'slate' },
      { label: 'Price Level', icon: Layers, tone: 'slate' },
      { label: 'Sales Man', icon: User, tone: 'slate' },
      { label: 'Comments', icon: MessageSquare, tone: 'slate' },
    ],
  },
  {
    title: 'DELIVERY & ADMIN',
    icon: ShieldCheck,
    headerColor: 'var(--text-1)',
    cardBg: 'var(--surface-2)',
    cardBorder: 'var(--border)',
    actions: [
      { label: 'Delivery', icon: Truck, tone: 'brand' },
      { label: 'Save Delivery', icon: Save, tone: 'brand' },
      { label: 'Receipt', icon: FileText, tone: 'brand' },
      { label: 'Settlement', icon: Receipt, tone: 'brand' },
      { label: 'Report', icon: BarChart2, tone: 'amber' },
      { label: 'Cash In/Out', icon: Wallet, tone: 'amber' },
      { label: 'Privilege', icon: Crown, tone: 'amber' },
      { label: 'Lock', icon: Lock, tone: 'danger', danger: true },
    ],
  },
]

export default function LiteMoreOptionsModal({ onClose, onSelect }) {
  const handleActionSelect = (label) => {
    if (typeof onSelect === 'function') {
      onSelect(label)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lite-actions-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        background: 'rgba(23, 21, 15, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(920px, 95vw)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--surface)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-lg)',
          fontFamily: "'Sora', system-ui, sans-serif",
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          <div
            id="lite-actions-title"
            style={{
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: 1.2,
              color: 'var(--text-1)',
              letterSpacing: '-0.2px',
            }}
          >
            Actions
          </div>

          <button
            type="button"
            aria-label="Close actions"
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-2)',
              cursor: 'pointer',
              borderRadius: 'var(--r-sm)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Grid Container */}
        <div
          style={{
            padding: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '14px',
            background: 'var(--surface)',
            boxSizing: 'border-box',
          }}
        >
          {ACTION_GROUPS.map((group) => (
            <div
              key={group.title}
              style={{
                background: group.cardBg,
                border: `1px solid ${group.cardBorder}`,
                borderRadius: 'var(--r-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxSizing: 'border-box',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              {/* Category Title Header */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: group.headerColor,
                  letterSpacing: '0.5px',
                  paddingBottom: '8px',
                  borderBottom: `1px solid ${group.cardBorder}`,
                }}
              >
                {group.title}
              </div>

              {/* Action Buttons Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '8px',
                }}
              >
                {group.actions.map((action) => {
                  const Icon = action.icon

                  let activeBg = 'var(--brand-bg)'
                  let activeColor = 'var(--brand)'
                  let activeBorder = 'var(--brand-border)'

                  if (action.tone === 'amber') {
                    activeBg = 'var(--amber-bg)'
                    activeColor = 'var(--amber)'
                    activeBorder = 'var(--amber-border)'
                  }

                  if (action.tone === 'danger') {
                    activeBg = 'var(--red-bg)'
                    activeColor = 'var(--red)'
                    activeBorder = 'var(--red-border)'
                  }

                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleActionSelect(action.label)}
                      aria-label={action.label}
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        height: '50px', // Increased button height
                        boxSizing: 'border-box',
                        padding: '0 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: '9px',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-2)',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                        textAlign: 'left',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget
                        btn.style.background = activeBg
                        btn.style.borderColor = activeBorder
                        btn.style.color = activeColor
                        btn.style.boxShadow = 'var(--shadow-sm)'
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget
                        btn.style.background = 'var(--surface)'
                        btn.style.borderColor = 'var(--border)'
                        btn.style.color = 'var(--text-2)'
                        btn.style.boxShadow = 'var(--shadow-xs)'
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: action.danger
                            ? 'var(--red)'
                            : action.tone === 'amber'
                            ? 'var(--amber)'
                            : 'var(--brand)',
                        }}
                      >
                        <Icon size={16} strokeWidth={2.1} aria-hidden="true" />
                      </span>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'inherit',
                          lineHeight: '1.25',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {action.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}