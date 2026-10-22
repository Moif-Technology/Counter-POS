import { useEffect, useRef, useState } from 'react'
import BrandLogo from '../../../components/common/BrandLogo'
import { usePosStore } from '../../../store/posStore'
import { calcLineTotals, getCartRowKey } from '../../../lib/cartLine'
import { fmt3, fmtQty } from '../../../lib/utils'
import { closeAndFocusBarcode } from '../../../lib/posFocus'
import ItemDetailModal from '../../../modals/ItemDetailModal'

/** Cart lines: No. · Barcode · Description · Qty · Price · Total. Tap selects, double-tap shows details. */
export default function PosItemsTable() {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const [detailItem, setDetailItem] = useState(null)
  const bodyRef = useRef(null)

  // Keep the newest line in view as items are scanned.
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [cartItems.length])

  return (
    <div className="ph-table">
      <div className="ph-table-row ph-table-head">
        <span>No.</span>
        <span className="ph-col-barcode">Barcode</span>
        <span>Description</span>
        <span className="ph-num">Qty</span>
        <span className="ph-num">Price</span>
        <span className="ph-num">Total</span>
      </div>

      <div className="ph-table-body" ref={bodyRef}>
        {cartItems.length === 0 && (
          <div className="ph-table-empty">
            <span className="ph-table-empty-logo"><BrandLogo variant="stacked" height={96} /></span>
            <strong>No items yet</strong>
            <span>Scan or type a barcode to start the bill</span>
          </div>
        )}
        {cartItems.map((row, idx) => {
          const key      = getCartRowKey(row)
          const selected = key === selectedRowKey
          const isReturn = Number(row.qty) < 0
          return (
            <div
              key={key}
              className={`ph-table-row${selected ? ' is-selected' : ''}${isReturn ? ' is-return' : ''}`}
              onClick={() => usePosStore.setState({ selectedRowKey: key })}
              onDoubleClick={() => setDetailItem(row)}
            >
              <span><span className="ph-sl">{row.slNo ?? idx + 1}</span></span>
              <span className="ph-col-barcode ph-ellipsis">{row.barcode ?? row.productCode ?? '—'}</span>
              <span className="ph-ellipsis">{row.description}</span>
              <span className="ph-num">{fmtQty(row.qty)}</span>
              <span className="ph-num">{fmt3(row.unitPriceGross ?? row.unitPrice)}</span>
              <span className="ph-num">{fmt3(calcLineTotals(row).lineTotal)}</span>
            </div>
          )
        })}
      </div>

      {detailItem && (
        <ItemDetailModal
          item={cartItems.find(i => getCartRowKey(i) === getCartRowKey(detailItem)) || detailItem}
          onClose={closeAndFocusBarcode(() => setDetailItem(null))}
        />
      )}
    </div>
  )
}
