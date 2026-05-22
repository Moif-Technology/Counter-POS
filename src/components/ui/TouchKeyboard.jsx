import { Delete, CornerDownLeft, ChevronUp } from 'lucide-react'

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]

/*
 * TouchKeyboard — full QWERTY on-screen keyboard for touch screens.
 *
 * Props:
 *   onKey   — (char: string) => void   called with letter, 'SPACE', '⌫', or 'ENTER'
 *   onClose — () => void               called when Done button pressed
 *   caps    — bool (default true)      show uppercase labels
 */
export default function TouchKeyboard({ onKey, onClose, caps = true }) {
  const press  = e => { e.currentTarget.style.transform = 'scale(0.91)' }
  const release= e => { e.currentTarget.style.transform = 'scale(1)' }

  const Key = ({ label, keyVal, flex = 1, variant = 'default' }) => {
    const variants = {
      default: {
        bg: '#fff', color: 'var(--text-1)',
        border: '1.5px solid var(--border)',
        hoverBg: 'var(--brand-bg)', hoverColor: 'var(--brand)', hoverBorder: 'var(--brand-border)',
      },
      action: {
        bg: 'var(--surface-2)', color: 'var(--text-2)',
        border: '1.5px solid var(--border)',
        hoverBg: 'var(--surface)', hoverColor: 'var(--text-1)', hoverBorder: 'var(--border)',
      },
      enter: {
        bg: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
        color: '#fff', border: 'none',
        hoverBg: null, hoverColor: null, hoverBorder: null,
      },
    }
    const v = variants[variant]

    return (
      <button
        onClick={() => onKey(keyVal ?? label)}
        onMouseDown={press}
        onMouseUp={release}
        onTouchStart={press}
        onTouchEnd={release}
        onMouseEnter={e => {
          if (variant === 'enter') { e.currentTarget.style.filter = 'brightness(1.1)'; return }
          e.currentTarget.style.background   = v.hoverBg
          e.currentTarget.style.color        = v.hoverColor
          e.currentTarget.style.borderColor  = v.hoverBorder
        }}
        onMouseLeave={e => {
          e.currentTarget.style.filter = 'brightness(1)'
          if (variant === 'enter') return
          e.currentTarget.style.background  = v.bg
          e.currentTarget.style.color       = v.color
          e.currentTarget.style.borderColor = variant === 'action' ? 'var(--border)' : 'var(--border)'
        }}
        style={{
          flex,
          height: 46,
          borderRadius: 9,
          border: v.border,
          background: v.bg,
          color: v.color,
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.08s, color 0.08s, transform 0.07s',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
          fontFamily: 'inherit',
          minWidth: 0,
        }}
      >
        {label === '⌫'
          ? <Delete size={16} />
          : label === '↵'
          ? <CornerDownLeft size={16} />
          : caps ? label.toUpperCase() : label.toLowerCase()
        }
      </button>
    )
  }

  return (
    <div style={{
      background: 'var(--surface-2)',
      borderTop: '1px solid var(--border)',
      padding: '10px 10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      animation: 'kb-slide 0.18s ease',
    }}>
      <style>{`@keyframes kb-slide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Row 1 — Q…P */}
      <div style={{ display: 'flex', gap: 5 }}>
        {ROWS[0].map(k => <Key key={k} label={k} />)}
      </div>

      {/* Row 2 — A…L (centered) */}
      <div style={{ display: 'flex', gap: 5, paddingInline: '3%' }}>
        {ROWS[1].map(k => <Key key={k} label={k} />)}
      </div>

      {/* Row 3 — Z…M + backspace */}
      <div style={{ display: 'flex', gap: 5 }}>
        <Key label="⌫" keyVal="⌫" flex={1.4} variant="action" />
        {ROWS[2].map(k => <Key key={k} label={k} />)}
        <Key label="↵" keyVal="ENTER" flex={1.4} variant="action" />
      </div>

      {/* Row 4 — Space + Done */}
      <div style={{ display: 'flex', gap: 5 }}>
        <Key label="123" keyVal="123" flex={1.2} variant="action" />
        <Key label="SPACE" keyVal=" " flex={5} variant="action" />
        <button
          onClick={onClose}
          onMouseDown={press}
          onMouseUp={release}
          style={{
            flex: 1.8, height: 46, borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
            color: '#fff', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            boxShadow: '0 3px 10px rgba(107,0,0,0.2)',
            transition: 'filter 0.1s, transform 0.07s',
            userSelect: 'none', WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
        >
          <ChevronUp size={14} /> Done
        </button>
      </div>
    </div>
  )
}
