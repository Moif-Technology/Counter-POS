import { useEffect, useRef, useState } from 'react'
import { X, Ban, Loader2 } from 'lucide-react'
import { fmtMoney } from '../lib/currencyFormat'

const inputStyle = {
  width: '100%', height: 38, boxSizing: 'border-box',
  borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff',
  padding: '0 10px', fontSize: 13, color: 'var(--text-1)', outline: 'none',
}

/**
 * Bill / item cancellation form: mandatory reason + optional supervisor code & PIN.
 * The server accepts the request without a supervisor only when the logged-in
 * staff's role has the bill-cancel permission (pos.billing.delete).
 * onSubmit({ reason, supervisorCode, supervisorPin }) must return a promise.
 */
export default function VoidBillDialog({ title, subtitle, amount, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [supervisorCode, setSupervisorCode] = useState('')
  const [supervisorPin, setSupervisorPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const overlayRef = useRef()
  const reasonRef = useRef()

  useEffect(() => {
    reasonRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const canSubmit = reason.trim().length >= 3 && !saving

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        reason: reason.trim(),
        supervisorCode: supervisorCode.trim() || undefined,
        supervisorPin: supervisorPin.trim() || undefined,
      })
    } catch (e) {
      setError(e.message ?? 'Cancellation failed')
      setSaving(false)
    }
  }

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && !saving && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(15,13,10,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 420, maxWidth: '94vw', background: '#fff', borderRadius: 18,
        boxShadow: '0 32px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{
          background: 'var(--red)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
            <Ban size={16} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
              {subtitle && <div style={{ fontSize: 11, opacity: 0.8 }}>{subtitle}</div>}
            </div>
          </div>
          <button onClick={onClose} disabled={saving} style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {amount != null && (
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
              Amount: <span style={{ color: 'var(--red)' }}>{fmtMoney(amount)}</span>
            </div>
          )}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
              Reason *
            </label>
            <input
              ref={reasonRef}
              value={reason}
              maxLength={200}
              onChange={e => setReason(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="Why is this being cancelled?"
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.4 }}>
            Supervisor approval — needed unless your login is allowed to cancel bills.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input
              value={supervisorCode}
              onChange={e => setSupervisorCode(e.target.value)}
              placeholder="Supervisor code"
              autoComplete="off"
              style={inputStyle}
            />
            <input
              value={supervisorPin}
              onChange={e => setSupervisorPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="PIN"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              style={inputStyle}
            />
          </div>
          {error && (
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>{error}</div>
          )}
        </div>

        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onClose} disabled={saving} style={{
            height: 34, padding: '0 16px', borderRadius: 9, border: '1.5px solid var(--border)',
            background: '#fff', color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Back
          </button>
          <button onClick={submit} disabled={!canSubmit} style={{
            height: 34, padding: '0 16px', borderRadius: 9, border: 'none',
            background: canSubmit ? 'var(--red)' : 'var(--surface-3)',
            color: canSubmit ? '#fff' : 'var(--text-4)',
            fontSize: 12, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {saving && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
