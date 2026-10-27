export default function LitePromptModal({ title, hint, value, onChange, onCancel, onSubmit }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 60, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 320, maxWidth: '100%',
          background: 'var(--surface)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: 18,
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>
          {title}
        </div>
        <input
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          placeholder={hint || ''}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)',
            border: '1.5px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text-1)', fontSize: 15, outline: 'none', marginBottom: 14,
            minHeight: 44,
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="lite-btn"
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)', minHeight: 44,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            className="lite-btn"
            onClick={onSubmit}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)', minHeight: 44,
              border: 'none', background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
