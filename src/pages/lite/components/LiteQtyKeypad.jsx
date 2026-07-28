const NUMPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫']

export default function LiteQtyKeypad({ selectedRowKey, qtyBuffer, onPressKey, onApply }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        padding: '9px 12px', borderRadius: 'var(--r-md)',
        border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
        fontSize: 12, color: 'var(--text-3)', marginBottom: 8,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{selectedRowKey ? 'Set Qty' : 'Select a row'}</span>
        <span style={{ fontWeight: 800, color: 'var(--brand)', fontFamily: "'JetBrains Mono', monospace" }}>
          {qtyBuffer || '—'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {NUMPAD_KEYS.map(k => {
          const isAction = k === '⌫' || k === 'C'
          return (
            <button
              key={k}
              className="lite-btn"
              onClick={() => onPressKey(k)}
              style={{
                padding: '22px 0', borderRadius: 'var(--r-md)',
                border: `1.5px solid ${isAction ? 'var(--red-border)' : 'var(--border)'}`,
                background: isAction ? 'var(--red-bg)' : 'var(--surface)',
                color: isAction ? 'var(--red)' : 'var(--text-1)',
                fontSize: isAction ? 15 : 22, fontWeight: 700,
                fontFamily: k === '⌫' ? 'inherit' : "'JetBrains Mono', monospace",
                cursor: 'pointer',
                boxShadow: 'var(--shadow-xs)',
                transition: 'transform 0.07s, background 0.08s',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
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
          width: '100%', padding: '14px 0', marginTop: 8, borderRadius: 'var(--r-md)',
          border: 'none', minHeight: 48,
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
