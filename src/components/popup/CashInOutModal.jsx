import { useEffect, useRef, useState } from 'react'
import { X, Wallet, Banknote, Save, Trash2, Keyboard, Loader2, AlertCircle } from 'lucide-react'
import Numpad from '../ui/Numpad'
import TouchKeyboard from '../ui/TouchKeyboard'
import { api } from '../../lib/api'
import { usePosStore } from '../../store/posStore'

const IN_CATEGORIES  = ['Cash', 'Petty Cash']
const OUT_CATEGORIES = ['Cash', 'Expense From Cash Counter']

export default function CashInOutModal({ onClose }) {
  const [step,     setStep]     = useState('choose')
  const [type,     setType]     = useState(null)
  const [typeDesc, setTypeDesc] = useState('')
  const [category, setCategory] = useState('')
  const [amount,   setAmount]   = useState('')
  const [entries,      setEntries]      = useState([])
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState(null)
  const descRef    = useRef()
  const overlayRef = useRef()
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)

  const categories = type === 'in' ? IN_CATEGORIES : OUT_CATEGORIES
  const isIn       = type === 'in'
  const accent       = isIn ? 'var(--green)'        : 'var(--red)'
  const accentBg     = isIn ? 'var(--green-bg)'     : 'var(--red-bg)'
  const accentBorder = isIn ? 'var(--green-border)' : 'var(--red-border)'
  const totalAmount  = entries.reduce((s, e) => s + parseFloat(e.amount), 0).toFixed(3)
  const parsed       = parseFloat(amount) || 0

  useEffect(() => {
    if (step === 'entry') { setCategory(categories[0]); setTimeout(() => descRef.current?.focus(), 50) }
  }, [step])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        if (step === 'entry') { setStep('choose'); setTypeDesc(''); setCategory(''); setAmount(''); setEntries([]) }
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step])

  const choose = t => { setType(t); setStep('entry') }

  const handleKey = k => {
    if (k === 'C')  { setAmount(''); return }
    if (k === '⌫') { setAmount(v => v.slice(0, -1)); return }
    if (k === '.' && amount.includes('.')) return
    setAmount(v => v + k)
  }

  const handleKbKey = k => {
    if (k === '⌫')    { setTypeDesc(v => v.slice(0, -1)); return }
    if (k === 'ENTER') { handleEnter(); return }
    setTypeDesc(v => v + k)
  }

  const handleEnter = () => {
    if (parsed <= 0) return
    setEntries(prev => [...prev, {
      id:          Date.now(),
      accountName: typeDesc.trim() || category,
      category,
      amount:      parsed.toFixed(3),
    }])
    setAmount('')
    setTypeDesc('')
    descRef.current?.focus()
  }

  const removeEntry = id => setEntries(prev => prev.filter(e => e.id !== id))

  const handleSave = async () => {
    if (!entries.length || saving) return
    setSaving(true)
    setError(null)
    try {
      const transactionType = isIn ? 'CASH_IN' : 'CASH_OUT'
      for (const e of entries) {
        const remarks = [e.category, e.accountName].filter(Boolean).join(' — ')
        await api.counterPos.addCashInOut({
          counterNo,
          transactionType,
          amount: parseFloat(e.amount),
          remarks: remarks || null,
        }, accessToken)
      }
      onClose()
    } catch (err) {
      setError(err.message ?? 'Failed to save cash in/out')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.45)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'cio-fade 0.15s ease',
      }}
    >
      <style>{`
        @keyframes cio-fade  { from{opacity:0} to{opacity:1} }
        @keyframes cio-slide { from{opacity:0;transform:scale(0.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes cio-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .cio-card { transition: transform 0.18s ease, box-shadow 0.18s ease !important; }
        .cio-card:hover { transform: translateY(-5px) scale(1.03) !important; box-shadow: 0 20px 48px rgba(0,0,0,0.16) !important; }
        .cio-card:active { transform: scale(0.97) !important; }
        .cat-btn:hover { filter: brightness(0.93); transform: scale(0.98); }
        .cat-btn:active { transform: scale(0.95); }
        .entry-row:hover .del-btn { opacity: 1 !important; }
        @media (max-width: 640px) {
          .cio-body { flex-direction: column !important; overflow-y: auto !important; }
          .cio-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; min-height: 200px; }
          .cio-right { width: 100% !important; }
        }
      `}</style>

      {/* ════════════════════ STEP 1 : CHOOSE ════════════════════ */}
      {step === 'choose' && (
        <div style={{
          width: 460, maxWidth: '96vw',
          background: '#fff', borderRadius: 24,
          boxShadow: '0 28px 72px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          animation: 'cio-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wallet size={16} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>Transaction</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>Cash In / Cash Out</p>
              </div>
            </div>
            <button onClick={onClose} style={closeBtn}>
              <X size={14} />
            </button>
          </div>

          {/* Cards */}
          <div style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 16 }}>

              <button className="cio-card" onClick={() => choose('in')} style={{
                flex: 1, padding: '26px 14px', borderRadius: 16,
                border: '1.5px solid var(--green-border)', background: 'var(--green-bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 18,
                  background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Wallet size={32} color="var(--green)" strokeWidth={1.6} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>Cash IN</p>
                  <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', marginTop: 3 }}>Receive cash into counter</p>
                </div>
              </button>

              <button className="cio-card" onClick={() => choose('out')} style={{
                flex: 1, padding: '26px 14px', borderRadius: 16,
                border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 18,
                  background: 'rgba(239,68,68,0.10)', border: '2px solid rgba(239,68,68,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Banknote size={32} color="var(--red)" strokeWidth={1.6} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)' }}>Cash OUT</p>
                  <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', marginTop: 3 }}>Dispense cash from counter</p>
                </div>
              </button>

            </div>

            <button onClick={onClose} style={{
              height: 40, borderRadius: 10, border: '1.5px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text-2)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════ STEP 2 : ENTRY FORM ════════════════════ */}
      {step === 'entry' && (
        <div style={{
          width: 820, maxWidth: '97vw', maxHeight: '92vh',
          background: '#fff', borderRadius: 24,
          boxShadow: '0 28px 72px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          animation: 'cio-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
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
                {isIn ? <Wallet size={16} color="#fff" /> : <Banknote size={16} color="#fff" />}
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {isIn ? 'Cash In Entry' : 'Cash Out Entry'}
                </p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {isIn ? 'Cash IN Entry' : 'Cash Out Entry'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => { setStep('choose'); setTypeDesc(''); setCategory(''); setAmount(''); setEntries([]) }}
                style={{
                  height: 28, paddingInline: 12, borderRadius: 7, fontSize: 11, fontWeight: 700,
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
              >
                ← Back
              </button>
              <button onClick={onClose} style={closeBtn}><X size={14} /></button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="cio-body" style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

            {error && (
              <div style={{
                position: 'absolute', left: 16, right: 16, top: 72, zIndex: 2,
                padding: '8px 12px', borderRadius: 9,
                border: '1px solid var(--red-border)', background: 'var(--red-bg)',
                color: 'var(--red)', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            {/* LEFT — description + table */}
            <div className="cio-left" style={{ flex: 1, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid var(--border)', overflow: 'hidden' }}>

              {/* Type Description row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  Type Description :
                </span>
                <input
                  ref={descRef}
                  value={typeDesc}
                  onChange={e => setTypeDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEnter() }}
                  placeholder="Enter description…"
                  style={{
                    flex: 1, height: 34, borderRadius: 8, padding: '0 10px',
                    border: '1.5px solid var(--border)', background: 'var(--surface)',
                    fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
                    outline: 'none', transition: 'border-color 0.12s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'var(--brand-bg)' }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.background = 'var(--surface)' }}
                />
                <button
                  onClick={() => setKeyboardOpen(o => !o)}
                  style={{
                    width: 36, height: 34, borderRadius: 8, flexShrink: 0,
                    border: `1.5px solid ${keyboardOpen ? 'var(--brand)' : 'var(--border)'}`,
                    background: keyboardOpen ? 'var(--brand-bg)' : 'var(--surface)',
                    color: keyboardOpen ? 'var(--brand)' : 'var(--text-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.14s',
                  }}
                  onMouseEnter={e => { if (!keyboardOpen) { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' } }}
                  onMouseLeave={e => { if (!keyboardOpen) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' } }}
                  title="On-screen keyboard"
                >
                  <Keyboard size={15} />
                </button>
              </div>

              {/* Entries table */}
              <div style={{
                flex: 1, overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.18)', borderRadius: 10,
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Heading */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 36px',
                  padding: '8px 12px',
                  background: 'var(--brand-bg)', borderBottom: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: '9px 9px 0 0', flexShrink: 0,
                }}>
                  <span style={headCell}>Account Name</span>
                  <span style={{ ...headCell, textAlign: 'right' }}>{isIn ? 'Cash In Amount' : 'Cash Out Amount'}</span>
                  <span />
                </div>
                {/* Rows */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {entries.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>
                      No entries yet — enter an amount and press Enter
                    </div>
                  ) : entries.map((e, i) => (
                    <div
                      key={e.id}
                      className="entry-row"
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 120px 36px',
                        padding: '8px 12px', alignItems: 'center',
                        borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                        borderLeft: `3px solid ${accent}`,
                        background: i % 2 === 0 ? '#fff' : 'var(--surface)',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{e.accountName}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-4)', marginLeft: 6 }}>{e.category}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: accent, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                        {e.amount}
                      </span>
                      <button
                        className="del-btn"
                        onClick={() => removeEntry(e.id)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, border: 'none',
                          background: 'var(--red-bg)', color: 'var(--red)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s',
                          marginLeft: 'auto',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — category buttons + amount + numpad */}
            <div className="cio-right" style={{ width: 232, flexShrink: 0, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Category preset buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className="cat-btn"
                    onClick={() => setCategory(cat)}
                    style={{
                      height: 36, borderRadius: 8, fontSize: 11, fontWeight: 700,
                      border: `1.5px solid ${category === cat ? accentBorder : 'var(--border)'}`,
                      background: category === cat ? accentBg : 'var(--surface)',
                      color: category === cat ? accent : 'var(--text-2)',
                      cursor: 'pointer', transition: 'all 0.12s',
                      textAlign: 'center', letterSpacing: 0.3,
                    }}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

              {/* Amount display */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.7, textTransform: 'uppercase' }}>Amount</span>
                <div style={{
                  height: 44, borderRadius: 9,
                  border: `1.5px solid ${amount ? accent : 'var(--border)'}`,
                  background: amount ? accentBg : 'var(--surface)',
                  display: 'flex', alignItems: 'center', padding: '0 12px',
                  fontSize: 20, fontWeight: 800,
                  color: amount ? accent : 'var(--text-4)',
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                  {amount || <span style={{ fontSize: 13, fontWeight: 500 }}>0.000</span>}
                </div>
              </div>

              {/* Numpad */}
              <Numpad
                onKey={handleKey}
                showDot={true}
                showClear={true}
                showBackspace={true}
                btnHeight={38}
                fontSize={15}
                gap={5}
                extraRows={[[{
                  label: 'Enter',
                  flex: 1,
                  style: {
                    background: parsed > 0
                      ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                      : 'var(--border)',
                    color: parsed > 0 ? '#fff' : 'var(--text-4)',
                    border: 'none', fontSize: 13, fontWeight: 800,
                    boxShadow: parsed > 0 ? '0 4px 12px rgba(107,0,0,0.2)' : 'none',
                  },
                  onClick: handleEnter,
                }]]}
              />
            </div>
          </div>

          {/* ── Touch Keyboard ── */}
          {keyboardOpen && (
            <TouchKeyboard
              onKey={handleKbKey}
              onClose={() => setKeyboardOpen(false)}
            />
          )}

          {/* ── Footer ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
          }}>
            {/* Total */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>Total Amount :</span>
              <div style={{
                height: 34, paddingInline: 16, borderRadius: 8,
                background: entries.length ? accentBg : 'var(--surface)',
                border: `1.5px solid ${entries.length ? accentBorder : 'var(--border)'}`,
                display: 'flex', alignItems: 'center',
                fontSize: 16, fontWeight: 800,
                color: entries.length ? accent : 'var(--text-4)',
                fontFamily: "'JetBrains Mono', monospace",
                minWidth: 110,
              }}>
                {totalAmount}
              </div>
              {entries.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 600 }}>
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!entries.length || saving}
              style={{
                height: 38, paddingInline: 22, borderRadius: 10, border: 'none',
                background: entries.length && !saving
                  ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)'
                  : 'var(--border)',
                color: entries.length && !saving ? '#fff' : 'var(--text-4)',
                fontSize: 13, fontWeight: 800, cursor: entries.length && !saving ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: entries.length && !saving ? '0 4px 14px rgba(107,0,0,0.2)' : 'none',
                transition: 'filter 0.12s, transform 0.08s',
                opacity: saving ? 0.8 : 1,
              }}
              onMouseEnter={e => { if (entries.length && !saving) e.currentTarget.style.filter = 'brightness(1.08)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
              onMouseDown={e => { if (entries.length && !saving) e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {saving
                ? <><Loader2 size={14} style={{ animation: 'cio-spin 0.8s linear infinite' }} /> Saving…</>
                : <><Save size={14} /> Save</>}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              style={{
                height: 38, paddingInline: 20, borderRadius: 10,
                border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                color: 'var(--red)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Close
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

const closeBtn = {
  width: 32, height: 32, borderRadius: 9,
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
}

const headCell = {
  fontSize: 10, fontWeight: 700,
  color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.5,
}
