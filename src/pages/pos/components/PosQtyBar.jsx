import { ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react'
import { usePosStore } from '../../../store/posStore'
import { applyPosNumpadBackspace } from '../../../lib/posNumpadKeys'

/**
 * Status line + quantity for the next scan (↑ / ↓ or type) + Back Space.
 * The qty is the same buffer the "#Qty" key and the numpad fill.
 */
export default function PosQtyBar({ status }) {
  const qtyBuffer    = usePosStore(s => s.qtyBuffer)
  const setQtyBuffer = usePosStore(s => s.setQtyBuffer)

  const isReturnCtx = () => usePosStore.getState().isReturnContext()

  const step = (delta) => {
    const cur  = Math.abs(parseFloat(qtyBuffer)) || 0
    const next = Math.max(1, cur + delta)
    setQtyBuffer(String(isReturnCtx() ? -next : next))
  }

  const handleChange = (e) => {
    const val = e.target.value
    if (!/^-?\d*\.?\d*$/.test(val)) return
    if (val === '' || val === '-') { setQtyBuffer(val); return }
    setQtyBuffer(isReturnCtx() && !val.startsWith('-') ? `-${val}` : val)
  }

  return (
    <div className="ph-qtybar">
      <div className="ph-qtybar-status">{status}</div>
      <div className="ph-qtybar-row">
        <label className="ph-qtybar-label" htmlFor="ph-qty">Qty</label>
        <input
          id="ph-qty"
          className="ph-qtybar-input"
          value={qtyBuffer}
          onChange={handleChange}
          onFocus={() => usePosStore.setState({ inputMode: 'qty' })}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); usePosStore.getState().focusBarcodeScan() }
            if (e.key === 'ArrowUp')   { e.preventDefault(); step(1) }
            if (e.key === 'ArrowDown') { e.preventDefault(); step(-1) }
          }}
          inputMode="decimal"
          data-pos-barcode-input
        />
        <button className="ph-qtybar-step" onClick={() => step(1)} aria-label="Increase quantity">
          <ChevronUp size={20} />
        </button>
        <button className="ph-qtybar-step is-down" onClick={() => step(-1)} aria-label="Decrease quantity">
          <ChevronDown size={20} />
        </button>
        <button className="ph-qtybar-back" onClick={applyPosNumpadBackspace}>
          <ArrowLeft size={18} /> Back Space
        </button>
      </div>
    </div>
  )
}
