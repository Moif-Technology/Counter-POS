import { Delete, XCircle } from 'lucide-react'

const NEU_RAISED = '4px 4px 8px rgba(0,0,0,0.10), -4px -4px 8px rgba(255,255,255,0.75)'
const NEU_PRESSED = 'inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.6)'

function press(e)   { e.currentTarget.style.boxShadow = NEU_PRESSED; e.currentTarget.style.transform = 'scale(0.96)' }
function release(e) { e.currentTarget.style.boxShadow = NEU_RAISED; e.currentTarget.style.transform = 'scale(1)' }

function Btn({ label, keyVal, flex = 1, accent = null, btnHeight, fontSize, onKey, onClick }) {
  const accentColor = accent ? `var(--${accent})` : 'var(--text-2)'
  const accentBorder = accent ? `var(--${accent}-border)` : 'var(--border)'
  return (
    <button
      onClick={onClick ?? (() => onKey?.(keyVal ?? label))}
      onMouseDown={press}
      onMouseUp={release}
      onMouseLeave={release}
      onTouchStart={press}
      onTouchEnd={release}
      style={{
        flex, height: btnHeight, borderRadius: 10,
        border: `1px solid ${accentBorder}`,
        background: 'var(--surface-2)',
        color: accentColor,
        fontSize, fontWeight: 700,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.1s, transform 0.07s',
        userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        boxShadow: NEU_RAISED,
        fontFamily: 'inherit',
      }}
    >
      {label === '⌫' ? <Delete size={Math.round(fontSize * 0.9)} /> : label === 'C' ? <XCircle size={Math.round(fontSize * 0.9)} /> : label}
    </button>
  )
}

/*
 * NeumorphicNumpad — same API as the plain components/ui/Numpad, restyled as
 * soft-UI/Neumorphism (flush with the panel, dual soft shadows instead of a
 * white card + border), so every modal reachable from More Options shares
 * one consistent numpad look.
 *
 * Props: onKey, showDot, showClear, showBackspace, gap, btnHeight, fontSize, extraRows
 * — identical to Numpad.
 */
export default function NeumorphicNumpad({
  onKey,
  showDot       = true,
  showClear     = true,
  showBackspace = true,
  gap           = 6,
  btnHeight     = 46,
  fontSize      = 16,
  extraRows     = [],
}) {
  const rows = [['7','8','9'], ['4','5','6'], ['1','2','3']]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap }}>
          {row.map(k => <Btn key={k} label={k} btnHeight={btnHeight} fontSize={fontSize} onKey={onKey} />)}
        </div>
      ))}

      <div style={{ display: 'flex', gap }}>
        <Btn label="0" flex={showDot || showClear || showBackspace ? 1 : 3} btnHeight={btnHeight} fontSize={fontSize} onKey={onKey} />
        {showDot       && <Btn label="." btnHeight={btnHeight} fontSize={fontSize} onKey={onKey} />}
        {showClear     && <Btn label="C" accent="amber" btnHeight={btnHeight} fontSize={fontSize} onKey={onKey} />}
        {showBackspace && <Btn label="⌫" keyVal="⌫" accent="red" btnHeight={btnHeight} fontSize={fontSize} onKey={onKey} />}
      </div>

      {extraRows.map((row, ri) => (
        <div key={`extra-${ri}`} style={{ display: 'flex', gap }}>
          {row.map((btn, bi) => (
            <button
              key={bi}
              onClick={btn.onClick ?? (() => onKey?.(btn.keyVal ?? btn.label))}
              onMouseDown={press}
              onMouseUp={release}
              onMouseLeave={release}
              style={{
                flex: btn.flex ?? 1, height: btnHeight, borderRadius: 10,
                border: '1px solid var(--brand-border)',
                background: 'var(--surface-2)', color: 'var(--brand)',
                fontSize, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'box-shadow 0.1s, transform 0.07s',
                userSelect: 'none', WebkitTapHighlightColor: 'transparent',
                boxShadow: NEU_RAISED, fontFamily: 'inherit',
                ...btn.style,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
