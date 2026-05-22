import { useRef, useEffect } from 'react'
import { ScanLine, Hash, Delete } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

export default function BarcodeInput({ onEnter }) {
  const qtyBuffer        = usePosStore(s => s.qtyBuffer)
  const barcodeBuffer    = usePosStore(s => s.barcodeBuffer)
  const inputMode        = usePosStore(s => s.inputMode)
  const setQtyBuffer     = usePosStore(s => s.setQtyBuffer)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const barcodeRef       = useRef()
  const qtyRef           = useRef()

  useEffect(() => { barcodeRef.current?.focus() }, [])

  const handleBackspace = () => {
    if (inputMode === 'qty') setQtyBuffer(p => p.slice(0, -1) || '0')
    else setBarcodeBuffer(p => p.slice(0, -1))
  }

  const handleQtyChange = (e) => {
    const val = e.target.value
    if (/^-?\d*\.?\d*$/.test(val)) setQtyBuffer(val || '1')
  }

  const handleQtyKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      usePosStore.setState({ inputMode: 'barcode' })
      barcodeRef.current?.focus()
    }
  }

  const qtyActive     = inputMode === 'qty'
  const barcodeActive = inputMode === 'barcode'
  const isReturn      = parseFloat(qtyBuffer) < 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: '100%', width: '100%' }}>

      {/* ── QTY input ─────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: isReturn ? 'var(--red-bg)' : qtyActive ? 'var(--brand-bg)' : 'var(--surface-2)',
          border: `1.5px solid ${isReturn ? 'var(--red)' : qtyActive ? 'var(--brand)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)', padding: '0 10px', height: 42,
          flexShrink: 0, minWidth: 80,
          boxShadow: isReturn ? '0 0 0 3px var(--red-glow, rgba(220,38,38,0.15))' : qtyActive ? '0 0 0 3px var(--brand-glow)' : 'none',
          transition: 'all 0.13s', cursor: 'text',
        }}
        onClick={() => { usePosStore.setState({ inputMode: 'qty' }); qtyRef.current?.focus() }}
      >
        <Hash size={12} color={isReturn ? 'var(--red)' : qtyActive ? 'var(--brand)' : 'var(--text-3)'} style={{ flexShrink: 0 }} />
        <input
          ref={qtyRef}
          value={qtyBuffer}
          onChange={handleQtyChange}
          onFocus={() => usePosStore.setState({ inputMode: 'qty' })}
          onKeyDown={handleQtyKeyDown}
          inputMode="decimal"
          style={{
            width: 46, background: 'none', border: 'none', outline: 'none',
            fontSize: 20, fontWeight: 800, textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: "'JetBrains Mono', monospace",
            color: isReturn ? 'var(--red)' : qtyActive ? 'var(--brand)' : 'var(--text-1)',
            lineHeight: 1, cursor: 'text',
          }}
        />
      </div>

      {/* Multiply symbol */}
      <span style={{ color: 'var(--text-4)', fontSize: 18, fontWeight: 300, flexShrink: 0, lineHeight: 1 }}>×</span>

      {/* ── BARCODE field ─────────────────────── */}
      <div
        onClick={() => { usePosStore.setState({ inputMode: 'barcode' }); barcodeRef.current?.focus() }}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 9,
          background: barcodeActive ? 'var(--surface)' : 'var(--surface-2)',
          border: `1.5px solid ${barcodeActive ? 'var(--brand)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)', padding: '0 12px', height: 42, cursor: 'text',
          boxShadow: barcodeActive ? '0 0 0 3px var(--brand-glow)' : 'none',
          transition: 'all 0.13s',
        }}
      >
        <ScanLine size={15} color={barcodeActive ? 'var(--brand)' : 'var(--text-3)'} style={{ flexShrink: 0 }} />
        {(qtyBuffer !== '0' && qtyBuffer !== '1') && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
            background: isReturn ? 'var(--red)' : 'var(--brand)', borderRadius: 5,
            padding: '2px 7px',
          }}>
            <span style={{
              fontSize: 13, fontWeight: 800, color: '#fff',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
            }}>{qtyBuffer}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 }}>
              {isReturn ? 'RTN' : 'QTY'}
            </span>
          </div>
        )}
        <input
          ref={barcodeRef}
          value={barcodeBuffer}
          onChange={e => {
            if (usePosStore.getState().qtyBuffer === '0') setQtyBuffer('1')
            setBarcodeBuffer(e.target.value)
          }}
          onFocus={() => usePosStore.setState({ inputMode: 'barcode' })}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          placeholder="Scan barcode or type product code…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)',
            fontFamily: 'inherit',
          }}
        />
        {barcodeActive && barcodeBuffer && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'var(--brand)',
            background: 'var(--brand-tint)', borderRadius: 4,
            padding: '2px 6px', letterSpacing: 0.3, flexShrink: 0,
          }}>
            ENTER ↵
          </span>
        )}
      </div>

      {/* ── BACKSPACE button ──────────────────── */}
      <button
        onClick={handleBackspace}
        aria-label="Backspace"
        style={{
          height: 42, width: 42, borderRadius: 'var(--r-md)', flexShrink: 0,
          border: '1.5px solid var(--border)', background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-3)', transition: 'all 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.borderColor = 'var(--red-border)'; e.currentTarget.style.color = 'var(--red)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <Delete size={14} />
      </button>

    </div>
  )
}
