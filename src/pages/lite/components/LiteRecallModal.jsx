import { useEffect, useRef, useState } from 'react'
import { X, Archive, RotateCcw, Trash2, MessageSquare } from 'lucide-react'
import { fmtMoney, moneyPlaceholder } from '../../../lib/currencyFormat'
import { posConfirm } from '../../../lib/posNotify'

function fmtDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const ITEM_COLS = [
  { key: 'sl', label: 'SL', w: 36, align: 'center' },
  { key: 'description', label: 'Description', flex: true },
  { key: 'qty', label: 'Qty', w: 48, align: 'center' },
  { key: 'unitPrice', label: 'Unit', w: 70, align: 'right', money: true },
  { key: 'lineTotal', label: 'Total', w: 72, align: 'right', money: true },
]

/** Lite equivalent of RecallHoldModal — same list/select/restore UX,
 *  backed by the in-memory heldBills array instead of the server. */
export default function LiteRecallModal({ heldBills, onClose, onRecall, onCancelHold }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [holdNoInput, setHoldNoInput] = useState('')
  const [cancelling, setCancelling] = useState(null)
  const overlayRef = useRef()
  const holdInputRef = useRef()

  const selected = heldBills[selectedIdx] ?? null
  const selectedComment = String(selected?.comment ?? '').trim()

  useEffect(() => {
    holdInputRef.current?.focus()
    const onKey = e => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowUp') moveSelection(-1)
      if (e.key === 'ArrowDown') moveSelection(1)
      if (e.key === 'Enter') handleRecall()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIdx, heldBills])

  function moveSelection(dir) {
    setSelectedIdx(i => Math.max(0, Math.min(heldBills.length - 1, i + dir)))
  }

  function handleRecall(hold = selected) {
    if (!hold) return
    onRecall(hold)
    onClose()
  }

  async function handleCancel(hold) {
    if (!hold || cancelling) return
    const ok = await posConfirm({
      title: 'Cancel Hold',
      message: `Cancel hold ${hold.holdNo}? This cannot be undone.`,
      confirmLabel: 'Cancel Hold',
      cancelLabel: 'Keep',
      danger: true,
    })
    if (!ok) return
    setCancelling(hold.id)
    onCancelHold(hold)
    setSelectedIdx(i => Math.max(0, Math.min(heldBills.length - 2, i)))
    setCancelling(null)
  }

  const thStyle = (col) => ({
    width: col.w, flex: col.flex ? 1 : undefined, flexShrink: 0,
    fontSize: 10, fontWeight: 700, color: 'var(--brand)',
    textTransform: 'uppercase', letterSpacing: 0.5,
    textAlign: col.align || 'left', paddingRight: 6,
  })

  const tdStyle = (col) => ({
    width: col.w, flex: col.flex ? 1 : undefined, flexShrink: 0,
    fontSize: 11.5, color: 'var(--text-1)', textAlign: col.align || 'left',
    paddingRight: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  })

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.42)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div className="lite-scroll" style={{
        width: 900, maxWidth: '96vw', height: 620, maxHeight: '88vh',
        background: 'var(--surface)', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Archive size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Bills</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Recall Hold</p>
            </div>
          </div>
          <button
            type="button" className="lite-btn" onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '0 12px', height: 34, flexShrink: 0,
              background: 'var(--brand-bg)', borderBottom: '1.5px solid var(--brand-border)',
            }}>
              {[
                { label: 'Hold No', w: 52 },
                { label: 'Time', w: 100 },
                { label: 'Customer', w: 100 },
                { label: 'Comments', flex: true },
              ].map(col => (
                <div key={col.label} style={{
                  width: col.w, flex: col.flex ? 1 : undefined, flexShrink: 0,
                  fontSize: 10, fontWeight: 700, color: 'var(--brand)',
                  textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 6,
                }}>{col.label}</div>
              ))}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="lite-scroll">
              {heldBills.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 12, fontWeight: 600 }}>
                  No held bills
                </div>
              ) : heldBills.map((h, i) => {
                const active = i === selectedIdx
                const comment = String(h.comment ?? '').trim()
                return (
                  <div
                    key={h.id}
                    className="lite-btn"
                    onClick={() => setSelectedIdx(i)}
                    title={comment || undefined}
                    style={{
                      display: 'flex', alignItems: 'center', cursor: 'pointer',
                      padding: '0 12px', height: 36,
                      borderBottom: '1px solid var(--border)',
                      background: active ? 'var(--brand-bg)' : 'transparent',
                      borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: 52, flexShrink: 0, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--brand)' : 'var(--text-1)' }}>
                      {h.holdNo}
                    </div>
                    <div style={{ width: 100, flexShrink: 0, fontSize: 11, color: active ? 'var(--brand)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>
                      {fmtDateTime(h.heldAt)}
                    </div>
                    <div
                      title={h.customerName || 'Walk-in'}
                      style={{
                        width: 100, flexShrink: 0, fontSize: 11,
                        fontWeight: h.customerName ? 600 : 400,
                        color: active ? 'var(--brand)' : h.customerName ? 'var(--text-2)' : 'var(--text-4)',
                        fontStyle: h.customerName ? 'normal' : 'italic',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6,
                      }}
                    >
                      {h.customerName || 'Walk-in'}
                    </div>
                    <div style={{
                      flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 10.5, color: comment ? (active ? 'var(--brand)' : 'var(--text-2)') : 'var(--text-4)',
                      fontStyle: comment ? 'normal' : 'italic',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {comment ? (<><MessageSquare size={11} style={{ flexShrink: 0, opacity: 0.7 }} /><span>{comment}</span></>) : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '0 12px', height: 34, flexShrink: 0,
              background: 'var(--brand-bg)', borderBottom: '1.5px solid var(--brand-border)',
            }}>
              {ITEM_COLS.map(col => (<div key={col.key} style={thStyle(col)}>{col.label}</div>))}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="lite-scroll">
              {selected && selected.cartItems.length > 0 ? selected.cartItems.map((item, i) => (
                <div
                  key={item._key ?? i}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 12px', height: 34,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {ITEM_COLS.map(col => (
                    <div key={col.key} style={tdStyle(col)}>
                      {col.key === 'sl' ? i + 1 : col.money ? fmtMoney(item[col.key]) : item[col.key] ?? '-'}
                    </div>
                  ))}
                </div>
              )) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', minHeight: 120, color: 'var(--text-4)', fontSize: 12, fontWeight: 500,
                }}>
                  {selected ? 'No items on this bill' : 'Select a hold bill'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderTop: '1.5px solid var(--border)',
          background: 'var(--surface-2)', flexShrink: 0, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 160 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Comments</span>
            <input
              readOnly
              value={selectedComment}
              placeholder={selected ? 'No comment on this hold' : 'Select a hold bill'}
              style={{
                height: 36, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)',
                padding: '0 10px', fontSize: 12, color: selectedComment ? 'var(--text-1)' : 'var(--text-4)',
                fontFamily: 'inherit', outline: 'none', fontStyle: selectedComment ? 'normal' : 'italic',
              }}
            />
          </div>

          <button
            type="button" className="lite-btn"
            onClick={() => handleRecall()}
            disabled={!selected}
            style={{
              height: 40, padding: '0 20px', borderRadius: 8, border: 'none',
              background: selected ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--surface-3)',
              color: selected ? '#fff' : 'var(--text-4)', fontSize: 12, fontWeight: 800,
              cursor: selected ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <RotateCcw size={13} /> Recall
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 90 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Hold No</span>
            <input
              ref={holdInputRef}
              value={holdNoInput}
              onChange={e => {
                const raw = e.target.value
                setHoldNoInput(raw)
                const idx = heldBills.findIndex(h => String(h.holdNo) === raw.trim())
                if (idx >= 0) setSelectedIdx(idx)
              }}
              onKeyDown={e => e.key === 'Enter' && handleRecall()}
              placeholder={selected?.holdNo != null ? String(selected.holdNo) : '-'}
              style={{
                height: 36, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)',
                padding: '0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text-1)',
                outline: 'none', textAlign: 'center',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Bill Total</span>
            <div style={{
              height: 36, minWidth: 100, borderRadius: 8,
              border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
              padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--brand)' }}>
                {selected ? fmtMoney(selected.amount) : moneyPlaceholder()}
              </span>
            </div>
          </div>

          <button
            type="button" className="lite-btn"
            onClick={() => selected && handleCancel(selected)}
            disabled={!selected || cancelling === selected?.id}
            style={{
              height: 40, padding: '0 16px', borderRadius: 8,
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 12, fontWeight: 700,
              cursor: selected ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: cancelling === selected?.id ? 0.6 : 1,
            }}
          >
            <Trash2 size={12} /> Cancel Hold
          </button>

          <button
            type="button" className="lite-btn" onClick={onClose}
            style={{
              height: 40, padding: '0 16px', borderRadius: 8,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
