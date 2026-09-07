import React, { useState } from 'react'

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
/* All POS Actions                                                            */
/* -------------------------------------------------------------------------- */

export const MORE_OPTIONS = [
  {
    label: 'Hold Bill',
    icon: PauseCircle,
    tone: 'brand',
  },
  {
    label: 'Recall',
    icon: Archive,
    tone: 'amber',
  },
  {
    label: 'Reprint',
    icon: Printer,
    tone: 'brand',
  },
  {
    label: 'Clear Line',
    icon: Minus,
    tone: 'danger',
    danger: true,
  },
  {
    label: 'Return',
    icon: RotateCcw,
    tone: 'danger',
    danger: true,
  },
  {
    label: 'Look Up',
    icon: Search,
    tone: 'amber',
  },
  {
    label: 'Price Change',
    icon: Tag,
    tone: 'brand',
  },
  {
    label: 'Qty Change',
    icon: SlidersHorizontal,
    tone: 'brand',
  },
  {
    label: 'Group',
    icon: Grid3x3,
    tone: 'amber',
  },
  {
    label: 'Packet Scan',
    icon: Package,
    tone: 'brand',
  },
  {
    label: 'Discount',
    icon: Percent,
    tone: 'amber',
  },
  {
    label: 'Price Enquiry',
    icon: ScanBarcode,
    tone: 'brand',
  },
  {
    label: 'Currency',
    icon: DollarSign,
    tone: 'brand',
  },
  {
    label: 'Sales Man',
    icon: User,
    tone: 'amber',
  },
  {
    label: 'Privilege',
    icon: Crown,
    tone: 'brand',
  },
  {
    label: 'Report',
    icon: BarChart2,
    tone: 'brand',
  },
  {
    label: 'Cash In/Out',
    icon: Wallet,
    tone: 'amber',
  },
  {
    label: 'Receipt',
    icon: FileText,
    tone: 'brand',
  },
  {
    label: 'Comments',
    icon: MessageSquare,
    tone: 'amber',
  },
  {
    label: 'NP Scale',
    icon: Hash,
    tone: 'brand',
  },
  {
    label: 'Lock',
    icon: Lock,
    tone: 'danger',
    danger: true,
  },
  {
    label: 'Price Level',
    icon: Layers,
    tone: 'amber',
  },
  {
    label: 'Delivery',
    icon: Truck,
    tone: 'brand',
  },
  {
    label: 'Save Delivery',
    icon: Save,
    tone: 'brand',
  },
  {
    label: 'Settlement',
    icon: Receipt,
    tone: 'amber',
  },
]

/* -------------------------------------------------------------------------- */
/* Action Categories                                                          */
/* -------------------------------------------------------------------------- */

const ACTION_CATEGORIES = [
  {
    id: 'transaction',
    label: 'Transaction',
    shortLabel: 'Transaction',
    actions: [
      'Hold Bill',
      'Recall',
      'Reprint',
      'Clear Line',
      'Return',
    ],
  },

  {
    id: 'pricing',
    label: 'Pricing & Adjustments',
    shortLabel: 'Pricing',
    actions: [
      'Discount',
      'Price Change',
      'Qty Change',
      'Price Enquiry',
      'Currency',
      'NP Scale',
    ],
  },

  {
    id: 'products',
    label: 'Product & Search',
    shortLabel: 'Products',
    actions: [
      'Look Up',
      'Group',
      'Packet Scan',
      'Price Level',
    ],
  },

  {
    id: 'sales',
    label: 'Sales & Customer',
    shortLabel: 'Sales',
    actions: [
      'Sales Man',
      'Comments',
    ],
  },

  {
    id: 'delivery',
    label: 'Delivery & Settlement',
    shortLabel: 'Delivery',
    actions: [
      'Delivery',
      'Save Delivery',
      'Receipt',
      'Settlement',
    ],
  },

  {
    id: 'admin',
    label: 'Admin & Management',
    shortLabel: 'Admin',
    actions: [
      'Report',
      'Cash In/Out',
      'Privilege',
      'Lock',
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Helper: Find Action                                                        */
/* -------------------------------------------------------------------------- */

const getActionByLabel = (label) => {
  return MORE_OPTIONS.find((action) => action.label === label)
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function LiteMoreOptionsModal({
  onClose,
  onSelect,
}) {
  const [activeCategory, setActiveCategory] =
    useState('transaction')

  const selectedCategory =
    ACTION_CATEGORIES.find(
      (category) => category.id === activeCategory,
    ) || ACTION_CATEGORIES[0]

  /* ------------------------------------------------------------------------ */
  /* Select Action                                                            */
  /* ------------------------------------------------------------------------ */

  const handleActionSelect = (label) => {
    if (typeof onSelect === 'function') {
      onSelect(label)
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

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
      {/* ------------------------------------------------------------------ */}
      {/* Modal                                                              */}
      {/* ------------------------------------------------------------------ */}

      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(680px, 94vw)',
          maxHeight: 'min(620px, 88vh)',
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
        {/* -------------------------------------------------------------- */}
        {/* Header                                                         */}
        {/* -------------------------------------------------------------- */}

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
            className="lite-btn"
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
            <X size={17} strokeWidth={2} />
          </button>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Category Tabs                                                  */}
        {/* -------------------------------------------------------------- */}

        <div
          role="tablist"
          aria-label="Action categories"
          className="lite-scroll"
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 14px',
            overflowX: 'auto',
            borderBottom: `1px solid ${posTheme.border}`,
            background: posTheme.surface2,
            flexShrink: 0,
            scrollbarWidth: 'none',
          }}
        >
          {ACTION_CATEGORIES.map((category) => {
            const isActive =
              category.id === activeCategory

            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() =>
                  setActiveCategory(category.id)
                }
                className="lite-btn"
                style={{
                  flex: '0 0 auto',
                  minHeight: 40,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: isActive
                    ? `1px solid ${posTheme.brandBorder}`
                    : '1px solid transparent',
                  background: isActive
                    ? posTheme.brandBg
                    : 'transparent',
                  color: isActive
                    ? posTheme.brand
                    : posTheme.text2,
                  fontSize: 11.5,
                  fontWeight: isActive ? 800 : 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.background =
                      posTheme.surface
                    event.currentTarget.style.borderColor =
                      posTheme.border
                    event.currentTarget.style.color =
                      posTheme.text1
                  }
                }}
                onMouseLeave={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.background =
                      'transparent'
                    event.currentTarget.style.borderColor =
                      'transparent'
                    event.currentTarget.style.color =
                      posTheme.text2
                  }
                }}
              >
                {category.shortLabel}
              </button>
            )
          })}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Action Content                                                 */}
        {/* -------------------------------------------------------------- */}

        <div
          className="lite-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: 16,
          }}
        >
          {/* Category Title */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: posTheme.text1,
                }}
              >
                {selectedCategory.label}
              </div>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: posTheme.text3,
                }}
              >
                {selectedCategory.actions.length}{' '}
                {selectedCategory.actions.length === 1
                  ? 'action'
                  : 'actions'}
              </div>
            </div>
          </div>

          {/* Action Grid */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4, minmax(0, 1fr))',
              gap: 10,
            }}
          >
            {selectedCategory.actions.map(
              (label) => {
                const action =
                  getActionByLabel(label)

                if (!action) {
                  return null
                }

                const Icon = action.icon

                return (
                  <button
                    key={action.label}
                    type="button"
                    className="lite-action-button"
                    onClick={() =>
                      handleActionSelect(
                        action.label,
                      )
                    }
                    aria-label={action.label}
                    style={{
                      position: 'relative',
                      minWidth: 0,
                      minHeight: 82,
                      padding: '12px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius:
                        posTheme.rMd,
                      border:
                        `1px solid ${posTheme.border}`,
                      background:
                        posTheme.surface2,
                      color: posTheme.text2,
                      cursor: 'pointer',
                      fontSize: 11.5,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      textAlign: 'center',
                      transition:
                        'background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                      boxShadow:
                        posTheme.shadowXs,
                    }}
                    onMouseEnter={(event) => {
                      const button =
                        event.currentTarget

                      if (
                        action.tone ===
                        'danger'
                      ) {
                        button.style.background =
                          posTheme.redBg
                        button.style.color =
                          posTheme.red
                        button.style.borderColor =
                          posTheme.redBorder
                      } else if (
                        action.tone ===
                        'amber'
                      ) {
                        button.style.background =
                          posTheme.amberBg
                        button.style.color =
                          posTheme.amber
                        button.style.borderColor =
                          posTheme.amberBorder
                      } else {
                        button.style.background =
                          posTheme.brandBg
                        button.style.color =
                          posTheme.brand
                        button.style.borderColor =
                          posTheme.brandBorder
                      }

                      button.style.transform =
                        'translateY(-2px)'

                      button.style.boxShadow =
                        '0 6px 16px rgba(15, 23, 42, 0.08)'
                    }}
                    onMouseLeave={(event) => {
                      const button =
                        event.currentTarget

                      button.style.background =
                        posTheme.surface2
                      button.style.color =
                        posTheme.text2
                      button.style.borderColor =
                        posTheme.border
                      button.style.transform =
                        'translateY(0)'
                      button.style.boxShadow =
                        posTheme.shadowXs
                    }}
                    onMouseDown={(event) => {
                      event.currentTarget.style.transform =
                        'translateY(0) scale(0.98)'
                    }}
                    onMouseUp={(event) => {
                      event.currentTarget.style.transform =
                        'translateY(-2px)'
                    }}
                    onFocus={(event) => {
                      event.currentTarget.style.outline =
                        `3px solid ${posTheme.brandBg}`
                      event.currentTarget.style.outlineOffset =
                        '2px'
                    }}
                    onBlur={(event) => {
                      event.currentTarget.style.outline =
                        'none'
                    }}
                  >
                    {/* Icon Container */}

                    <span
                      style={{
                        width: 36,
                        height: 36,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        borderRadius: 10,
                        background:
                          action.danger
                            ? posTheme.redBg
                            : posTheme.surface,
                        color:
                          action.danger
                            ? posTheme.red
                            : posTheme.text2,
                        transition:
                          'background 0.15s ease, color 0.15s ease',
                      }}
                    >
                      <Icon
                        size={18}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>

                    {/* Label */}

                    <span
                      style={{
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow:
                          'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {action.label}
                    </span>
                  </button>
                )
              },
            )}
          </div>
        </div>
      </div>
    </div>
  )
}