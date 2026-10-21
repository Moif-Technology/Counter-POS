import { useEffect, useState } from 'react'
import { MonitorX } from 'lucide-react'

const LOCK = 'moif-counter-pos'
let lockRequested = false

/**
 * One Counter-POS per browser. Tabs of the same browser share the device token
 * (localStorage), so a second tab would be a second till on the same counter.
 * Web Locks: the first tab holds the lock until it closes; later tabs are
 * blocked, and "Use here" steals the lock (the old tab then shows this screen).
 */
export default function SingleTabGuard({ children }) {
  // ponytail: no navigator.locks (insecure http / very old WebView) → no guard
  // Customer display is a second window of the same till — never block it.
  const supported = typeof navigator !== 'undefined' && !!navigator.locks
    && !window.location.pathname.startsWith('/customer-display')
  const [state, setState] = useState(supported ? 'checking' : 'owner')

  const hold = (opts) => {
    navigator.locks.request(LOCK, opts, (lock) => {
      if (!lock) { setState('blocked'); return }
      setState('owner')
      return new Promise(() => {})   // keep until the tab closes
    }).catch(() => setState('taken'))  // our lock was stolen by another tab
  }

  useEffect(() => {
    // StrictMode runs effects twice in dev; a second request would find this
    // tab's own lock held and block itself, so ask only once per tab.
    if (!supported || lockRequested) return
    lockRequested = true
    hold({ ifAvailable: true })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'owner') return children
  if (state === 'checking') return null

  const taken = state === 'taken'
  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16, boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: 420, width: '100%', textAlign: 'center', padding: '36px 32px', borderRadius: 16,
        background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(217,119,6,0.12)', color: '#b45309',
        }}>
          <MonitorX size={24} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)' }}>
          {taken ? 'POS opened in another tab' : 'POS already open'}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
          {taken
            ? 'This counter is now being used in another tab or window of this browser. This tab has been paused.'
            : 'Counter POS is already open in another tab or window of this browser. Only one can run per terminal — switch to that tab, or use it here instead.'}
        </div>
        <button
          type="button"
          onClick={() => hold({ steal: true })}
          style={{
            width: '100%', marginTop: 22, padding: '12px 0', borderRadius: 10,
            background: 'linear-gradient(145deg, var(--brand), var(--brand-2))',
            color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: 0.6, cursor: 'pointer',
          }}
        >
          {taken ? 'USE IT HERE AGAIN' : 'USE HERE INSTEAD'}
        </button>
        <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text-3)' }}>
          {taken ? '' : 'The other tab will be paused.'}
        </div>
      </div>
    </div>
  )
}
