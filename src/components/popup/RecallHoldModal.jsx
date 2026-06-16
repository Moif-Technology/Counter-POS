import { useEffect, useRef, useState } from 'react'
import { X, Archive, RotateCcw, Trash2, AlertCircle, MessageSquare } from 'lucide-react'
import { api } from '../../lib/api'
import { usePosStore } from '../../store/posStore'

const ITEM_COLS = [
  { key: 'sl', label: 'SL', w: 36, align: 'center' },
  { key: 'product_code', label: 'Barcode', w: 110 },
  { key: 'short_description', label: 'Short Description', flex: true },
  { key: 'qty', label: 'Qty', w: 48, align: 'center' },
  { key: 'unit_price', label: 'Unit', w: 70, align: 'right', money: true },
  { key: 'discount_amount', label: 'Disc', w: 50, align: 'right', money: true },
  { key: 'line_total', label: 'Total', w: 72, align: 'right', money: true },
]

function fmt(n) {
  const value = Number(n)
  return Number.isFinite(value) ? value.toFixed(3) : '0.000'
}

function fmtDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getSalesMan(hold) {
  return hold.staff_name || hold.sales_man || hold.staff_code || hold.staff_id || ''
}

function getCustomerLabel(hold) {
  return hold.customer_name || hold.customer_code || (hold.customer_id ? `#${hold.customer_id}` : 'Walk-in')
}

function getHoldComment(hold) {
  return String(hold?.remarks ?? '').trim()
}

export default function RecallHoldModal({ onClose, onRecall }) {
  const [holds, setHolds] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [holdNoInput, setHoldNoInput] = useState('')
  const [itemsBySalesId, setItemsBySalesId] = useState({})
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [recalling, setRecalling] = useState(false)
  const [cancelling, setCancelling] = useState(null)
  const [error, setError] = useState(null)
  const overlayRef = useRef()
  const holdInputRef = useRef()
  const accessToken = usePosStore(s => s.accessToken)
  const recallHold = usePosStore(s => s.recallHold)

  const selected = holds[selectedIdx] ?? null
  const selectedItems = selected ? itemsBySalesId[selected.sales_id] || [] : []
  const selectedComment = getHoldComment(selected)

  useEffect(() => {
    holdInputRef.current?.focus()
    const onKey = e => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowUp') moveSelection(-1)
      if (e.key === 'ArrowDown') moveSelection(1)
      if (e.key === 'Enter') handleRecall()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIdx, holds, selectedItems, recalling])

  useEffect(() => {
    fetchHolds()
  }, [])

  useEffect(() => {
    if (selected?.sales_id) fetchItems(selected)
  }, [selected?.sales_id])

  async function fetchHolds() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.counterPos.getHeldBills(accessToken)
      setHolds(Array.isArray(data) ? data : [])
      setSelectedIdx(0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchItems(hold) {
    if (!hold?.sales_id || itemsBySalesId[hold.sales_id]) return itemsBySalesId[hold.sales_id] || []

    setItemsLoading(true)
    setError(null)
    try {
      const items = await api.counterPos.recallBill(hold.sales_id, accessToken)
      const safeItems = Array.isArray(items) ? items : []
      setItemsBySalesId(prev => ({ ...prev, [hold.sales_id]: safeItems }))
      return safeItems
    } catch (e) {
      setError(e.message)
      return []
    } finally {
      setItemsLoading(false)
    }
  }

  function moveSelection(dir) {
    setSelectedIdx(i => Math.max(0, Math.min(holds.length - 1, i + dir)))
  }

  async function handleRecall(hold = selected) {
    if (!hold || recalling) return

    setRecalling(true)
    setError(null)
    try {
      const items = await fetchItems(hold)
      recallHold(hold, items)
      onRecall?.(hold)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setRecalling(false)
    }
  }

  async function handleCancel(hold) {
    if (!hold || cancelling) return
    if (!window.confirm(`Cancel hold H-${hold.hold_no}?`)) return

    setCancelling(hold.sales_id)
    setError(null)
    try {
      await api.counterPos.cancelHold(hold.sales_id, accessToken)
      setHolds(prev => {
        const next = prev.filter(x => x.sales_id !== hold.sales_id)
        setSelectedIdx(i => Math.max(0, Math.min(next.length - 1, i)))
        return next
      })
      setItemsBySalesId(prev => {
        const next = { ...prev }
        delete next[hold.sales_id]
        return next
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setCancelling(null)
    }
  }

  const thStyle = (col) => ({
    width: col.w,
    flex: col.flex ? 1 : undefined,
    flexShrink: 0,
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--brand)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: col.align || 'left',
    paddingRight: 6,
  })

  const tdStyle = (col) => ({
    width: col.w,
    flex: col.flex ? 1 : undefined,
    flexShrink: 0,
    fontSize: 11.5,
    fontWeight: 400,
    color: 'var(--text-1)',
    textAlign: col.align || 'left',
    paddingRight: 6,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
        animation: 'rh-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes rh-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes rh-slide { from { opacity:0; transform:scale(0.96) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
        .rh-hold-row:hover { background: var(--surface-2) !important; }
      `}</style>

      <div style={{
        width: 900,
        maxWidth: '96vw',
        height: 620,
        maxHeight: '88vh',
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        animation: 'rh-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
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
            type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={14} />
          </button>
        </div>

        {error && (
          <div style={{
            margin: '10px 16px 0',
            padding: '8px 12px',
            borderRadius: 9,
            border: '1px solid var(--red-border)',
            background: 'var(--red-bg)',
            color: 'var(--red)',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}>
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <div style={{ width: 440, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '0 12px', height: 34, flexShrink: 0,
              background: 'var(--brand-bg)', borderBottom: '1.5px solid var(--brand-border)',
            }}>
              {[
                { label: 'Hold No',   w: 52 },
                { label: 'Bill Time', w: 100 },
                { label: 'Sales Man', w: 72 },
                { label: 'Customer',  w: 88 },
                { label: 'Comments',  flex: true },
              ].map(col => (
                <div key={col.label} style={{
                  width: col.w, flex: col.flex ? 1 : undefined, flexShrink: 0,
                  fontSize: 10, fontWeight: 700, color: 'var(--brand)',
                  textTransform: 'uppercase', letterSpacing: 0.5, paddingRight: 6,
                }}>{col.label}</div>
              ))}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 12, fontWeight: 600 }}>
                  Loading held bills...
                </div>
              ) : holds.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 12, fontWeight: 600 }}>
                  No held bills
                </div>
              ) : holds.map((h, i) => {
                const active = i === selectedIdx
                const comment = getHoldComment(h)
                return (
                  <div
                    key={h.sales_id}
                    className="rh-hold-row"
                    onClick={() => setSelectedIdx(i)}
                    title={comment || undefined}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '0 12px', height: 34,
                      borderBottom: '1px solid var(--border)',
                      background: active ? 'var(--brand-bg)' : i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                      cursor: 'pointer', transition: 'background 0.1s',
                      borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: 52, flexShrink: 0, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--brand)' : 'var(--text-1)' }}>
                      {h.hold_no}
                    </div>
                    <div style={{ width: 100, flexShrink: 0, fontSize: 11, color: active ? 'var(--brand)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>
                      {fmtDateTime(h.bill_date)}
                    </div>
                    <div style={{ width: 72, flexShrink: 0, fontSize: 10.5, color: active ? 'var(--brand)' : 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>
                      {getSalesMan(h)}
                    </div>
                    <div
                      title={getCustomerLabel(h)}
                      style={{
                        width: 88, flexShrink: 0,
                        fontSize: 11, fontWeight: h.customer_name ? 600 : 400,
                        color: active
                          ? 'var(--brand)'
                          : h.customer_name ? 'var(--text-2)' : 'var(--text-4)',
                        fontStyle: h.customer_name ? 'normal' : 'italic',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        paddingRight: 6,
                      }}
                    >
                      {getCustomerLabel(h)}
                    </div>
                    <div style={{
                      flex: 1, minWidth: 0,
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 10.5,
                      color: comment ? (active ? 'var(--brand)' : 'var(--text-2)') : 'var(--text-4)',
                      fontStyle: comment ? 'normal' : 'italic',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {comment ? (
                        <>
                          <MessageSquare size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                          <span>{comment}</span>
                        </>
                      ) : '—'}
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
              {ITEM_COLS.map(col => (
                <div key={col.key} style={thStyle(col)}>{col.label}</div>
              ))}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {itemsLoading ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', minHeight: 120,
                  color: 'var(--text-4)', fontSize: 12, fontWeight: 600,
                }}>
                  Loading items...
                </div>
              ) : selectedItems.length > 0 ? selectedItems.map((item, i) => (
                <div
                  key={item.sales_child_id ?? i}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 12px', height: 34,
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? '#fff' : 'var(--surface-2)',
                  }}
                >
                  {ITEM_COLS.map(col => (
                    <div key={col.key} style={tdStyle(col)}>
                      {col.key === 'sl' ? i + 1 : col.money ? fmt(item[col.key]) : item[col.key] ?? '-'}
                    </div>
                  ))}
                </div>
              )) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', minHeight: 120,
                  color: 'var(--text-4)', fontSize: 12, fontWeight: 500,
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 180 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Comments</span>
            <input
              readOnly
              value={selectedComment}
              placeholder={selected ? 'No comment on this hold' : 'Select a hold bill'}
              title={selectedComment || undefined}
              style={{
                height: 32, borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                padding: '0 10px', fontSize: 12, color: selectedComment ? 'var(--text-1)' : 'var(--text-4)',
                fontFamily: 'inherit', outline: 'none',
                fontStyle: selectedComment ? 'normal' : 'italic',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'transparent', letterSpacing: 0.7 }}>_</span>
            <button
              type="button"
              onClick={() => handleRecall()}
              disabled={!selected || recalling}
              style={{
                height: 32, padding: '0 20px', borderRadius: 8, border: 'none',
                background: selected
                  ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                  : 'var(--surface-3)',
                color: selected ? '#fff' : 'var(--text-4)',
                fontSize: 12, fontWeight: 800,
                cursor: selected && !recalling ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: selected ? '0 4px 14px rgba(107,0,0,0.22)' : 'none',
                transition: 'all 0.12s',
                opacity: recalling ? 0.7 : 1,
              }}
            >
              <RotateCcw size={13} /> {recalling ? 'Recalling' : 'Recall'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 100 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Hold No</span>
            <input
              ref={holdInputRef}
              value={holdNoInput}
              onChange={e => {
                setHoldNoInput(e.target.value)
                const idx = holds.findIndex(h => String(h.hold_no) === e.target.value)
                if (idx >= 0) setSelectedIdx(idx)
              }}
              onKeyDown={e => e.key === 'Enter' && handleRecall()}
              placeholder={selected?.hold_no ?? '-'}
              style={{
                height: 32, borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                padding: '0 10px', fontSize: 13, fontWeight: 700,
                color: 'var(--text-1)', fontFamily: "'JetBrains Mono', monospace",
                outline: 'none', textAlign: 'center',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Bill Total</span>
            <div style={{
              height: 32, minWidth: 110, borderRadius: 8,
              border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
              padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            }}>
              <span style={{
                fontSize: 15, fontWeight: 800, color: 'var(--brand)',
                fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums',
              }}>
                {selected ? fmt(selected.amount) : '0.000'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'transparent', letterSpacing: 0.7 }}>_</span>
            <button
              type="button"
              onClick={() => selected && handleCancel(selected)}
              disabled={!selected || cancelling === selected?.sales_id}
              style={{
                height: 32, padding: '0 16px', borderRadius: 8,
                border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                color: 'var(--red)', fontSize: 12, fontWeight: 700,
                cursor: selected ? 'pointer' : 'default', transition: 'background 0.1s, color 0.1s',
                opacity: cancelling === selected?.sales_id ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Trash2 size={12} /> Cancel Hold
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 'auto' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'transparent', letterSpacing: 0.7 }}>_</span>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 32, padding: '0 16px', borderRadius: 8,
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-2)', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
