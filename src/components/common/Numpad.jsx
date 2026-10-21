import { Delete, XCircle } from 'lucide-react'

/*
 * Reusable Numpad component.
 *
 * Props:
 *   onKey        — (key: string) => void   called with '0'-'9', '.', '⌫', 'C'
 *   showDot      — bool   show the '.' key          (default true)
 *   showClear    — bool   show the 'C' clear key     (default true)
 *   showBackspace— bool   show the '⌫' backspace key (default true)
 *   gap          — number gap between buttons px      (default 6)
 *   btnHeight    — number button height px            (default 46)
 *   fontSize     — number digit font size             (default 16)
 *   extraRows    — array of rows appended below the standard grid
 *                  each row: [{ label, flex, style, onClick }]
 *
 * Example — basic:
 *   <Numpad onKey={k => handleKey(k)} />
 *
 * Example — with custom bottom row:
 *   <Numpad
 *     onKey={handleKey}
 *     showDot={false}
 *     showClear={false}
 *     extraRows={[[
 *       { label: 'Done',   flex: 2, style: { background: 'var(--brand)', color: '#fff', border: 'none' }, onClick: handleDone },
 *       { label: 'Cancel', flex: 1, style: { background: 'var(--red-bg)', color: 'var(--red)', border: '1.5px solid var(--red-border)' }, onClick: onClose },
 *     ]]}
 *   />
 */
export default function Numpad({
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

  const base = {
    flex: 1, height: btnHeight, borderRadius: 8,
    border: '1.5px solid var(--border)', background: '#fff',
    color: 'var(--text-1)',
    fontSize, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.1s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  }

  const hoverDefault = e => {
    e.currentTarget.style.background  = 'var(--brand-bg)'
    e.currentTarget.style.borderColor = 'var(--brand-border)'
    e.currentTarget.style.color       = 'var(--brand)'
  }
  const leaveDefault = e => {
    e.currentTarget.style.background  = '#fff'
    e.currentTarget.style.borderColor = 'var(--border)'
    e.currentTarget.style.color       = 'var(--text-1)'
  }
  const press  = e => { e.currentTarget.style.transform = 'scale(0.92)' }
  const release= e => { e.currentTarget.style.transform = 'scale(1)' }

  const Btn = ({ label, keyVal, flex = 1, style = {}, onClick }) => {
    const hasCustomBg = !!style.background
    return (
      <button
        onClick={onClick ?? (() => onKey?.(keyVal ?? label))}
        style={{ ...base, flex, ...style }}
        onMouseEnter={e => {
          if (hasCustomBg) { e.currentTarget.style.filter = 'brightness(0.92)'; return }
          hoverDefault(e)
        }}
        onMouseLeave={e => {
          e.currentTarget.style.filter = 'brightness(1)'
          if (!hasCustomBg) leaveDefault(e)
        }}
        onMouseDown={press}
        onMouseUp={release}
      >
        {label === '⌫' ? <Delete size={Math.round(fontSize * 0.9)} /> : label === 'C' ? <XCircle size={Math.round(fontSize * 0.9)} /> : label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {/* 7 8 9 / 4 5 6 / 1 2 3 */}
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap }}>
          {row.map(k => <Btn key={k} label={k} />)}
        </div>
      ))}

      {/* 0  .  ⌫ */}
      <div style={{ display: 'flex', gap }}>
        <Btn label="0" flex={showDot || showClear || showBackspace ? 1 : 3} />
        {showDot       && <Btn label="." />}
        {showClear     && (
          <Btn
            label="C"
            style={{ background: 'var(--amber-bg)', borderColor: 'var(--amber-border)', color: 'var(--amber)', fontSize: fontSize * 0.75 }}
          />
        )}
        {showBackspace && (
          <Btn
            label="⌫"
            keyVal="⌫"
            style={{ background: 'var(--red-bg)', borderColor: 'var(--red-border)', color: 'var(--red)' }}
          />
        )}
      </div>

      {/* Extra custom rows */}
      {extraRows.map((row, ri) => (
        <div key={`extra-${ri}`} style={{ display: 'flex', gap }}>
          {row.map((btn, bi) => (
            <Btn
              key={bi}
              label={btn.label}
              keyVal={btn.keyVal}
              flex={btn.flex ?? 1}
              style={btn.style ?? {}}
              onClick={btn.onClick}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
