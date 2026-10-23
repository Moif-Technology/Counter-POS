import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import BrandLogo from '../../../components/common/BrandLogo'
import { usePosStore } from '../../../store/posStore'
import { calcLineTotals, getCartRowKey } from '../../../lib/cartLine'
import { fmt3, fmtQty } from '../../../lib/utils'
import { closeAndFocusBarcode } from '../../../lib/posFocus'
import LineActionsModal from '../../../modals/LineActionsModal'
import QtyWheelModal from '../../../modals/QtyWheelModal'

/** Cart lines: No. · Barcode · Description · Qty · Price · Total · delete. Tap selects, tap the qty to change it, double-tap opens the line actions. */
export default function PosItemsTable() {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const removeItem     = usePosStore(s => s.removeItem)
  const [detailItem, setDetailItem] = useState(null)
  const [qtyItem, setQtyItem] = useState(null)
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
        <span />
      </div>

      <div className="ph-table-body" ref={bodyRef}>
        {cartItems.length === 0 && (
          <div className="ph-table-empty">
            <BrandLogo variant="stacked" height={96} />
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
              <span className="ph-num">
                <button
                  className="ph-qty-tap"
                  aria-label={`Change qty of ${row.description}`}
                  onClick={(e) => { e.stopPropagation(); usePosStore.setState({ selectedRowKey: key }); setQtyItem(row) }}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  {fmtQty(row.qty)}
                </button>
              </span>
              <span className="ph-num">{fmt3(row.unitPriceGross ?? row.unitPrice)}</span>
              <span className="ph-num">{fmt3(calcLineTotals(row).lineTotal)}</span>
              <button
                className="ph-row-del"
                aria-label={`Delete ${row.description}`}
                onClick={(e) => { e.stopPropagation(); removeItem(key) }}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        })}
      </div>

      {qtyItem && (
        <QtyWheelModal item={qtyItem} onClose={closeAndFocusBarcode(() => setQtyItem(null))} />
      )}
      {detailItem && (
        <LineActionsModal
          item={cartItems.find(i => getCartRowKey(i) === getCartRowKey(detailItem)) || detailItem}
          onClose={closeAndFocusBarcode(() => setDetailItem(null))}
        />
      )}
    </div>
  )
}
