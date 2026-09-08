import React from 'react'

import {
  X,
  PauseCircle,
  Archive,
  Printer,
  Minus,
  RotateCcw,
  Percent,
  Search,
  Tag,
  SlidersHorizontal,
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
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/* Professional POS Slate & Steel Theme Tokens                                */
/* -------------------------------------------------------------------------- */

const posTheme = {
  surface: '#ffffff',
  surface2: '#f8fafc',
  border: '#e2e8f0',
  text1: '#0f172a',
  text2: '#334155',
  text3: '#64748b',
  brand: '#6b0000',
  brandBg: '#fff2f2',
  brandBorder: '#f5b8b8',
  amber: '#d97706',
  amberBg: '#fef3c7',
  amberBorder: '#fde68a',
  red: '#dc2626',
  redBg: '#fee2e2',
  redBorder: '#fecaca',
  shadowLg: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
  shadowXs: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  rLg: '12px',
  rMd: '8px',
}

/* -------------------------------------------------------------------------- */
/* Action Groups (Structured Layout for Single Screen)                        */
/* -------------------------------------------------------------------------- */

const ACTION_GROUPS = [
  {
    title: 'Transaction',
    actions: [
      { label: 'Hold Bill', icon: PauseCircle, tone: 'brand' },
      { label: 'Recall', icon: Archive, tone: 'brand' },
      { label: 'Reprint', icon: Printer, tone: 'brand' },
      { label: 'Clear Line', icon: Minus, tone: 'danger', danger: true },
      { label: 'Return', icon: RotateCcw, tone: 'danger', danger: true },
    ],
  },
  {
    title: 'Pricing',
    actions: [
      { label: 'Discount', icon: Percent, tone: 'amber' },
      { label: 'Price Change', icon: Tag, tone: 'amber' },
      { label: 'Qty Change', icon: SlidersHorizontal, tone: 'amber' },
      { label: 'Price Enquiry', icon: ScanBarcode, tone: 'amber' },
      { label: 'Currency', icon: DollarSign, tone: 'amber' },
      { label: 'NP Scale', icon: Hash, tone: 'amber' },
    ],
  },
  {
    title: 'Products & Sales',
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
    title: 'Delivery & Admin',
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

export default function LiteMoreOptionsModal({
  onClose,
  onSelect,
}) {
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
        padding: 16,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(780px, 94vw)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: posTheme.surface,
          border: `1px solid ${posTheme.border}`,
          borderRadius: posTheme.rLg,
          boxShadow: posTheme.shadowLg,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${posTheme.border}`,
            flexShrink: 0,
          }}
        >
          <div
            id="lite-actions-title"
            style={{
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.2,
              color: posTheme.text1,
            }}
          >
            Actions
          </div>

          <button
            type="button"
            aria-label="Close actions"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              minWidth: 32,
              minHeight: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid transparent',
              borderRadius: posTheme.rMd,
              background: 'transparent',
              color: posTheme.text3,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = posTheme.surface2
              event.currentTarget.style.color = posTheme.text1
              event.currentTarget.style.borderColor = posTheme.border
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent'
              event.currentTarget.style.color = posTheme.text3
              event.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Single Screen Sections Layout (Optimized Touch Targets) */}
        <div
          style={{
            padding: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 14,
            background: posTheme.surface2,
          }}
        >
          {ACTION_GROUPS.map((group) => (
            <div
              key={group.title}
              style={{
                background: posTheme.surface,
                border: `1px solid ${posTheme.border}`,
                borderRadius: posTheme.rMd,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                boxShadow: posTheme.shadowXs,
              }}
            >
              {/* Section Subheader */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: posTheme.brand,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  borderBottom: `1px solid ${posTheme.border}`,
                  paddingBottom: 6,
                }}
              >
                {group.title}
              </div>

              {/* Action Buttons Grid for Section */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                {group.actions.map((action) => {
                  const Icon = action.icon

                  let activeBg = posTheme.brandBg
                  let activeColor = posTheme.brand
                  let activeBorder = posTheme.brandBorder

                  if (action.tone === 'amber') {
                    activeBg = posTheme.amberBg
                    activeColor = posTheme.amber
                    activeBorder = posTheme.amberBorder
                  } else if (action.tone === 'danger') {
                    activeBg = posTheme.redBg
                    activeColor = posTheme.red
                    activeBorder = posTheme.redBorder
                  }

                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleActionSelect(action.label)}
                      aria-label={action.label}
                      style={{
                        minHeight: 44, // Increased height for comfortable touch targeting
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 6,
                        border: `1px solid ${posTheme.border}`,
                        background: posTheme.surface2,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(event) => {
                        const btn = event.currentTarget
                        btn.style.background = activeBg
                        btn.style.borderColor = activeBorder
                        btn.style.color = activeColor
                        const labelSpan = btn.querySelector('.action-label')
                        if (labelSpan) labelSpan.style.color = activeColor
                      }}
                      onMouseLeave={(event) => {
                        const btn = event.currentTarget
                        btn.style.background = posTheme.surface2
                        btn.style.borderColor = posTheme.border
                        btn.style.color = posTheme.text2
                        const labelSpan = btn.querySelector('.action-label')
                        if (labelSpan) labelSpan.style.color = posTheme.text2
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: action.danger ? posTheme.red : posTheme.text3,
                        }}
                      >
                        <Icon size={16} strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span
                        className="action-label"
                        style={{
                          fontSize: 11, // Slightly larger font for improved legibility
                          fontWeight: 700,
                          color: posTheme.text2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.2,
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