import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../../store/posStore'
import { api } from '../../lib/api'
import { getEnrollment, clearEnrollment, getOrCreateDeviceToken } from '../../lib/device'
import { posNotifyError, posNotifyWarning } from '../../lib/posNotify'
import { LITE_VERSION_ENABLED, LITE_VERSION_PIN } from '../../config/appConfig'
import BrandLogo from '../../components/common/BrandLogo'

const NUMPAD = ['7','8','9','4','5','6','1','2','3','C','0','⌫']

export default function LoginPage() {
  const navigate   = useNavigate()
  const setSession = usePosStore(s => s.setSession)
  const setBillNo  = usePosStore(s => s.setBillNo)

  const enrollment = getEnrollment()

  const [pin,     setPin]     = useState('')
  const [loading, setLoading] = useState(false)
  const [conflict, setConflict] = useState(null)   // "already logged in on …" message

  const pressKey = useCallback((k) => {
    if (k === '⌫' || k === 'Backspace') { setPin(p => p.slice(0, -1)); return }
    if (k === 'C' || k === 'Escape')    { setPin(''); return }
    if (/^\d$/.test(k) && pin.length < 6) setPin(p => p + k)
  }, [pin])

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter') { login(); return }
      pressKey(e.key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pressKey])  // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (takeOver = false) => {
    if (LITE_VERSION_ENABLED && pin === LITE_VERSION_PIN) { navigate('/lite'); return }
    if (pin.length < 4) { posNotifyWarning('PIN must be 4–6 digits', { title: 'Login' }); return }
    if (!enrollment)    { navigate('/enroll'); return }

    setLoading(true)
    try {
      const { accessToken, refreshToken, session } = await api.counterPos.pinLogin({
        pin,
        companyId:   enrollment.companyId,
        deviceToken: enrollment.deviceToken ?? getOrCreateDeviceToken(),
        takeOver,
      })
      setConflict(null)

      const cashier = {
        staffId:   session.user.staffId,
        staffName: session.user.staffName,
        staffCode: session.user.staffCode ?? '',
        role:      session.user.role,
        roleName:  session.user.roleName,
      }
      setSession(
        cashier,
        String(session.counterNo ?? enrollment.counterNo ?? 1),
        accessToken,
        refreshToken,
        enrollment.companyId,
        enrollment.branchId,
        enrollment.stationId ?? enrollment.branchId,
      )
      if (session.company) {
        usePosStore.getState().setReceiptHeader({
          companyName: session.company.companyName,
          branchName: session.company.stationName,
          companyAddress: session.company.address,
        })
      }
      setBillNo('')
      navigate('/pos')
    } catch (err) {
      // Counter was moved to another terminal (or device removed) — set up again.
      if (err.status === 401 && /not enrolled/i.test(err.message)) {
        posNotifyWarning('This terminal is no longer assigned to a counter. Please set it up again.', { title: 'Login' })
        clearEnrollment()
        navigate('/enroll')
        return
      }
      // Same staff is signed in on another terminal — keep the PIN for "continue here".
      if (err.code === 'STAFF_ALREADY_LOGGED_IN') {
        setConflict(err.message)
        return
      }
      posNotifyError(err.message, { title: 'Login' })
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const pinDots = Array.from({ length: 6 }, (_, i) => i < pin.length)

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'stretch',
      background: 'var(--bg)', overflow: 'hidden',
    }}>

      {/* ── LEFT BRAND PANEL ──────────────────── */}
      <div style={{
        width: 340, flexShrink: 0,
        background: 'linear-gradient(160deg, var(--brand) 0%, var(--brand-2) 60%, var(--palette-1) 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Brand — reversed (white) logo straight on the brand panel */}
        <BrandLogo variant="stacked" tone="white" height={190} style={{ position: 'relative' }} />

        <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.2)', margin: '28px 0', position: 'relative' }} />

        <div style={{ position: 'relative', textAlign: 'center' }}>
          {['Instant barcode scanning', 'Multi-payment support', 'Real-time VAT calculation'].map((feat, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 10, color: 'rgba(255,255,255,0.6)', fontSize: 11.5, fontWeight: 500,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              {feat}
            </div>
          ))}
        </div>

        {enrollment && (
          <div style={{
            position: 'absolute', bottom: 20,
            color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 0.4,
            textAlign: 'center', lineHeight: 1.6,
          }}>
            {enrollment.label || `Branch ${enrollment.branchId}`} · Co. {enrollment.companyId}
            <br />
            <button
              onClick={() => { clearEnrollment(); navigate('/enroll') }}
              style={{
                color: 'rgba(255,255,255,0.28)', fontSize: 10,
                textDecoration: 'underline', marginTop: 2, background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              Re-enroll device
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT PIN PANEL ──────────────────── */}
      <div style={{
        flex: 1, display: 'flex',
        padding: '32px 40px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 320, margin: 'auto' }}>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>Staff Sign In</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 5 }}>Enter your PIN to continue</p>
          </div>

          {conflict && (
            <div role="alert" style={{
              marginBottom: 18, padding: '12px 14px', borderRadius: 'var(--r-md)',
              background: 'rgba(217,119,6,0.08)', border: '1.5px solid rgba(217,119,6,0.45)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#b45309' }}>Already logged in</div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45 }}>
                {conflict} Log out there first, or continue here — the other terminal will be signed out.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => { setConflict(null); setPin('') }}
                  disabled={loading}
                  style={{
                    flex: '0 0 auto', padding: '9px 14px', borderRadius: 8,
                    background: 'var(--surface)', border: '1.5px solid var(--border)',
                    color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => login(true)}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 8,
                    background: '#b45309', border: 'none',
                    color: '#fff', fontSize: 12.5, fontWeight: 800, letterSpacing: 0.3,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Signing in…' : 'Continue here'}
                </button>
              </div>
            </div>
          )}

          {/* PIN dots */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.8, marginBottom: 10 }}>
              PIN
            </label>
            <div style={{
              display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center',
              padding: '18px 18px', borderRadius: 'var(--r-md)',
              background: 'var(--surface)', border: '1.5px solid var(--brand)',
              boxShadow: '0 0 0 3px var(--brand-glow)',
            }}>
              {pinDots.map((filled, i) => (
                <div key={i} style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: filled ? 'var(--brand)' : 'var(--border)',
                  transition: 'background 0.12s',
                }} />
              ))}
            </div>
          </div>

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 18 }}>
            {NUMPAD.map(k => {
              const isAction = k === '⌫' || k === 'C'
              return (
                <button
                  key={k}
                  className={isAction ? 'ui-key is-clear' : 'ui-key'}   // home keypad look
                  onClick={() => pressKey(k)}
                  style={{
                    padding: '15px 0', borderRadius: 'var(--r-md)',
                    border: `1.5px solid ${isAction ? 'var(--red-border)' : 'var(--border)'}`,
                    background: isAction ? 'var(--red-bg)' : 'var(--surface)',
                    color: isAction ? 'var(--red)' : 'var(--text-1)',
                    fontSize: isAction ? 13 : 20, fontWeight: 700,
                    fontFamily: k === '⌫' ? 'inherit' : 'inherit',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'transform 0.08s, background 0.1s',
                    cursor: 'pointer',
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {k}
                </button>
              )
            })}
          </div>

          {/* Sign in button */}
          <button
            onClick={() => login()}
            disabled={loading}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 'var(--r-lg)',
              background: loading
                ? 'var(--surface-3)'
                : 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: loading ? 'var(--text-3)' : '#fff',
              fontSize: 14, fontWeight: 800, letterSpacing: 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 18px rgba(120,8,41,0.28)',
              transition: 'all 0.18s',
            }}
          >
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Signing in...
                </span>
              : 'SIGN IN'
            }
          </button>

        </div>
      </div>
    </div>
  )
}
