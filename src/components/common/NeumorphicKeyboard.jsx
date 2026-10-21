import { Delete, CornerDownLeft, ChevronUp } from 'lucide-react'

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]

const NEU_RAISED = '4px 4px 8px rgba(0,0,0,0.10), -4px -4px 8px rgba(255,255,255,0.75)'
const NEU_PRESSED = 'inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.6)'

function press(e)   { e.currentTarget.style.boxShadow = NEU_PRESSED; e.currentTarget.style.transform = 'scale(0.97)' }
function release(e) { e.currentTarget.style.boxShadow = NEU_RAISED; e.currentTarget.style.transform = 'scale(1)' }

function Key({ label, keyVal, flex = 1, accent = false, caps, onKey }) {
  return (
    <button
      onClick={() => onKey(keyVal ?? label)}
      onMouseDown={e => { e.preventDefault(); press(e) }}
      onMouseUp={release}
      onMouseLeave={release}
      onTouchStart={e => { e.preventDefault(); press(e) }}
      onTouchEnd={release}
      style={{
        flex, height: 46, borderRadius: 12,
        border: `1px solid ${accent ? 'var(--brand-border)' : 'var(--border)'}`,
        background: 'var(--surface-2)',
        color: accent ? 'var(--brand)' : 'var(--text-2)',
        fontSize: 15, fontWeight: 700,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.1s, transform 0.07s',
        userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        boxShadow: NEU_RAISED,
        fontFamily: 'inherit', minWidth: 0,
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

/*
 * NeumorphicKeyboard — same QWERTY layout/props as TouchKeyboard, restyled as
 * soft-UI/Neumorphism (keys sit flush with the panel background, distinguished
 * by soft dual shadows instead of borders). Shared by Lite POS screens and any
 * shared modal that wants the same look (e.g. Product Search).
 *
 * Props: onKey, onClose, caps (default true) — identical to TouchKeyboard.
 */
export default function NeumorphicKeyboard({ onKey, onClose, caps = true }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      borderTop: '1px solid var(--border)',
      padding: '10px 10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      animation: 'nk-slide 0.18s ease',
    }}>
      <style>{`@keyframes nk-slide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ display: 'flex', gap: 5 }}>
        {ROWS[0].map(k => <Key key={k} label={k} caps={caps} onKey={onKey} />)}
      </div>

      <div style={{ display: 'flex', gap: 5, paddingInline: '3%' }}>
        {ROWS[1].map(k => <Key key={k} label={k} caps={caps} onKey={onKey} />)}
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        <Key label="⌫" keyVal="⌫" flex={1.4} accent caps={caps} onKey={onKey} />
        {ROWS[2].map(k => <Key key={k} label={k} caps={caps} onKey={onKey} />)}
        <Key label="↵" keyVal="ENTER" flex={1.4} accent caps={caps} onKey={onKey} />
      </div>

      <div style={{ display: 'flex', gap: 5 }}>
        <Key label="123" keyVal="123" flex={1.2} accent caps={caps} onKey={onKey} />
        <Key label="SPACE" keyVal=" " flex={5} caps={caps} onKey={onKey} />
        <button
          onClick={onClose}
          onMouseDown={e => { e.preventDefault(); e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          style={{
            flex: 1.8, height: 46, borderRadius: 12, border: '1px solid var(--brand-border)',
            background: 'var(--surface-2)', color: 'var(--brand)',
            fontSize: 12, fontWeight: 800,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            boxShadow: NEU_RAISED,
            transition: 'box-shadow 0.1s, transform 0.07s',
            userSelect: 'none', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ChevronUp size={14} /> Done
        </button>
      </div>
    </div>
  )
}
