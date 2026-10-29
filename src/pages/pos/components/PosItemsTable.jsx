import { useEffect, useRef, useState } from 'react'
import { Trash2, Check, X } from 'lucide-react'
import BrandLogo from '../../../components/common/BrandLogo'
import { usePosStore } from '../../../store/posStore'
import { calcLineTotals, getCartRowKey } from '../../../lib/cartLine'
import { fmt3, fmtQty } from '../../../lib/utils'
import { closeAndFocusBarcode } from '../../../lib/posFocus'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import QtyWheelModal from '../../../modals/QtyWheelModal'
import PosLineActionBar from './PosLineActionBar'

const LONG_PRESS_MS = 500

/**
 * Cart lines: No. · Barcode · Description · Qty · Price · Total · delete.
 * Tap a line to select it, tap the qty to change it; the bar at the foot holds the line actions.
 * Hold a line to enter select mode: the bins become checkboxes and one
 * Delete button removes every ticked line.
 */
export default function PosItemsTable() {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const removeItem     = usePosStore(s => s.removeItem)
  const removeItems    = usePosStore(s => s.removeItems)
  const [qtyItem, setQtyItem] = useState(null)
  const [checked, setChecked] = useState(null)     // Set of row keys while in select mode, else null
  const bodyRef = useRef(null)
  const press = useRef({ timer: 0, fired: false })

  const selectMode = checked !== null && cartItems.length > 0   // an empty cart ends select mode
  const allKeys = cartItems.map(getCartRowKey)
  const allChecked = selectMode && allKeys.length > 0 && allKeys.every(k => checked.has(k))

  // Keep the newest line in view as items are scanned.
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [cartItems.length])

  useEscapeKey(() => setChecked(null), selectMode)

  const toggle = (key) => setChecked(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  // Long press: start select mode with that line ticked.
  const startPress = (key) => {
    clearTimeout(press.current.timer)
    press.current.fired = false
    press.current.timer = setTimeout(() => {
      press.current.fired = true
      setChecked(prev => new Set(prev ?? []).add(key))
    }, LONG_PRESS_MS)
  }
  const cancelPress = () => clearTimeout(press.current.timer)

  const handleRowClick = (key) => {
    if (press.current.fired) { press.current.fired = false; return }   // the click that ends a long press
    if (selectMode) { toggle(key); return }
    usePosStore.setState({ selectedRowKey: key })
  }

  const deleteChecked = () => {
    removeItems([...checked])
    setChecked(null)
  }

  return (
    <div className={`ph-table${selectMode ? ' is-selecting' : ''}`}>
      <div className="ph-table-row ph-table-head">
        <span>No.</span>
        <span className="ph-col-barcode">Barcode</span>
        <span>Description</span>
        <span className="ph-num">Qty</span>
        <span className="ph-num">Price</span>
        <span className="ph-num">Total</span>
        {selectMode ? (
          <button
            className={`ph-row-check${allChecked ? ' is-on' : ''}`}
            aria-label={allChecked ? 'Untick all lines' : 'Tick all lines'}
            onClick={() => setChecked(allChecked ? new Set() : new Set(allKeys))}
          >
            {allChecked && <Check size={14} strokeWidth={3} />}
          </button>
        ) : <span />}
      </div>

      {selectMode && (
        <div className="ph-select-bar">
          <span><b>{checked.size}</b> selected</span>
          <button className="ph-select-cancel" onClick={() => setChecked(null)}>
            <X size={15} /> Cancel
          </button>
          <button className="ph-select-delete" onClick={deleteChecked} disabled={!checked.size}>
            <Trash2 size={15} /> Delete{checked.size ? ` (${checked.size})` : ''}
          </button>
        </div>
      )}

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
          const isTicked = selectMode && checked.has(key)
          return (
            <div
              key={key}
              className={`ph-table-row${selected && !selectMode ? ' is-selected' : ''}${isTicked ? ' is-ticked' : ''}${isReturn ? ' is-return' : ''}`}
              onClick={() => handleRowClick(key)}
              onPointerDown={() => startPress(key)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              onContextMenu={(e) => e.preventDefault()}   // touch screens: no context menu on hold
            >
              <span><span className="ph-sl">{row.slNo ?? idx + 1}</span></span>
              <span className="ph-col-barcode ph-ellipsis">{row.barcode ?? row.productCode ?? '—'}</span>
              <span className="ph-ellipsis">{row.description}</span>
              <span className="ph-num">
                <button
                  className="ph-qty-tap"
                  aria-label={`Change qty of ${row.description}`}
                  disabled={selectMode}
                  onClick={(e) => { e.stopPropagation(); usePosStore.setState({ selectedRowKey: key }); setQtyItem(row) }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {fmtQty(row.qty)}
                </button>
              </span>
              <span className="ph-num">{fmt3(row.unitPriceGross ?? row.unitPrice)}</span>
              <span className="ph-num">{fmt3(calcLineTotals(row).lineTotal)}</span>
              {selectMode ? (
                <span className={`ph-row-check${isTicked ? ' is-on' : ''}`} aria-hidden>
                  {isTicked && <Check size={14} strokeWidth={3} />}
                </span>
              ) : (
                <button
                  className="ph-row-del"
                  aria-label={`Delete ${row.description}`}
                  onClick={(e) => { e.stopPropagation(); removeItem(key) }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <PosLineActionBar disabled={selectMode} />

      {qtyItem && (
        <QtyWheelModal item={qtyItem} onClose={closeAndFocusBarcode(() => setQtyItem(null))} />
      )}
    </div>
  )
}
