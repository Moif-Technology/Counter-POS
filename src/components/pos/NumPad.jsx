import { usePosStore } from '../../store/posStore'

const KEYS = ['7','8','9','4','5','6','1','2','3','0','.','00']

export default function NumPad({ onEnter }) {
  const inputMode = usePosStore(s => s.inputMode)
  const setQtyBuffer = usePosStore(s => s.setQtyBuffer)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)

  const press = (key) => {
    if (inputMode === 'qty') {
      setQtyBuffer(p => {
        if (key === '00') return p === '0' ? '0' : p + '00'
        if (key === '.' && p.includes('.')) return p
        if (p === '1' && key !== '.') return key
        return p + key
      })
    } else {
      setBarcodeBuffer(p => p + key)
    }
  }

  return (
    <div style={{ padding: '8px 8px 4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        {KEYS.map(k => (
          <button
            key={k}
            onClick={() => press(k)}
            style={{
              padding: '14px 0', borderRadius: 10,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text-1)',
              fontSize: 19, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.1s', fontFamily: "'DM Mono', monospace",
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.boxShadow = 'none' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
          >
            {k}
          </button>
        ))}
      </div>

      <button
        onClick={onEnter}
        style={{
          width: '100%', padding: '14px 0', marginTop: 6, borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(160deg, var(--brand) 0%, var(--brand-2) 100%)',
          color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: 2,
          cursor: 'pointer', transition: 'all 0.15s',
          boxShadow: '0 3px 12px rgba(92,0,0,0.25)',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 5px 18px rgba(92,0,0,0.35)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 3px 12px rgba(92,0,0,0.25)'}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        ENTER
      </button>
    </div>
  )
}
