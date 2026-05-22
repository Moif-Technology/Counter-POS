import { useEffect, useRef, useState } from 'react'
import { X, Delete } from 'lucide-react'

const DEMO_CUSTOMERS = [
  { no: '1001', code: 'PC001', name: 'Ahmed Al Rashidi',    discount: 10 },
  { no: '1002', code: 'PC002', name: 'Fatima Al Balushi',   discount: 15 },
  { no: '1003', code: 'PC003', name: 'Mohammed Al Wahaibi', discount: 5  },
  { no: '1004', code: 'PC004', name: 'Sara Al Hinai',       discount: 10 },
  { no: '1005', code: 'PC005', name: 'Khalid Al Farsi',     discount: 3  },
  { no: '1006', code: 'PC006', name: 'Layla Al Siyabi',     discount: 8  },
  { no: '1007', code: 'PC007', name: 'Omar Al Maqbali',     discount: 5  },
]

const NUM_KEYS = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
]

export default function PrivilegeCustomerModal({ onClose, onApply }) {
  const [customerNo,   setCustomerNo]   = useState('')
  const [customerCode, setCustomerCode] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedIdx,  setSelectedIdx]  = useState(-1)
  const [focus,        setFocus]        = useState('no') // 'no' | 'code' | 'name'
  const overlayRef = useRef()
  const listRef    = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const selectRow = (c, idx) => {
    setSelectedIdx(idx)
    setCustomerNo(c.no)
    setCustomerCode(c.code)
    setCustomerName(c.name)
  }

  const pressKey = k => {
    const setter = focus === 'no' ? setCustomerNo : focus === 'code' ? setCustomerCode : setCustomerName
    if (k === '⌫') { setter(v => v.slice(0, -1)); return }
    setter(v => v + k)
  }

  const handleApply = () => {
    if (selectedIdx < 0) return
    onApply?.(DEMO_CUSTOMERS[selectedIdx])
    onClose()
  }

  const fieldStyle = active => ({
    width: '100%', height: 34, boxSizing: 'border-box',
    padding: '0 10px', borderRadius: 6, outline: 'none', fontSize: 13,
    fontWeight: 600, color: 'var(--text-1)',
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand-bg)' : '#fff',
    transition: 'border-color 0.15s',
    fontFamily: "'JetBrains Mono', monospace",
  })

  const numBtnStyle = {
    flex: 1, height: 46, borderRadius: 8,
    border: '1.5px solid var(--border)', background: '#fff',
    fontSize: 16, fontWeight: 700, color: 'var(--text-1)',
    cursor: 'pointer', transition: 'all 0.1s',
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.4)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pc-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes pc-fade  { from{opacity:0} to{opacity:1} }
        @keyframes pc-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @media (max-width: 640px) {
          .pc-body { flex-direction: column !important; }
          .pc-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; min-height: 180px; }
          .pc-right { width: 100% !important; padding: 12px !important; }
        }
      `}</style>

      <div style={{
        width: 680, maxWidth: '96vw',
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'pc-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Privilege Customer Selection</span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="pc-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── Left: customer list ── */}
          <div className="pc-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden', padding: '12px' }}>
            {/* Table with outer border + curved corners */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              border: '1.5px solid var(--brand-border)', borderRadius: 10,
            }}>
              {/* Heading */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 2fr',
                background: 'var(--brand-bg)', borderBottom: '1.5px solid var(--brand-border)',
                padding: '8px 12px', flexShrink: 0,
                borderRadius: '8px 8px 0 0',
              }}>
                {['Customer No', 'Customer Code', 'Customer Name'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div ref={listRef} style={{ flex: 1, overflowY: 'auto', borderRadius: '0 0 8px 8px' }}>
                {DEMO_CUSTOMERS.map((c, i) => {
                  const isActive = selectedIdx === i
                  const isLast   = i === DEMO_CUSTOMERS.length - 1
                  return (
                    <div
                      key={c.no}
                      onClick={() => selectRow(c, i)}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 2fr',
                        padding: '9px 12px', cursor: 'pointer',
                        borderBottom: isLast ? 'none' : '1px solid var(--border)',
                        background: isActive ? 'rgba(107,0,0,0.06)' : '#fff',
                        borderLeft: `3px solid ${isActive ? 'var(--brand)' : 'transparent'}`,
                        transition: 'background 0.1s',
                        borderRadius: isLast ? '0 0 8px 8px' : 0,
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#fff' }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: "'JetBrains Mono', monospace", fontWeight: isActive ? 700 : 500 }}>{c.no}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace", fontWeight: isActive ? 700 : 500 }}>{c.code}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: isActive ? 700 : 500 }}>{c.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Right: inputs + numpad ── */}
          <div className="pc-right" style={{ width: 260, display: 'flex', flexDirection: 'column', padding: '14px 14px 0', gap: 10, flexShrink: 0 }}>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Customer No :',   value: customerNo,   key: 'no'   },
                { label: 'Customer Code :', value: customerCode, key: 'code' },
                { label: 'Customer Name :', value: customerName, key: 'name' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', display: 'block', marginBottom: 3 }}>{f.label}</label>
                  <input
                    readOnly
                    value={f.value}
                    onMouseDown={() => setFocus(f.key)}
                    style={fieldStyle(focus === f.key)}
                  />
                </div>
              ))}
            </div>

            {/* Numpad */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {NUM_KEYS.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 5 }}>
                  {row.map(k => (
                    <button
                      key={k}
                      onClick={() => pressKey(k)}
                      style={numBtnStyle}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' }}
                      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                    >{k}</button>
                  ))}
                </div>
              ))}
              {/* Bottom row: 0 · ⌫ */}
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => pressKey('0')} style={{ ...numBtnStyle, flex: 2 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >0</button>
                <button onClick={() => pressKey('.')} style={numBtnStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >.</button>
                <button onClick={() => pressKey('⌫')}
                  style={{ ...numBtnStyle, background: 'var(--red-bg)', borderColor: 'var(--red-border)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.93)' }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                ><Delete size={15} /></button>
              </div>
            </div>

            {/* Footer buttons inside right panel */}
            <div style={{ display: 'flex', gap: 6, paddingBottom: 14, marginTop: 'auto' }}>
              <button
                onClick={handleApply}
                disabled={selectedIdx < 0}
                style={{
                  flex: 1, height: 36, borderRadius: 8, border: 'none',
                  background: selectedIdx >= 0 ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--border)',
                  color: selectedIdx >= 0 ? '#fff' : 'var(--text-4)',
                  fontSize: 12, fontWeight: 700, cursor: selectedIdx >= 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => { if (selectedIdx >= 0) e.currentTarget.style.filter = 'brightness(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
              >Apply</button>
              <button
                onClick={onClose}
                style={{
                  flex: 1, height: 36, borderRadius: 8,
                  border: '1.5px solid var(--border)', background: '#fff',
                  color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
              >Close</button>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
