import { useEffect, useRef, useState } from 'react'
import CounterReadingModal from './CounterReadingModal'
import StaffWiseReportModal from './StaffWiseReportModal'
import {
  X, BarChart2,
  ClipboardList, Users, Star, Grid3x3,
  UserCog, Eraser, Trash2,
  Download, Upload, GitBranch,
  KeyRound, Mail, ShieldCheck,
  Power,
} from 'lucide-react'

/* ─── Report / action items ─────────────────────────────────── */
const SECTIONS = [
  {
    label: 'Reports',
    color: 'var(--blue)',
    bg: 'var(--blue-bg)',
    border: 'var(--blue-border)',
    items: [
      { key: 0, label: 'Counter Reading',  sub: 'Close details summary', icon: ClipboardList },
      { key: 1, label: 'Staff Wise',       sub: 'Per-staff sales report', icon: Users },
      { key: 2, label: 'Special Report',   sub: 'Custom report print',    icon: Star },
      { key: 8, label: 'Group Wise',       sub: 'Sales by product group', icon: Grid3x3 },
    ],
  },
  {
    label: 'Operations',
    color: 'var(--amber)',
    bg: 'var(--amber-bg)',
    border: 'var(--amber-border)',
    items: [
      { key: 4, label: 'Cashier Change',      sub: 'Switch active cashier',    icon: UserCog },
      { key: 5, label: 'Clear Hold Bill',     sub: 'Remove selected hold',     icon: Eraser },
      { key: 10, label: 'Clear All Holds',    sub: 'Wipe all hold bills',      icon: Trash2, danger: true },
    ],
  },
  {
    label: 'Data Sync',
    color: 'var(--green)',
    bg: 'var(--green-bg)',
    border: 'var(--green-border)',
    items: [
      { key: 6, label: 'Download Data',   sub: 'Fetch from server',       icon: Download },
      { key: 7, label: 'Upload to Server',sub: 'Push counter data',       icon: Upload },
      { key: 13, label: 'Sync to Branch', sub: 'Sync cross-branch data',  icon: GitBranch },
    ],
  },
  {
    label: 'Settings',
    color: 'var(--purple)',
    bg: 'var(--purple-bg)',
    border: 'var(--purple-border)',
    items: [
      { key: 3,  label: 'Password Change',   sub: 'Update login password',  icon: KeyRound },
      { key: 11, label: 'Mail Settings',     sub: 'Configure email sender', icon: Mail },
      { key: 12, label: 'Privilege Settings',sub: 'Admin access required',  icon: ShieldCheck },
    ],
  },
  {
    label: 'System',
    color: 'var(--red)',
    bg: 'var(--red-bg)',
    border: 'var(--red-border)',
    items: [
      { key: 9, label: 'System Shutdown', sub: 'Power off this terminal', icon: Power, danger: true },
    ],
  },
]

/* ─── Shortcut key map (0–9 + A–D) ─────────────────────────── */
const SHORTCUT_MAP = {
  0: '0', 1: '1', 2: '2', 3: '3', 4: '4',
  5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: 'A', 11: 'B', 12: 'C', 13: 'D',
}

export default function ReportsModal({ onClose, onSelect }) {
  const [counterReadingOpen, setCounterReadingOpen] = useState(false)
  const [staffWiseOpen,     setStaffWiseOpen]     = useState(false)
  const overlayRef = useRef()

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') { onClose(); return }
      const code = e.key.toUpperCase()
      const entry = Object.entries(SHORTCUT_MAP).find(([, v]) => v === code)
      if (entry) {
        const itemKey = Number(entry[0])
        handleSelect(itemKey)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSelect(itemKey) {
    if (itemKey === 0) { setCounterReadingOpen(true); return }
    if (itemKey === 1) { setStaffWiseOpen(true); return }
    onSelect?.(itemKey)
    onClose()
  }

  return (
    <>
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.45)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'rm-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes rm-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes rm-slide { from { opacity:0; transform:scale(0.96) translateY(12px) } to { opacity:1; transform:scale(1) translateY(0) } }
        .rm-card:hover .rm-shortcut { opacity:1 }
      `}</style>

      <div style={{
        width: 680, maxWidth: '96vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        animation: 'rm-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
        overflow: 'hidden',
      }}>

        {/* ── Header ────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart2 size={17} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', margin: 0 }}>
                Counter POS
              </p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1, margin: 0 }}>
                Reports &amp; Operations
              </p>
            </div>
          </div>

          {/* Shortcut hint */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.10)', borderRadius: 8,
              padding: '5px 10px', border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: 0.5 }}>
                Press key to select
              </span>
              <kbd style={{
                background: 'rgba(255,255,255,0.18)', borderRadius: 4,
                padding: '1px 5px', fontSize: 10, fontWeight: 700,
                color: '#fff', fontFamily: "'JetBrains Mono', monospace",
                border: '1px solid rgba(255,255,255,0.25)',
              }}>ESC</kbd>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>close</span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '18px 18px 14px',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          {SECTIONS.map(section => (
            <div key={section.label}>
              {/* Section label */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
              }}>
                <div style={{
                  width: 3, height: 14, borderRadius: 2,
                  background: section.color,
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.9,
                  textTransform: 'uppercase', color: section.color,
                }}>
                  {section.label}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {/* Cards grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
                gap: 8,
              }}>
                {section.items.map(item => {
                  const Icon = item.icon
                  const shortcut = SHORTCUT_MAP[item.key]
                  return (
                    <button
                      key={item.key}
                      className="rm-card"
                      onClick={() => handleSelect(item.key)}
                      style={{
                        position: 'relative',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'flex-start', gap: 8,
                        padding: '12px 13px',
                        borderRadius: 12,
                        border: `1.5px solid ${item.danger ? 'var(--red-border)' : 'var(--border)'}`,
                        background: item.danger ? 'var(--red-bg)' : 'var(--surface)',
                        color: item.danger ? 'var(--red)' : 'var(--text-2)',
                        cursor: 'pointer',
                        transition: 'all 0.13s ease',
                        textAlign: 'left',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget
                        el.style.background   = item.danger ? 'var(--red)' : section.bg
                        el.style.borderColor  = item.danger ? 'var(--red)' : section.border
                        el.style.color        = item.danger ? '#fff' : section.color
                        el.style.transform    = 'translateY(-2px)'
                        el.style.boxShadow    = '0 6px 18px rgba(0,0,0,0.10)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget
                        el.style.background   = item.danger ? 'var(--red-bg)' : 'var(--surface)'
                        el.style.borderColor  = item.danger ? 'var(--red-border)' : 'var(--border)'
                        el.style.color        = item.danger ? 'var(--red)' : 'var(--text-2)'
                        el.style.transform    = 'translateY(0)'
                        el.style.boxShadow    = 'var(--shadow-xs)'
                      }}
                      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
                      onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                    >
                      {/* Shortcut badge */}
                      <div
                        className="rm-shortcut"
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          minWidth: 20, height: 20,
                          background: item.danger ? 'rgba(255,255,255,0.25)' : section.bg,
                          border: `1px solid ${item.danger ? 'rgba(255,255,255,0.3)' : section.border}`,
                          borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, letterSpacing: 0.3,
                          color: item.danger ? '#fff' : section.color,
                          fontFamily: "'JetBrains Mono', monospace",
                          opacity: 0.7, transition: 'opacity 0.12s',
                          padding: '0 4px',
                        }}
                      >
                        {shortcut}
                      </div>

                      {/* Icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: item.danger ? 'rgba(255,255,255,0.15)' : section.bg,
                        border: `1px solid ${item.danger ? 'rgba(255,255,255,0.2)' : section.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'inherit',
                      }}>
                        <Icon size={15} />
                      </div>

                      {/* Text */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 800, lineHeight: 1.2,
                          color: 'inherit', whiteSpace: 'nowrap',
                        }}>
                          {item.label}
                        </span>
                        <span style={{
                          fontSize: 9.5, fontWeight: 500, lineHeight: 1.3,
                          color: item.danger ? 'rgba(255,255,255,0.7)' : 'var(--text-4)',
                          transition: 'color 0.13s',
                        }}>
                          {item.sub}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 600 }}>
            14 operations available
          </span>
          <button
            onClick={onClose}
            style={{
              height: 34, padding: '0 18px', borderRadius: 9,
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
          >
            <X size={13} /> Close
          </button>
        </div>

      </div>
    </div>

    {counterReadingOpen && (
      <CounterReadingModal onClose={() => setCounterReadingOpen(false)} />
    )}
    {staffWiseOpen && (
      <StaffWiseReportModal onClose={() => setStaffWiseOpen(false)} />
    )}
    </>
  )
}
