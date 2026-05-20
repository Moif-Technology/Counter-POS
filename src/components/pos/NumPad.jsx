import { usePosStore } from '../../store/posStore'

const KEYS = ['7','8','9','4','5','6','1','2','3','0','.','00']

export default function NumPad({ onEnter }) {
  const inputMode        = usePosStore(s => s.inputMode)
  const setQtyBuffer     = usePosStore(s => s.setQtyBuffer)
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
    <div style={{ padding: '6px 7px 5px' }}>

      {/* Number grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, marginBottom: 5 }}>
        {KEYS.map(k => (
          <button
            key={k}
            onClick={() => press(k)}
            style={{
              padding: '13px 0', borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-1)',
              fontSize: 18, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              boxShadow: 'var(--shadow-xs)',
              transition: 'transform 0.08s, background 0.08s, box-shadow 0.08s',
              lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; e.currentTarget.style.boxShadow = 'none' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* ENTER key */}
      <button
        onClick={onEnter}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 'var(--r-md)',
          background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
          color: '#fff', fontSize: 12.5, fontWeight: 800, letterSpacing: 2,
          cursor: 'pointer',
          boxShadow: '0 3px 14px rgba(107,0,0,0.22)',
          transition: 'box-shadow 0.12s, transform 0.08s',
          lineHeight: 1,
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 5px 20px rgba(107,0,0,0.32)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 3px 14px rgba(107,0,0,0.22)'}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(107,0,0,0.18)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 3px 14px rgba(107,0,0,0.22)' }}
      >
        ENTER
      </button>
    </div>
  )
}
