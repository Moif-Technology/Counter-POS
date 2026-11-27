import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { posNotifySuccess } from '../lib/posNotify'
import { APPROVAL_ACTIONS as ACTIONS, useApproval } from '../lib/supervisorApproval'
import Numpad from '../components/common/Numpad'

/** Supervisor code + PIN for lib/supervisorApproval.requireApproval. Mounted once in App, next to StationLimitHost. */
export function SupervisorApprovalHost() {
  const { action, resolve } = useApproval()
  if (!action) return null
  const close = (ok) => {
    useApproval.setState({ action: null, resolve: null })
    resolve(ok)
  }
  return <SupervisorApprovalDialog action={action} onClose={close} />
}

const inputStyle = {
  width: '100%', height: 40, boxSizing: 'border-box',
  borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff',
  padding: '0 10px', fontSize: 14, color: 'var(--text-1)', outline: 'none',
}

function SupervisorApprovalDialog({ action, onClose }) {
  const rule = ACTIONS[action]
  const cashier = usePosStore(s => s.cashier?.staffName)
  const [supervisorPin, setSupervisorPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const pinRef = useRef(null)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !busy) onClose(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const ready = supervisorPin.length >= 4

  // Touch keypad under the PIN box (digits only, max 6 like the typed input).
  const pressKey = (k) => {
    setSupervisorPin(v => k === 'C' ? '' : k === '⌫' ? v.slice(0, -1) : (v + k).slice(0, 6))
    pinRef.current?.focus()
  }

  async function approve() {
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.counterPos.supervisorApprove(
        { action, supervisorPin },
        usePosStore.getState().accessToken,
      )
      posNotifySuccess(`Approved by ${res.approverName ?? 'supervisor'}`, { title: 'Supervisor', duration: 1200 })
      onClose(true)
    } catch (e) {
      setError(e.offline ? 'No connection — supervisor approval needs the server. Or sign in as a supervisor.' : (e.message ?? 'Approval failed'))
      setSupervisorPin('')
      setBusy(false)
    }
  }

  return (
    <div data-pos-overlay style={{
      position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,13,10,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div role="dialog" aria-modal="true" aria-label={rule.title} style={{
        width: 400, maxWidth: '94vw', background: '#fff', borderRadius: 18,
        boxShadow: '0 32px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{ background: 'var(--brand)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
          <ShieldCheck size={16} />
          <div style={{ fontSize: 15, fontWeight: 800 }}>{rule.title}</div>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.45 }}>
            {cashier ?? 'This cashier'} is not allowed to {rule.verb}. An admin, or a supervisor allowed to, can approve it with their PIN.
          </div>
          {/* new-password: Chrome ignores "off" on password fields and autofills the saved login */}
          <input
            ref={pinRef}
            autoFocus
            data-system-keyboard
            value={supervisorPin}
            onChange={e => setSupervisorPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => { if (e.key === 'Enter') approve() }}
            placeholder="Admin or supervisor PIN"
            aria-label="Admin or supervisor PIN"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            style={{ ...inputStyle, fontSize: supervisorPin ? 18 : 14, letterSpacing: supervisorPin ? 4 : 0, textAlign: 'center' }}
          />
          <Numpad onKey={pressKey} showDot={false} showClear showBackspace btnHeight={50} fontSize={18} gap={8} />
          {error && (
            <div role="alert" style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={() => onClose(false)} disabled={busy} style={{
            height: 36, padding: '0 16px', borderRadius: 9, border: '1.5px solid var(--border)',
            background: '#fff', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={approve} disabled={!ready || busy} style={{
            height: 36, padding: '0 16px', borderRadius: 9, border: 'none',
            background: ready ? 'var(--brand)' : 'var(--surface-3)',
            color: ready ? '#fff' : 'var(--text-4)',
            fontSize: 12.5, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {busy && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}
