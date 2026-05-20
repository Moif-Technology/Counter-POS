import { useRef, useEffect } from 'react'
import { ScanLine, Hash, Delete } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

export default function BarcodeInput({ onEnter }) {
  const qtyBuffer      = usePosStore(s => s.qtyBuffer)
  const barcodeBuffer  = usePosStore(s => s.barcodeBuffer)
  const inputMode      = usePosStore(s => s.inputMode)
  const setQtyBuffer   = usePosStore(s => s.setQtyBuffer)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const barcodeRef     = useRef()

  useEffect(() => { barcodeRef.current?.focus() }, [])

  const handleBackspace = () => {
    if (inputMode === 'qty') setQtyBuffer(p => p.slice(0, -1) || '1')
    else setBarcodeBuffer(p => p.slice(0, -1))
  }

  const qtyActive     = inputMode === 'qty'
  const barcodeActive = inputMode === 'barcode'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: '100%' }}>

      {/* ── QTY pill ──────────────────────────── */}
      <div
        role="button"
        aria-label="Quantity input — click to type quantity"
        onClick={() => usePosStore.setState({ inputMode: 'qty' })}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: qtyActive ? 'var(--brand-bg)' : 'var(--surface-2)',
          border: `1.5px solid ${qtyActive ? 'var(--brand)' : 'var(--border)'}`,
          borderRadius: 'var(--r-md)', padding: '0 12px', height: 42, cursor: 'pointer',
          flexShrink: 0, minWidth: 76,
          boxShadow: qtyActive ? '0 0 0 3px var(--brand-glow)' : 'none',
          transition: 'all 0.13s',
        }}
      >
        <Hash size={12} color={qtyActive ? 'var(--brand)' : 'var(--text-3)'} />
        <span style={{
          fontSize: 22, fontWeight: 800, minWidth: 22, textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: "'JetBrains Mono', monospace",
          color: qtyActive ? 'var(--brand)' : 'var(--text-1)',
          lineHeight: 1,
        }}>
          {qtyBuffer}
        </span>
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
        <input
          ref={barcodeRef}
          value={barcodeBuffer}
          onChange={e => setBarcodeBuffer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          onClick={() => usePosStore.setState({ inputMode: 'barcode' })}
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
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Delete size={14} />
      </button>

    </div>
  )
}
