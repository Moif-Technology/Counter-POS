import { useRef, useEffect } from 'react'
import { ScanLine, Hash, Delete } from 'lucide-react'
import { usePosStore } from '../../store/posStore'

export default function BarcodeInput({ onEnter }) {
  const qtyBuffer = usePosStore(s => s.qtyBuffer)
  const barcodeBuffer = usePosStore(s => s.barcodeBuffer)
  const inputMode = usePosStore(s => s.inputMode)
  const setQtyBuffer = usePosStore(s => s.setQtyBuffer)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const barcodeRef = useRef()

  useEffect(() => { barcodeRef.current?.focus() }, [])

  const handleBackspace = () => {
    if (inputMode === 'qty') setQtyBuffer(p => p.slice(0, -1) || '1')
    else setBarcodeBuffer(p => p.slice(0, -1))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: '100%' }}>

      {/* Qty pill */}
      <div
        onClick={() => usePosStore.setState({ inputMode: 'qty' })}
        role="button"
        aria-label="Quantity field"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: inputMode === 'qty' ? 'var(--brand-bg)' : 'var(--bg)',
          border: `1.5px solid ${inputMode === 'qty' ? 'var(--brand)' : 'var(--border)'}`,
          borderRadius: 10, padding: '0 14px', height: 46, cursor: 'pointer',
          flexShrink: 0, minWidth: 80, transition: 'all 0.15s',
          boxShadow: inputMode === 'qty' ? '0 0 0 3px rgba(92,0,0,0.08)' : 'none',
        }}
      >
        <Hash size={13} color={inputMode === 'qty' ? 'var(--brand)' : 'var(--text-3)'} />
        <span style={{
          fontSize: 21, fontWeight: 800, minWidth: 24, textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: inputMode === 'qty' ? 'var(--brand)' : 'var(--text-1)',
        }}>
          {qtyBuffer}
        </span>
      </div>

      <span style={{ color: 'var(--text-3)', fontSize: 20, fontWeight: 300, flexShrink: 0 }}>×</span>

      {/* Barcode field */}
      <div
        onClick={() => { usePosStore.setState({ inputMode: 'barcode' }); barcodeRef.current?.focus() }}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          background: inputMode === 'barcode' ? 'var(--surface)' : 'var(--bg)',
          border: `1.5px solid ${inputMode === 'barcode' ? 'var(--brand)' : 'var(--border)'}`,
          borderRadius: 10, padding: '0 14px', height: 46, cursor: 'text',
          transition: 'all 0.15s',
          boxShadow: inputMode === 'barcode' ? '0 0 0 3px rgba(92,0,0,0.08)' : 'none',
        }}
      >
        <ScanLine size={16} color={inputMode === 'barcode' ? 'var(--brand)' : 'var(--text-3)'} style={{ flexShrink: 0 }} />
        <input
          ref={barcodeRef}
          value={barcodeBuffer}
          onChange={e => setBarcodeBuffer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          onClick={() => usePosStore.setState({ inputMode: 'barcode' })}
          placeholder="Scan barcode or type product code..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 14, fontWeight: 500, color: 'var(--text-1)',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Backspace */}
      <button
        onClick={handleBackspace}
        aria-label="Backspace"
        style={{
          height: 46, width: 46, borderRadius: 10,
          border: '1.5px solid var(--border)', background: 'var(--bg)',
          cursor: 'pointer', flexShrink: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-2)', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
      >
        <Delete size={16} />
      </button>
    </div>
  )
}
