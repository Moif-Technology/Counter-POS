import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { posNotifyError, posNotifySuccess } from '../lib/posNotify'

const inputStyle = {
  width: '100%', height: 38, boxSizing: 'border-box',
  borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff',
  padding: '0 10px', fontSize: 13, color: 'var(--text-1)', outline: 'none',
}

const useStationLimit = create(() => ({ shortages: null, resolve: null }))

/**
 * Bill hit this counter's selling limit (server 409 STATION_LIMIT).
 * Resolves { supervisorPin } (admin or supervisor PIN) to retry with an override,
 * or null (cancelled / asked back office for more — the bill stays on screen).
 */
export function askStationLimit(shortages) {
  return new Promise(resolve => useStationLimit.setState({ shortages, resolve }))
}

/** Mounted once in App, next to PosNotifyHost. */
export function StationLimitHost() {
  const { shortages, resolve } = useStationLimit()
  if (!shortages) return null
  const close = (value) => {
    useStationLimit.setState({ shortages: null, resolve: null })
    resolve(value)
  }
  return <StationLimitDialog shortages={shortages} onClose={close} />
}

function StationLimitDialog({ shortages, onClose }) {
  const [supervisorPin, setSupervisorPin] = useState('')
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !requesting) onClose(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, requesting])

  const canOverride = supervisorPin.length >= 4

  async function override() {
    if (!canOverride) return
    onClose({ supervisorPin })
  }

  async function requestMore() {
    setRequesting(true)
    try {
      const token = usePosStore.getState().accessToken
      for (const s of shortages) {
        await api.counterPos.requestStationStock({ productId: s.productId, qty: s.requested - s.remaining }, token)
      }
      posNotifySuccess('Back office notified. Save again once they add stock to this counter.', { title: 'Request Sent' })
      onClose(null)
    } catch (e) {
      posNotifyError(e.message ?? 'Request failed', { title: 'Request' })
      setRequesting(false)
    }
  }

  return (
    <div data-pos-overlay style={{
      position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,13,10,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 440, maxWidth: '94vw', background: '#fff', borderRadius: 18,
        boxShadow: '0 32px 80px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        <div style={{ background: '#b45309', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
          <AlertTriangle size={16} />
          <div style={{ fontSize: 15, fontWeight: 800 }}>Counter limit reached</div>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {shortages.map(s => (
              <div key={s.productId} style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{s.productName}</span>
                <span>billed {s.requested} · left {s.remaining}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.4 }}>
            An admin (or a supervisor allowed to cancel bills) can approve this bill with their PIN, or ask back office to add stock to this counter.
          </div>
          {/* new-password: Chrome ignores "off" on password fields and autofills the saved login */}
          <input
            autoFocus
            data-system-keyboard
            value={supervisorPin}
            onChange={e => setSupervisorPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => { if (e.key === 'Enter') override() }}
            placeholder="Admin or supervisor PIN"
            aria-label="Admin or supervisor PIN"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>

        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
          display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
        }}>
          <button onClick={() => onClose(null)} disabled={requesting} style={{
            height: 34, padding: '0 14px', borderRadius: 9, border: '1.5px solid var(--border)',
            background: '#fff', color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Back
          </button>
          <button onClick={requestMore} disabled={requesting} style={{
            height: 34, padding: '0 14px', borderRadius: 9, border: '1.5px solid #b45309',
            background: '#fff', color: '#b45309', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {requesting && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
            Notify back office
          </button>
          <button onClick={override} disabled={!canOverride || requesting} style={{
            height: 34, padding: '0 14px', borderRadius: 9, border: 'none',
            background: canOverride ? '#b45309' : 'var(--surface-3)',
            color: canOverride ? '#fff' : 'var(--text-4)',
            fontSize: 12, fontWeight: 700, cursor: canOverride ? 'pointer' : 'not-allowed',
          }}>
            Override &amp; Save
          </button>
        </div>
      </div>
    </div>
  )
}
