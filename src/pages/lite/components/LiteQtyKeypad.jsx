const NUMPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫']

const NEU_RAISED = '4px 4px 8px rgba(0,0,0,0.10), -4px -4px 8px rgba(255,255,255,0.75)'
const NEU_PRESSED = 'inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.6)'

export default function LiteQtyKeypad({ selectedRowKey, qtyBuffer, onPressKey, onApply }) {
  return (
    <div style={{ marginBottom: 'clamp(4px, 0.9vh, 8px)' }}>
      <div style={{
        padding: 'clamp(5px, 1vh, 8px) 12px', borderRadius: 'var(--r-md)',
        border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
        fontSize: 12, color: 'var(--text-3)', marginBottom: 'clamp(4px, 0.9vh, 8px)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{selectedRowKey ? 'Set Qty' : 'Select a row'}</span>
        <span style={{ fontWeight: 800, color: 'var(--brand)', fontFamily: "'JetBrains Mono', monospace" }}>
          {qtyBuffer || '—'}
        </span>
      </div>
      {/* Square keys — grid capped so the squares stay a sensible size and
          the whole pad still fits a short viewport (vh cap). */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'clamp(4px, 0.8vh, 7px)',
        width: '100%', maxWidth: 'clamp(180px, 34vh, 264px)', margin: '0 auto',
      }}>
        {NUMPAD_KEYS.map(k => {
          const isAction = k === '⌫' || k === 'C'
          return (
            <button
              key={k}
              className="lite-btn"
              onClick={() => onPressKey(k)}
              style={{
                aspectRatio: '1 / 1', padding: 0, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${isAction ? 'var(--red-border)' : 'var(--border)'}`,
                background: 'var(--surface-2)',
                color: isAction ? 'var(--red)' : 'var(--text-1)',
                fontSize: isAction ? 'clamp(12px, 2vh, 16px)' : 'clamp(16px, 2.6vh, 22px)', fontWeight: 700,
                fontFamily: k === '⌫' ? 'inherit' : "'JetBrains Mono', monospace",
                cursor: 'pointer',
                boxShadow: NEU_RAISED,
                transition: 'transform 0.07s, box-shadow 0.1s',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.boxShadow = NEU_PRESSED }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = NEU_RAISED }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = NEU_RAISED }}
            >
              {k}
            </button>
          )
        })}
      </div>
      <button
        className="lite-btn"
        onClick={onApply}
        disabled={!selectedRowKey || !qtyBuffer}
        style={{
          display: 'block',
          width: '100%', maxWidth: 'clamp(180px, 34vh, 264px)',
          padding: 'clamp(7px, 1.4vh, 12px) 0', margin: 'clamp(4px, 0.9vh, 8px) auto 0', borderRadius: 'var(--r-md)',
          border: 'none', minHeight: 'clamp(34px, 5vh, 44px)',
          background: selectedRowKey && qtyBuffer ? 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--surface-3)',
          color: selectedRowKey && qtyBuffer ? '#fff' : 'var(--text-3)',
          fontSize: 13.5, fontWeight: 800, letterSpacing: 1,
          cursor: selectedRowKey && qtyBuffer ? 'pointer' : 'not-allowed',
        }}
      >
        APPLY QTY
      </button>
    </div>
  )
}
