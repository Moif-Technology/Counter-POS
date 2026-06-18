import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../store/posStore'
import { api } from '../lib/api'
import { getEnrollment, saveEnrollment, clearEnrollment, getOrCreateDeviceToken } from '../lib/device'

const NUMPAD = ['7','8','9','4','5','6','1','2','3','C','0','⌫']

export default function LoginPage() {
  const navigate   = useNavigate()
  const setSession = usePosStore(s => s.setSession)
  const setBillNo  = usePosStore(s => s.setBillNo)

  const enrollment = getEnrollment()

  const [staff,        setStaff]        = useState([])
  const [selected,     setSelected]     = useState(null)   // chosen staff or null (legacy)
  const [legacyMode,   setLegacyMode]   = useState(false)  // PIN-only, no picker
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [pin,     setPin]     = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // Load the staff picker for this enrolled device.
  useEffect(() => {
    if (!enrollment) { navigate('/enroll'); return }
    let alive = true
    ;(async () => {
      try {
        const staffResult = await api.counterPos.staffList({
          deviceToken: getOrCreateDeviceToken(),
        })
        const { staff: list } = staffResult
        if (!alive) return
        saveEnrollment({
          ...enrollment,
          companyId: staffResult.companyId ?? enrollment.companyId,
          branchId: staffResult.branchId ?? enrollment.branchId,
          counterNo: staffResult.counterNo ?? enrollment.counterNo ?? 1,
        })
        if (Array.isArray(list) && list.length > 0) {
          setStaff(list)
        } else {
          setLegacyMode(true)   // no PINs configured → fall back to PIN-only
        }
      } catch {
        if (alive) setLegacyMode(true)  // old backend / offline → legacy PIN-only
      } finally {
        if (alive) setLoadingStaff(false)
      }
    })()
    return () => { alive = false }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const onPinScreen = legacyMode || selected != null

  const pressKey = useCallback((k) => {
    if (k === '⌫' || k === 'Backspace') { setPin(p => p.slice(0, -1)); return }
    if (k === 'C' || k === 'Escape')    { setPin(''); setError(''); return }
    if (/^\d$/.test(k) && pin.length < 4) setPin(p => p + k)
  }, [pin])

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (onPinScreen && pin.length === 4) login()
  }, [pin])  // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard support — only while on the PIN screen.
  useEffect(() => {
    if (!onPinScreen) return undefined
    const handler = (e) => {
      if (e.key === 'Enter') { login(); return }
      pressKey(e.key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pressKey, onPinScreen])  // eslint-disable-line react-hooks/exhaustive-deps

  const pickStaff = (s) => { setSelected(s); setPin(''); setError('') }
  const backToPicker = () => { setSelected(null); setPin(''); setError('') }

  const login = async () => {
    setError('')
    if (pin.length < 4) { setError('PIN must be 4 digits'); return }
    if (!enrollment)    { navigate('/enroll'); return }

    setLoading(true)
    try {
      const activeEnrollment = getEnrollment() || enrollment
      const { accessToken, refreshToken, session } = await api.counterPos.pinLogin({
        pin,
        companyId: activeEnrollment.companyId,
        staffId: selected?.staffPk,   // undefined in legacy mode → server scans (bounded)
      })

      const cashier = {
        staffId:   session.user.staffId,
        name:      session.user.staffName,
        staffCode: session.user.staffCode ?? '',
        role:      session.user.role,
        roleName:  session.user.roleName,
      }
      setSession(
        cashier,
        String(activeEnrollment.counterNo ?? 1),
        accessToken,
        refreshToken,
        activeEnrollment.companyId,
        activeEnrollment.branchId,
        { features: session.features ?? null, subscription: session.subscription ?? null },
      )
      setBillNo(`B-${String(Date.now()).slice(-5)}`)
      navigate('/pos')
    } catch (err) {
      setError(err.message)
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const pinDots = Array.from({ length: 4 }, (_, i) => i < pin.length)
  const initials = (name) =>
    String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

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

      {/* ── RIGHT PANEL ──────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 40px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: onPinScreen ? 320 : 520 }}>

          {error && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              borderRadius: 'var(--r-md)', padding: '10px 14px', marginBottom: 18,
              color: 'var(--red)', fontSize: 12.5, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* STEP 1 — staff picker */}
          {loadingStaff && (
            <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              Loading staff…
            </div>
          )}

          {!loadingStaff && !onPinScreen && (
            <>
              <div style={{ marginBottom: 22 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>Select your name</h1>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 5 }}>Tap your name, then enter your PIN</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {staff.map(s => (
                  <button
                    key={s.staffPk}
                    onClick={() => pickStaff(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px', borderRadius: 'var(--r-md)',
                      border: '1.5px solid var(--border)', background: 'var(--surface)',
                      color: 'var(--text-1)', cursor: 'pointer', textAlign: 'left',
                      boxShadow: 'var(--shadow-xs)', transition: 'transform 0.08s, border-color 0.1s',
                    }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
                      color: '#fff', fontSize: 13, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {initials(s.staffName)}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.staffName}
                      </div>
                      {s.roleName && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.roleName}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 2 — PIN entry */}
          {!loadingStaff && onPinScreen && (
            <div style={{ maxWidth: 320, margin: '0 auto' }}>
              <div style={{ marginBottom: 22 }}>
                {selected && !legacyMode && (
                  <button
                    onClick={backToPicker}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 10,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    ‹ Back to staff list
                  </button>
                )}
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>
                  {selected ? `Hi, ${selected.staffName}` : 'Staff Sign In'}
                </h1>
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
          )}

        </div>
      </div>
    </div>
  )
}
