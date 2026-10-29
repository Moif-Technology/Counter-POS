import { Delete } from 'lucide-react'
import { useUiVariant } from './uiVariant'
import { NEU_RAISED, neuPress, neuRelease } from './neumorphic'

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
 *   variant      — 'classic' | 'neumorphic'  (default: from UiVariantProvider);
 *                  only affects the extra rows — number keys always use the
 *                  home keypad look (.ui-key, styles/keys.css)
 *
 * Pair with applyAmountKey (lib/posNumpadKeys) to update a string value:
 *   <Numpad onKey={k => setQty(v => applyAmountKey(v, k))} />
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
  variant,
}) {
  const neu = useUiVariant(variant) === 'neumorphic'
  const Btn = neu ? NeuBtn : ClassicBtn
  const rows = [['7','8','9'], ['4','5','6'], ['1','2','3']]
  const common = { btnHeight, fontSize, onKey }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {/* 7 8 9 / 4 5 6 / 1 2 3 */}
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap }}>
          {row.map(k => <Btn key={k} label={k} {...common} />)}
        </div>
      ))}

      {/* 0  .  C  ⌫ */}
      <div style={{ display: 'flex', gap }}>
        <Btn label="0" flex={showDot || showClear || showBackspace ? 1 : 3} {...common} />
        {showDot       && <Btn label="." {...common} />}
        {showClear     && <Btn label="C" accent="amber" {...common} />}
        {showBackspace && <Btn label="⌫" keyVal="⌫" accent="red" {...common} />}
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
              extra
              {...common}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function KeyLabel({ label, fontSize }) {
  if (label === '⌫') return <Delete size={Math.round(fontSize * 0.9)} />
  return label
}

/** Number keys share the home keypad look; C and ⌫ get a red label. */
const keyClass = (label, extra) => extra ? undefined
  : label === 'C' ? 'ui-key is-clear'
  : label === '⌫' ? 'ui-key is-back'
  : 'ui-key'

// ── Classic: white keys with border, brand tint on hover ────────────────────
const CLASSIC_ACCENT = {
  amber: { background: 'var(--amber-bg)', borderColor: 'var(--amber-border)', color: 'var(--amber)' },
  red:   { background: 'var(--red-bg)',   borderColor: 'var(--red-border)',   color: 'var(--red)' },
}

function ClassicBtn({ label, keyVal, flex = 1, accent, style = {}, extra, btnHeight, fontSize, onKey, onClick }) {
  const accentStyle = accent ? CLASSIC_ACCENT[accent] : {}
  const merged = {
    ...accentStyle,
    ...style,
  }
  const hasCustomBg = !!merged.background

  return (
    <button
      className={keyClass(label, extra)}
      onClick={onClick ?? (() => onKey?.(keyVal ?? label))}
      style={{
        flex, height: btnHeight, borderRadius: 8,
        border: '1.5px solid var(--border)', background: '#fff',
        color: 'var(--text-1)',
        fontSize, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit',
        ...merged,
      }}
      onMouseEnter={e => {
        if (hasCustomBg) { e.currentTarget.style.filter = 'brightness(0.92)'; return }
        e.currentTarget.style.background  = 'var(--brand-bg)'
        e.currentTarget.style.borderColor = 'var(--brand-border)'
        e.currentTarget.style.color       = 'var(--brand)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = 'brightness(1)'
        if (hasCustomBg) return
        e.currentTarget.style.background  = '#fff'
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color       = 'var(--text-1)'
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <KeyLabel label={label} fontSize={fontSize} />
    </button>
  )
}

// ── Neumorphic: soft dual shadows, keys flush with the panel ────────────────
function NeuBtn({ label, keyVal, flex = 1, accent, style = {}, extra, btnHeight, fontSize, onKey, onClick }) {
  // Extra-row buttons (Done/Cancel…) default to the brand accent.
  const tone = extra ? 'brand' : accent
  const press = e => neuPress(e, 0.96)

  return (
    <button
      className={keyClass(label, extra)}
      onClick={onClick ?? (() => onKey?.(keyVal ?? label))}
      onMouseDown={press}
      onMouseUp={neuRelease}
      onMouseLeave={neuRelease}
      onTouchStart={extra ? undefined : press}
      onTouchEnd={extra ? undefined : neuRelease}
      style={{
        flex, height: btnHeight, borderRadius: 10,
        border: `1px solid ${tone ? `var(--${tone}-border)` : 'var(--border)'}`,
        background: 'var(--surface-2)',
        color: tone ? `var(--${tone})` : 'var(--text-2)',
        fontSize, fontWeight: 700,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.1s, transform 0.07s',
        userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        boxShadow: NEU_RAISED,
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {extra ? label : <KeyLabel label={label} fontSize={fontSize} />}
    </button>
  )
}
