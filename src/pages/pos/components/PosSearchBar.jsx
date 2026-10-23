import { useEffect, useRef } from 'react'
import { Search, ScanBarcode } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'

/**
 * Barcode / product-code entry. Enter adds the item (or applies a cash
 * tender amount at Billing). The barcode icon opens the device scanner.
 * The chip shows the qty / return qty that the next scan will use.
 */
export default function PosSearchBar({ onEnter, onScan, status, scanning, sunmiScanOpen }) {
  const barcodeBuffer    = usePosStore(s => s.barcodeBuffer)
  const qtyBuffer        = usePosStore(s => s.qtyBuffer)
  const returnMode       = usePosStore(s => s.returnMode)
  const qtyEntry         = usePosStore(s => s.inputMode === 'qty')
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const setQtyBuffer     = usePosStore(s => s.setQtyBuffer)
  const barcodeFocusTick = usePosStore(s => s.barcodeFocusTick)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Popups call focusBarcodeScan() when they close → come back here.
  useEffect(() => {
    if (barcodeFocusTick < 1) return undefined
    usePosStore.setState({ inputMode: 'barcode' })
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [barcodeFocusTick])

  const isReturn = returnMode || parseFloat(qtyBuffer) < 0
  const showQty  = isReturn || (qtyBuffer !== '0' && qtyBuffer !== '1' && qtyBuffer !== '-1' && qtyBuffer !== '')

  return (
    <div className="ph-searchrow">
      <div className="ph-search" data-pos-barcode-input onClick={() => inputRef.current?.focus()}>
        <Search size={22} className="ph-search-icon" />
        {qtyEntry && (
          <span className={`ph-search-qty is-editing${isReturn ? ' is-return' : ''}`} aria-live="polite">
            {returnMode ? 'Return' : 'Qty'}: {qtyBuffer.replace('-', '') || '_'}
          </span>
        )}
        {showQty && !qtyEntry && (
          <span className={`ph-search-qty${isReturn ? ' is-return' : ''}`}>
            {qtyBuffer} {isReturn ? 'RTN' : '×'}
          </span>
        )}
        <input
          ref={inputRef}
          // No on-screen keyboard: input comes from the scanner, a physical keyboard or the POS numpad.
          inputMode="none"
          value={barcodeBuffer}
          onChange={e => {
            const state = usePosStore.getState()
            if (state.qtyBuffer === '0' || state.qtyBuffer === '') setQtyBuffer(state.defaultQtyBuffer())
            setBarcodeBuffer(e.target.value)
          }}
          onFocus={() => usePosStore.setState({ inputMode: 'barcode' })}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          placeholder="Scan barcode or type product code…"
          aria-label="Barcode or product code"
          style={{ opacity: scanning ? 0.6 : 1 }}
        />
        {status && <span className="ph-search-status" aria-live="polite">{status}</span>}

      </div>
  
      {/* Round scan button, outside the search box at its end */}
      <button
        className="ph-search-scan"
        data-pos-skip-refocus
        onClick={onScan}
        disabled={sunmiScanOpen || scanning}
        title="Scan with device camera / scanner"
        aria-label="Scan"
      >
        <ScanBarcode size={24} />
      </button>
    </div>
  )
}
