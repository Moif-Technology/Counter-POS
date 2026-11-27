import { useState } from 'react'
import { Delete, CornerDownLeft, ChevronUp } from 'lucide-react'
import { useUiVariant } from './uiVariant'
import { NEU_RAISED, neuPress, neuRelease } from './neumorphic'

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
]
// "123" switches to these (same three rows, so the keyboard keeps its height).
const NUM_ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['-','/','.',',','@','#','&','(',')'],
  ['+','*','=','%',':','_',"'"],
]

/*
 * Keyboard — full QWERTY on-screen keyboard for touch screens.
 *
 * Props:
 *   onKey   — (char: string) => void   called with letter, digit/symbol, ' ', '⌫' or 'ENTER'
 *             ("123" / "ABC" switch layouts inside the keyboard; onKey still gets '123', callers ignore it)
 *   onClose — () => void               called when Done button pressed
 *   caps    — bool (default true)      show uppercase labels
 *   variant — 'classic' | 'neumorphic' (default: from UiVariantProvider)
 */
export default function Keyboard({ onKey, onClose, caps = true, variant }) {
  const neu = useUiVariant(variant) === 'neumorphic'
  const Key = neu ? NeuKey : ClassicKey
  const [nums, setNums] = useState(false)
  const rows = nums ? NUM_ROWS : ROWS
  const k = { caps, onKey: key => { if (key === '123') setNums(v => !v); onKey(key) } }

  return (
    <div style={{
      background: 'var(--surface-2)',
      borderTop: '1px solid var(--border)',
      padding: '10px 10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      animation: 'kb-slide 0.18s ease',
    }}>
      {/* Row 1 — Q…P */}
      <div style={{ display: 'flex', gap: 5 }}>
        {rows[0].map(c => <Key key={c} label={c} {...k} />)}
      </div>

      {/* Row 2 — A…L (centered) */}
      <div style={{ display: 'flex', gap: 5, paddingInline: '3%' }}>
        {rows[1].map(c => <Key key={c} label={c} {...k} />)}
      </div>

      {/* Row 3 — Z…M + backspace */}
      <div style={{ display: 'flex', gap: 5 }}>
        <Key label="⌫" keyVal="⌫" flex={1.4} action {...k} />
        {rows[2].map(c => <Key key={c} label={c} {...k} />)}
        <Key label="↵" keyVal="ENTER" flex={1.4} action {...k} />
      </div>

      {/* Row 4 — Space + Done */}
      <div style={{ display: 'flex', gap: 5 }}>
        <Key label={nums ? 'ABC' : '123'} keyVal="123" flex={1.2} action {...k} />
        <Key label="SPACE" keyVal=" " flex={5} action={!neu} {...k} />
        {neu ? <NeuDone onClose={onClose} /> : <ClassicDone onClose={onClose} />}
      </div>
    </div>
  )
}

function KeyLabel({ label, caps }) {
  if (label === '⌫') return <Delete size={16} />
  if (label === '↵') return <CornerDownLeft size={16} />
  return caps ? label.toUpperCase() : label.toLowerCase()
}

const keyBase = {
  height: 46, fontSize: 15, fontWeight: 700,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  userSelect: 'none', WebkitTapHighlightColor: 'transparent',
  fontFamily: 'inherit', minWidth: 0,
}

// ── Classic ─────────────────────────────────────────────────────────────────
const classicPress   = e => { e.currentTarget.style.transform = 'scale(0.91)' }
const classicRelease = e => { e.currentTarget.style.transform = 'scale(1)' }

function ClassicKey({ label, keyVal, flex = 1, action = false, caps, onKey }) {
  const bg = action ? 'var(--surface-2)' : '#fff'
  const color = action ? 'var(--text-2)' : 'var(--text-1)'
  return (
    <button
      onClick={() => onKey(keyVal ?? label)}
      onMouseDown={e => { e.preventDefault(); classicPress(e) }}
      onMouseUp={classicRelease}
      onTouchStart={e => { e.preventDefault(); classicPress(e) }}
      onTouchEnd={classicRelease}
      onMouseEnter={e => {
        e.currentTarget.style.background  = action ? 'var(--surface)' : 'var(--brand-bg)'
        e.currentTarget.style.color       = action ? 'var(--text-1)' : 'var(--brand)'
        e.currentTarget.style.borderColor = action ? 'var(--border)' : 'var(--brand-border)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background  = bg
        e.currentTarget.style.color       = color
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
      style={{
        ...keyBase, flex,
        borderRadius: 9, border: '1.5px solid var(--border)',
        background: bg, color,
        transition: 'background 0.08s, color 0.08s, transform 0.07s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      }}
    >
      <KeyLabel label={label} caps={caps} />
    </button>
  )
}

function ClassicDone({ onClose }) {
  return (
    <button
      onClick={onClose}
      onMouseDown={e => { e.preventDefault(); classicPress(e) }}
      onMouseUp={classicRelease}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
      style={{
        flex: 1.8, height: 46, borderRadius: 9, border: 'none',
        background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
        color: '#fff', fontSize: 12, fontWeight: 800,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        boxShadow: '0 3px 10px rgba(120,8,41,0.2)',
        transition: 'filter 0.1s, transform 0.07s',
        userSelect: 'none', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <ChevronUp size={14} /> Done
    </button>
  )
}

// ── Neumorphic ──────────────────────────────────────────────────────────────
function NeuKey({ label, keyVal, flex = 1, action = false, caps, onKey }) {
  return (
    <button
      onClick={() => onKey(keyVal ?? label)}
      onMouseDown={e => { e.preventDefault(); neuPress(e) }}
      onMouseUp={neuRelease}
      onMouseLeave={neuRelease}
      onTouchStart={e => { e.preventDefault(); neuPress(e) }}
      onTouchEnd={neuRelease}
      style={{
        ...keyBase, flex,
        borderRadius: 12,
        border: `1px solid ${action ? 'var(--brand-border)' : 'var(--border)'}`,
        background: 'var(--surface-2)',
        color: action ? 'var(--brand)' : 'var(--text-2)',
        transition: 'box-shadow 0.1s, transform 0.07s',
        boxShadow: NEU_RAISED,
      }}
    >
      <KeyLabel label={label} caps={caps} />
    </button>
  )
}

function NeuDone({ onClose }) {
  return (
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
  )
}
