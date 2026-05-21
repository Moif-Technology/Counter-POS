import { usePosStore } from '../../store/posStore'

const NUMBER_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', '.', '00'],
]

const NUM_BTN = {
  height: '100%', width: '100%', borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-1)', fontSize: 24, fontWeight: 700, cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
  boxShadow: 'var(--shadow-xs)', transition: 'transform 0.07s, background 0.08s',
  lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
}

export default function NumPad({ onEnter }) {
  const inputMode        = usePosStore(s => s.inputMode)
  const setQtyBuffer     = usePosStore(s => s.setQtyBuffer)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)

  const pressNum = (key) => {
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

  const rowH = 52

  return (
    <div style={{ padding: '7px 8px 8px' }}>

      {/* 3-column number grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
        {NUMBER_ROWS.map((row, ri) =>
          row.map(k => (
            <button
              key={`${ri}-${k}`}
              onClick={() => pressNum(k)}
              style={{ ...NUM_BTN, height: rowH }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; e.currentTarget.style.boxShadow = 'none' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
            >
              {k}
            </button>
          ))
        )}
      </div>

      {/* ENTER key — spans full width */}
      <button
        onClick={onEnter}
        style={{
          width: '100%', height: 46, marginTop: 5,
          borderRadius: 'var(--r-md)',
          background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
          border: 'none',
          color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: 2,
          cursor: 'pointer',
          boxShadow: '0 3px 14px rgba(107,0,0,0.22)',
          transition: 'box-shadow 0.12s, transform 0.08s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 20px rgba(107,0,0,0.32)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 3px 14px rgba(107,0,0,0.22)' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        ENTER
      </button>
    </div>
  )
}
