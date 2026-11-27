import { useEffect, useRef, useState } from 'react'
import { X, Ban, Loader2 } from 'lucide-react'
import { fmtMoney } from '../lib/currencyFormat'
import TouchKeyboard from '../components/common/Keyboard'
import Numpad from '../components/common/Numpad'

const inputStyle = {
  width: '100%', height: 38, boxSizing: 'border-box',
  borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff',
  padding: '0 10px', fontSize: 13, color: 'var(--text-1)', outline: 'none',
}

/**
 * Bill / item cancellation form: mandatory reason + admin / supervisor PIN.
 * The server accepts the request without a PIN only when the logged-in
 * staff's role has the bill-cancel permission (pos.billing.delete) or is Admin.
 * onSubmit({ reason, supervisorPin }) must return a promise.
 */
export default function VoidBillDialog({ title, subtitle, amount, needsApproval = true, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [supervisorPin, setSupervisorPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // Which on-screen keypad is open: QWERTY for the reason, digits for the PIN (touch tills have no system keyboard).
  const [pad, setPad] = useState('reason')
  const overlayRef = useRef()
  const reasonRef = useRef()

  useEffect(() => {
    reasonRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const canSubmit = reason.trim().length >= 3 && !saving

  const reasonKey = k => {
    if (k === 'ENTER') return submit()
    if (k === '123') return // layout switch, not a character
    setReason(v => k === '⌫' ? v.slice(0, -1) : (v + k).slice(0, 200))
  }
  const pinKey = k => setSupervisorPin(v => k === 'C' ? '' : k === '⌫' ? v.slice(0, -1) : (v + k).slice(0, 6))

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        reason: reason.trim(),
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
        width: 560, maxWidth: '94vw', background: '#fff', borderRadius: 18,
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
              onFocus={() => setPad('reason')}
              onClick={() => setPad('reason')}
              placeholder="Why is this being cancelled?"
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </div>
          {needsApproval && (<>
          <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.4 }}>
            Your login cannot cancel bills. An admin, or a supervisor allowed to, approves with their PIN.
          </div>
          {/* new-password: Chrome ignores "off" on password fields and autofills the saved login.
              No system keyboard: the on-screen digit pad below covers touch tills. */}
          <input
            value={supervisorPin}
            onChange={e => setSupervisorPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            onFocus={() => setPad('pin')}
            onClick={() => setPad('pin')}
            placeholder="Admin or supervisor PIN"
            aria-label="Admin or supervisor PIN"
            type="password"
            autoComplete="new-password"
            style={inputStyle}
          />
          {pad === 'pin' && (
            <Numpad onKey={pinKey} showDot={false} showClear showBackspace btnHeight={46} fontSize={18} gap={8} />
          )}
          </>)}
          {error && (
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>{error}</div>
          )}
        </div>

        {pad === 'reason' && (
          <TouchKeyboard onKey={reasonKey} onClose={() => setPad(needsApproval ? 'pin' : null)} />
        )}

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
