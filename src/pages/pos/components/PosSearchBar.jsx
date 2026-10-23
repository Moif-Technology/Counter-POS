import { useEffect, useRef } from 'react'
import { Search, ScanBarcode, X } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { togglePosQtyMode } from '../../../lib/posNumpadKeys'

/**
 * Barcode / product-code entry. Enter adds the item (or applies a cash
 * tender amount at Billing). The barcode icon opens the device scanner.
 * The chip switches functions with one tap: the number → type a new qty,
 * RTN → back to sale, × → qty back to 1. The "Return mode" pill also ends return mode.
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

  // One-tap switches from the chip / pill; each returns the cursor to the search box.
  const tap = (fn) => (e) => { e.stopPropagation(); fn(); inputRef.current?.focus() }
  const endReturn = () => { if (usePosStore.getState().returnMode) usePosStore.getState().toggleReturn() }
  const resetQty  = () => usePosStore.setState({ qtyBuffer: usePosStore.getState().defaultQtyBuffer() })

  return (
    <div className="ph-searchrow">
      <div className="ph-search" data-pos-barcode-input onClick={() => inputRef.current?.focus()}>
        <Search size={22} className="ph-search-icon" />
        {qtyEntry && (
          <span className={`ph-search-qty is-editing${isReturn ? ' is-return' : ''}`} aria-live="polite">
            Qty: {qtyBuffer.replace('-', '') || '_'}
          </span>
        )}
        {showQty && !qtyEntry && (
          <span className={`ph-search-qty is-split${isReturn ? ' is-return' : ''}`}>
            <button type="button" className="ph-chip-part" onClick={(e) => { e.stopPropagation(); togglePosQtyMode() }} title="Change the qty">
              {qtyBuffer}
            </button>
            {isReturn ? (
              <button type="button" className="ph-chip-part" onClick={tap(endReturn)} title="Back to sale">RTN</button>
            ) : (
              <button type="button" className="ph-chip-part" onClick={tap(resetQty)} title="Qty back to 1" aria-label="Qty back to 1">×</button>
            )}
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
        {!status && returnMode && (
          <button type="button" className="ph-search-status is-return" onClick={tap(endReturn)} title="Switch back to sale">
            Return mode <X size={13} />
          </button>
        )}

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
