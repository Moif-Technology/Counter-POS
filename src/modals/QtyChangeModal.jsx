import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { findCartItemByKey } from '../lib/cartLine'
import { applyAmountKey } from '../lib/posNumpadKeys'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'

export default function QtyChangeModal({ onClose }) {
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const updateLine     = usePosStore(s => s.updateLine)
  const item           = findCartItemByKey(cartItems, selectedRowKey)

  const [newQty, setNewQty] = useState('')

  if (!item) return null

  const parsed = parseFloat(newQty) || 0

  const handleKey = k => setNewQty(v => applyAmountKey(v, k))

  const handleDone = () => {
    if (!parsed || parsed <= 0) return
    const signed = Number(item.qty) < 0 ? -Math.abs(parsed) : parsed
    updateLine(selectedRowKey, { qty: signed })
    onClose()
  }

  const fieldBox = (value, accent) => ({
    height: 36, borderRadius: 8,
    border: `1.5px solid ${accent ? 'var(--brand)' : 'var(--border)'}`,
    background: accent ? 'var(--brand-bg)' : '#fff',
    display: 'flex', alignItems: 'center', padding: '0 12px',
    fontSize: 15, fontWeight: 700,
    color: accent ? 'var(--text-1)' : 'var(--text-2)',
    fontFamily: 'inherit',
    minWidth: 110,
  })

  return (
    <Modal onClose={onClose} icon={SlidersHorizontal} kicker="Quantity Change" title={item.description} width={500}>

      <div style={{ display: 'flex', overflow: 'hidden' }}>

        {/* Left: fields */}
        <div style={{
          flex: 1, padding: '20px 20px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14,
          borderRight: '1px solid var(--border)',
        }}>
          {/* Current Qty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 90, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
              Current Qty
            </span>
            <div style={fieldBox(item.qty, false)}>{item.qty}</div>
          </div>

          {/* New Qty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 90, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
              New Qty
            </span>
            <div style={{ ...fieldBox(newQty, true), color: newQty ? 'var(--text-1)' : 'var(--text-4)' }}>
              {newQty || <span style={{ fontWeight: 500, fontSize: 12 }}>Enter qty…</span>}
            </div>
          </div>
        </div>

        {/* Right: numpad */}
        <div style={{ width: 210, flexShrink: 0, padding: '16px 14px' }}>
          <Numpad
            onKey={handleKey}
            showDot={true}
            showClear={true}
            showBackspace={false}
            btnHeight={44}
            fontSize={16}
            gap={6}
            extraRows={[[
              {
                label: 'Done',
                flex: 2,
                style: {
                  background: parsed > 0
                    ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                    : 'var(--border)',
                  color: parsed > 0 ? '#fff' : 'var(--text-4)',
                  border: 'none',
                  fontSize: 13,
                  boxShadow: parsed > 0 ? '0 4px 12px rgba(120,8,41,0.2)' : 'none',
                },
                onClick: handleDone,
              },
              {
                label: 'Cancel',
                flex: 1,
                style: {
                  background: 'var(--red-bg)',
                  color: 'var(--red)',
                  borderColor: 'var(--red-border)',
                  fontSize: 13,
                },
                onClick: onClose,
              },
            ]]}
          />
        </div>

      </div>
    </Modal>
  )
}
