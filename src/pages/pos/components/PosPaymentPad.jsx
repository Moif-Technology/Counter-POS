import { CornerDownLeft } from 'lucide-react'
import { applyPosNumpadKey, usePosNumpadKeyboard } from '../../../lib/posNumpadKeys'

// Bottom row: . · 0 · C (clear) — 0 in the centre, under 2
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'C']

/** Numpad and ENTER (middle column). Payment tiles live with BILLING (PosBillingButtons). */
export default function PosPaymentPad({ onEnter }) {
  usePosNumpadKeyboard(onEnter)

  return (
    <div className="ph-pad">
      <div className="ph-keys">
        {KEYS.map(k => (
          <button
            key={k}
            className={`ph-key${k === 'C' ? ' is-clear' : ''}`}
            onClick={() => applyPosNumpadKey(k)}
            aria-label={k === 'C' ? 'Clear' : undefined}
          >
            {k}
          </button>
        ))}
      </div>

      <button className="ph-enter" onClick={onEnter}>
        <CornerDownLeft size={22} />
        <span>ENTER</span>
      </button>
    </div>
  )
}
