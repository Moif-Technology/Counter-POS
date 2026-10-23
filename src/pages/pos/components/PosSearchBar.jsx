import { useEffect, useRef, useState } from 'react'
import { Search, ScanBarcode, ShoppingCart, Undo2, Tag, Package, PackageSearch } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'

/**
 * Barcode / product-code entry. Enter adds the item (or applies a cash
 * tender amount at Billing). The barcode icon opens the device scanner.
 * Double-tap the qty / RTN chip to switch what the search box does.
 */

// Search box modes. Sale/Return change how scanned items are added; the rest open their popup.
const MODES = [
  { key: 'sale',   label: 'Sale',           icon: ShoppingCart },
  { key: 'return', label: 'Return',         icon: Undo2 },
  { key: 'Price Enquiry',  label: 'Price Enquiry',  icon: Tag },
  { key: 'Packet Scan',    label: 'Packet Scan',    icon: Package },
  { key: 'Product Lookup', label: 'Product Lookup', icon: PackageSearch },
]
export default function PosSearchBar({ onEnter, onScan, onAction, status, scanning, sunmiScanOpen }) {
  const barcodeBuffer    = usePosStore(s => s.barcodeBuffer)
  const qtyBuffer        = usePosStore(s => s.qtyBuffer)
  const returnMode       = usePosStore(s => s.returnMode)
  const qtyEntry         = usePosStore(s => s.inputMode === 'qty')
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const setQtyBuffer     = usePosStore(s => s.setQtyBuffer)
  const barcodeFocusTick = usePosStore(s => s.barcodeFocusTick)
  const inputRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

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

  const pickMode = (key) => {
    setMenuOpen(false)
    if (key === 'sale' || key === 'return') {
      if ((key === 'return') !== returnMode) usePosStore.getState().toggleReturn()
      inputRef.current?.focus()
      return
    }
    onAction?.(key)
  }

  return (
    <div className="ph-searchrow">
      {menuOpen && <div className="ph-mode-backdrop" data-pos-overlay onPointerDown={() => setMenuOpen(false)} />}
      <div className="ph-search" data-pos-barcode-input onClick={() => inputRef.current?.focus()}>
        <Search size={22} className="ph-search-icon" />
        {qtyEntry && (
          <span className={`ph-search-qty is-editing${isReturn ? ' is-return' : ''}`} aria-live="polite">
            {isReturn ? 'Return' : 'Qty'}: {qtyBuffer.replace('-', '') || '_'}
          </span>
        )}
        {showQty && !qtyEntry && (
          <span
            className={`ph-search-qty${isReturn ? ' is-return' : ''}`}
            role="button"
            title="Double-tap to switch mode"
            onDoubleClick={(e) => { e.stopPropagation(); setMenuOpen(true) }}
          >
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

        {menuOpen && (
          <div className="ph-mode-menu" role="menu" data-pos-overlay>
            {MODES.map(({ key, label, icon: Icon }) => {
              const current = (key === 'return' && returnMode) || (key === 'sale' && !returnMode)
              return (
                <button key={key} role="menuitem" className={`ph-mode-item${current ? ' is-current' : ''}`} onClick={() => pickMode(key)}>
                  <Icon size={16} /> {label}
                </button>
              )
            })}
          </div>
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
