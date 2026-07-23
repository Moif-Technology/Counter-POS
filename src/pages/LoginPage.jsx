import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../store/posStore'
import { api } from '../lib/api'
import { getEnrollment, clearEnrollment, getOrCreateDeviceToken } from '../lib/device'
import { posNotifyError, posNotifyWarning } from '../lib/posNotify'
import { LITE_VERSION_ENABLED, LITE_VERSION_PIN } from '../config/appConfig'

const NUMPAD = ['7','8','9','4','5','6','1','2','3','C','0','⌫']

export default function LoginPage() {
  const navigate   = useNavigate()
  const setSession = usePosStore(s => s.setSession)
  const setBillNo  = usePosStore(s => s.setBillNo)

  const enrollment = getEnrollment()

  const [pin,     setPin]     = useState('')
  const [loading, setLoading] = useState(false)

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

  const login = async () => {
    if (LITE_VERSION_ENABLED && pin === LITE_VERSION_PIN) { navigate('/lite'); return }
    if (pin.length < 4) { posNotifyWarning('PIN must be 4–6 digits', { title: 'Login' }); return }
    if (!enrollment)    { navigate('/enroll'); return }

    setLoading(true)
    try {
      const { accessToken, refreshToken, session } = await api.counterPos.pinLogin({
        pin,
        companyId:   enrollment.companyId,
        deviceToken: enrollment.deviceToken ?? getOrCreateDeviceToken(),
      })

      const cashier = {
        staffId:   session.user.staffId,
        staffName: session.user.staffName,
        staffCode: session.user.staffCode ?? '',
        role:      session.user.role,
        roleName:  session.user.roleName,
      }
      setSession(
        cashier,
        String(enrollment.branchId),
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
        background: 'linear-gradient(160deg, var(--brand) 0%, var(--brand-2) 60%, #4a0000 100%)',
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

        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(255,255,255,0.14)',
          border: '1.5px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28, position: 'relative',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" x2="21" y1="6" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>

        <div style={{ color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1, position: 'relative' }}>
          MOIF POS
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, letterSpacing: 2, marginTop: 8, textTransform: 'uppercase', position: 'relative' }}>
          Counter Sales System
        </div>

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
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 40px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 320 }}>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>Staff Sign In</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 5 }}>Enter your PIN to continue</p>
          </div>

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
                  onClick={() => pressKey(k)}
                  style={{
                    padding: '15px 0', borderRadius: 'var(--r-md)',
                    border: `1.5px solid ${isAction ? 'var(--red-border)' : 'var(--border)'}`,
                    background: isAction ? 'var(--red-bg)' : 'var(--surface)',
                    color: isAction ? 'var(--red)' : 'var(--text-1)',
                    fontSize: isAction ? 13 : 20, fontWeight: 700,
                    fontFamily: k === '⌫' ? 'inherit' : "'JetBrains Mono', monospace",
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
            onClick={login}
            disabled={loading}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 'var(--r-lg)',
              background: loading
                ? 'var(--surface-3)'
                : 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: loading ? 'var(--text-3)' : '#fff',
              fontSize: 14, fontWeight: 800, letterSpacing: 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 18px rgba(107,0,0,0.28)',
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
