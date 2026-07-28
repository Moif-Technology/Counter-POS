export default function LiteActionBar({ hasItems, saving, onClearAll, onSave, onBillAndPrint }) {
  return (
    <>
      <button
        className="lite-btn"
        onClick={onClearAll}
        disabled={!hasItems || saving}
        style={{
          width: '100%', padding: '13px 0', marginBottom: 8, borderRadius: 'var(--r-lg)',
          border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
          color: 'var(--red)', fontSize: 13, fontWeight: 700, minHeight: 46,
          cursor: hasItems ? 'pointer' : 'not-allowed',
          opacity: hasItems ? 1 : 0.5,
        }}
      >
        Clear All
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="lite-btn"
          onClick={onSave}
          disabled={!hasItems || saving}
          style={{
            flex: 1, padding: '14px 0', borderRadius: 'var(--r-lg)', minHeight: 50,
            border: '1.5px solid var(--border)',
            background: hasItems ? 'var(--surface)' : 'var(--surface-3)',
            color: hasItems ? 'var(--text-1)' : 'var(--text-3)',
            fontSize: 13.5, fontWeight: 800, letterSpacing: 0.3,
            cursor: hasItems && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          className="lite-btn"
          onClick={onBillAndPrint}
          disabled={!hasItems || saving}
          style={{
            flex: 1.4, padding: '14px 0', borderRadius: 'var(--r-lg)', minHeight: 50,
            border: 'none',
            background: hasItems
              ? 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)'
              : 'var(--surface-3)',
            color: hasItems ? '#fff' : 'var(--text-3)',
            fontSize: 13, fontWeight: 800, letterSpacing: 0.3,
            cursor: hasItems && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          Bill & Print
        </button>
      </div>
    </>
  )
}
