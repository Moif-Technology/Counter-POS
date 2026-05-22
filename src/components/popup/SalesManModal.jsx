import { useEffect, useRef, useState } from 'react'
import { X, UserCheck, Keyboard, Check } from 'lucide-react'
import Table from '../ui/Table'
import Numpad from '../ui/Numpad'
import TouchKeyboard from '../ui/TouchKeyboard'

const SAMPLE_STAFF = [
  { code: '001', name: 'AHMED ALI' },
  { code: '002', name: 'MOHAMMED HASSAN' },
  { code: '003', name: 'SARA KHAN' },
  { code: '004', name: 'RAVI KUMAR' },
  { code: '005', name: 'SUMON DAS' },
]

const COLUMNS = [
  { key: 'code', label: 'Staff Code', width: 110, mono: true },
  { key: 'name', label: 'Staff Name' },
]

export default function SalesManModal({ onClose, onApply }) {
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffCode,     setStaffCode]     = useState('')
  const [staffName,     setStaffName]     = useState('')
  const [focus,         setFocus]         = useState('code')
  const [keyboardOpen,  setKeyboardOpen]  = useState(false)
  const codeRef    = useRef()
  const nameRef    = useRef()
  const overlayRef = useRef()

  useEffect(() => {
    codeRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleRowClick = row => {
    setSelectedStaff(row)
    setStaffCode(row.code)
    setStaffName(row.name)
  }

  const handleNumKey = k => {
    if (focus !== 'code') return
    if (k === 'C')  { setStaffCode(''); return }
    if (k === '⌫') { setStaffCode(v => v.slice(0, -1)); return }
    if (k === '.')  return
    setStaffCode(v => v + k)
  }

  const handleKbKey = k => {
    if (k === '⌫') {
      if (focus === 'code') setStaffCode(v => v.slice(0, -1))
      else                  setStaffName(v => v.slice(0, -1))
      return
    }
    if (k === 'ENTER') { handleApply(); return }
    if (focus === 'code') setStaffCode(v => v + k)
    else                  setStaffName(v => v + k)
  }

  const handleApply = () => {
    if (!staffCode && !selectedStaff) return
    onApply?.({ code: staffCode, name: staffName })
    onClose()
  }

  const filteredRows = SAMPLE_STAFF.filter(s =>
    (!staffCode || s.code.includes(staffCode)) &&
    (!staffName || s.name.toLowerCase().includes(staffName.toLowerCase()))
  )

  return (
    <div
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.44)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'sm-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes sm-fade  { from{opacity:0} to{opacity:1} }
        @keyframes sm-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      <div style={{
        width: 760, maxWidth: '97vw', maxHeight: '92vh',
        background: '#fff', borderRadius: 24,
        boxShadow: '0 28px 72px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'sm-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCheck size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Staff</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Sales Man Lookup</p>
            </div>
          </div>
          <button
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

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* LEFT — table */}
          <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
            <Table
              columns={COLUMNS}
              rows={filteredRows}
              rowKey="code"
              selected={selectedStaff?.code}
              onRowClick={handleRowClick}
              emptyText="No staff found"
            />
          </div>

          {/* RIGHT — inputs + numpad */}
          <div style={{ width: 252, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Fields */}
            <div style={{ padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Staff Code */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Staff Code</label>
                <input
                  ref={codeRef}
                  value={staffCode}
                  onChange={e => setStaffCode(e.target.value)}
                  onFocus={() => { setFocus('code'); setKeyboardOpen(false) }}
                  placeholder="Enter code…"
                  style={inputStyle(focus === 'code')}
                />
              </div>

              {/* Staff Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Staff Name</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    ref={nameRef}
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    onFocus={() => { setFocus('name'); setKeyboardOpen(true) }}
                    onClick={() => { setFocus('name'); setKeyboardOpen(true) }}
                    placeholder="Tap to type name…"
                    readOnly
                    style={{ ...inputStyle(focus === 'name'), flex: 1, cursor: 'pointer' }}
                  />
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setFocus('name'); setKeyboardOpen(true); nameRef.current?.focus() }}
                    style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      border: `1.5px solid ${keyboardOpen && focus === 'name' ? 'var(--brand)' : 'var(--border)'}`,
                      background: keyboardOpen && focus === 'name' ? 'var(--brand-bg)' : 'var(--surface)',
                      color: keyboardOpen && focus === 'name' ? 'var(--brand)' : 'var(--text-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.14s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                    onMouseLeave={e => { if (!(keyboardOpen && focus === 'name')) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' } }}
                    title="Open keyboard"
                  >
                    <Keyboard size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)', flexShrink: 0, marginInline: 14 }} />

            {/* Numpad */}
            <div style={{ padding: '10px 14px', flex: 1 }}>
              <Numpad
                onKey={handleNumKey}
                showDot={false}
                showClear={true}
                showBackspace={true}
                btnHeight={40}
                fontSize={15}
                gap={5}
              />
            </div>

            {/* Action buttons row */}
            <div style={{ display: 'flex', gap: 6, padding: '0 14px 14px' }}>
              {/* Keyboard toggle */}
              <button
                onClick={() => setKeyboardOpen(o => !o)}
                style={{
                  width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                  border: `1.5px solid ${keyboardOpen ? 'var(--brand)' : 'var(--border)'}`,
                  background: keyboardOpen ? 'var(--brand-bg)' : 'var(--surface)',
                  color: keyboardOpen ? 'var(--brand)' : 'var(--text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.14s',
                }}
                onMouseEnter={e => { if (!keyboardOpen) { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' } }}
                onMouseLeave={e => { if (!keyboardOpen) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' } }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                title="On-screen keyboard"
              >
                <Keyboard size={15} />
              </button>

              {/* Apply */}
              <button
                onClick={handleApply}
                style={{
                  flex: 2, height: 38, borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
                  color: '#fff', fontSize: 12, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: 'pointer', boxShadow: '0 3px 10px rgba(107,0,0,0.2)',
                  transition: 'filter 0.12s, transform 0.08s',
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <Check size={14} /> Apply
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  flex: 1, height: 38, borderRadius: 9,
                  border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                  color: 'var(--red)', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>

        {/* ── Touch Keyboard ── */}
        {keyboardOpen && (
          <TouchKeyboard
            onKey={handleKbKey}
            onClose={() => setKeyboardOpen(false)}
          />
        )}

      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
  letterSpacing: 0.7, textTransform: 'uppercase',
}

const inputStyle = active => ({
  height: 36, borderRadius: 8, padding: '0 10px',
  border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
  background: active ? 'var(--brand-bg)' : '#fff',
  fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none', width: '100%', boxSizing: 'border-box',
  transition: 'border-color 0.12s, background 0.12s',
})
