const NEU_RED_RAISED    = '4px 4px 10px rgba(220,38,38,0.18), -4px -4px 10px rgba(255,255,255,0.7)'
const NEU_RED_PRESSED   = 'inset 2px 2px 5px rgba(220,38,38,0.22), inset -2px -2px 5px rgba(255,255,255,0.5)'
const NEU_NEUTRAL_RAISED  = '4px 4px 10px rgba(0,0,0,0.10), -4px -4px 10px rgba(255,255,255,0.75)'
const NEU_NEUTRAL_PRESSED = 'inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.6)'
const NEU_BRAND_RAISED  = '0 6px 14px rgba(107,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.15)'
const NEU_BRAND_PRESSED = '0 2px 6px rgba(107,0,0,0.22), inset 0 2px 6px rgba(0,0,0,0.30)'

export default function LiteActionBar({ hasItems, saving, onClearAll, onSave, onBillAndPrint }) {
  const press = (pressed) => e => { if (!e.currentTarget.disabled) e.currentTarget.style.boxShadow = pressed }
  const release = (raised) => e => { e.currentTarget.style.boxShadow = raised }

  return (
    <>
      <button
        className="lite-btn"
        onClick={onClearAll}
        disabled={!hasItems || saving}
        onMouseDown={press(NEU_RED_PRESSED)}
        onMouseUp={release(NEU_RED_RAISED)}
        onMouseLeave={release(NEU_RED_RAISED)}
        style={{
          width: '100%', padding: '13px 0', marginBottom: 8, borderRadius: 14,
          border: '1px solid var(--red-border)', background: 'var(--red-bg)',
          color: 'var(--red)', fontSize: 13, fontWeight: 700, minHeight: 46,
          cursor: hasItems ? 'pointer' : 'not-allowed',
          opacity: hasItems ? 1 : 0.5,
          boxShadow: NEU_RED_RAISED,
          transition: 'box-shadow 0.1s',
        }}
      >
        Clear All
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="lite-btn"
          onClick={onSave}
          disabled={!hasItems || saving}
          onMouseDown={press(NEU_NEUTRAL_PRESSED)}
          onMouseUp={release(NEU_NEUTRAL_RAISED)}
          onMouseLeave={release(NEU_NEUTRAL_RAISED)}
          style={{
            flex: 1, padding: '14px 0', borderRadius: 14, minHeight: 50,
            border: '1px solid var(--border)',
            background: hasItems ? 'var(--surface-2)' : 'var(--surface-3)',
            color: hasItems ? 'var(--text-1)' : 'var(--text-3)',
            fontSize: 13.5, fontWeight: 800, letterSpacing: 0.3,
            cursor: hasItems && !saving ? 'pointer' : 'not-allowed',
            boxShadow: hasItems ? NEU_NEUTRAL_RAISED : 'none',
            transition: 'box-shadow 0.1s',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          className="lite-btn"
          onClick={onBillAndPrint}
          disabled={!hasItems || saving}
          onMouseDown={press(NEU_BRAND_PRESSED)}
          onMouseUp={release(NEU_BRAND_RAISED)}
          onMouseLeave={release(NEU_BRAND_RAISED)}
          style={{
            flex: 1.4, padding: '14px 0', borderRadius: 14, minHeight: 50,
            border: 'none',
            background: hasItems
              ? 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)'
              : 'var(--surface-3)',
            color: hasItems ? '#fff' : 'var(--text-3)',
            fontSize: 13, fontWeight: 800, letterSpacing: 0.3,
            cursor: hasItems && !saving ? 'pointer' : 'not-allowed',
            boxShadow: hasItems ? NEU_BRAND_RAISED : 'none',
            transition: 'box-shadow 0.1s',
          }}
        >
          Bill & Print
        </button>
      </div>
    </>
  )
}
