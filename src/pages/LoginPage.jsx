import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Monitor, Server } from 'lucide-react'
import { usePosStore } from '../store/posStore'

const NUMPAD = ['7','8','9','4','5','6','1','2','3','.','0','⌫']

export default function LoginPage() {
  const navigate   = useNavigate()
  const setSession = usePosStore(s => s.setSession)
  const setBillNo  = usePosStore(s => s.setBillNo)

  const [active,   setActive]   = useState('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [dbMode,   setDbMode]   = useState('LOCAL')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const numPress = (k) => {
    const setter = active === 'username' ? setUsername : setPassword
    if (k === '⌫') { setter(p => p.slice(0, -1)); return }
    setter(p => p + k)
  }

  const login = async () => {
    setError('')
    if (!username.trim()) { setError('Enter a username to continue'); return }
    if (!password.trim()) { setError('Enter your password to continue'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    setLoading(false)
    setSession({ name: username, id: username }, '01')
    setBillNo('B-00001')
    navigate('/pos')
  }

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
        {/* Background grid texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
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

        <div style={{
          width: 40, height: 1,
          background: 'rgba(255,255,255,0.2)',
          margin: '28px 0', position: 'relative',
        }} />

        <div style={{ position: 'relative', textAlign: 'center' }}>
          {[
            'Instant barcode scanning',
            'Multi-payment support',
            'Real-time VAT calculation',
          ].map((feat, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 10, color: 'rgba(255,255,255,0.6)', fontSize: 11.5, fontWeight: 500,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              {feat}
            </div>
          ))}
        </div>

        {/* Bottom version */}
        <div style={{
          position: 'absolute', bottom: 20,
          color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: 0.5,
        }}>
          Moif Technology © {new Date().getFullYear()} · v2.0
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ──────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 40px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>Sign in</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 5, fontWeight: 400 }}>Enter your credentials to open a session</p>
          </div>

          {/* Error */}
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

          {/* DB Mode toggle */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.8, marginBottom: 7 }}>
              DATABASE MODE
            </label>
            <div style={{
              display: 'flex', gap: 4, background: 'var(--surface-2)',
              borderRadius: 'var(--r-md)', padding: 4,
              border: '1px solid var(--border)',
            }}>
              {['LOCAL','SERVER'].map(m => (
                <button key={m}
                  onClick={() => setDbMode(m)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 7,
                    background: dbMode === m ? 'var(--surface)' : 'transparent',
                    color: dbMode === m ? 'var(--brand)' : 'var(--text-3)',
                    fontWeight: dbMode === m ? 700 : 500, fontSize: 11.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    boxShadow: dbMode === m ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.14s', border: 'none',
                  }}
                >
                  {m === 'LOCAL' ? <Monitor size={11} /> : <Server size={11} />}
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.8, marginBottom: 7 }}>USERNAME</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onFocus={() => setActive('username')}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Enter username"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--surface)', border: `1.5px solid ${active === 'username' ? 'var(--brand)' : 'var(--border)'}`,
                color: 'var(--text-1)', fontSize: 14, fontWeight: 500,
                boxShadow: active === 'username' ? '0 0 0 3px var(--brand-glow)' : 'none',
                transition: 'border-color 0.14s, box-shadow 0.14s',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.8, marginBottom: 7 }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setActive('password')}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Enter password"
                style={{
                  width: '100%', padding: '11px 42px 11px 14px', borderRadius: 'var(--r-md)',
                  background: 'var(--surface)', border: `1.5px solid ${active === 'password' ? 'var(--brand)' : 'var(--border)'}`,
                  color: 'var(--text-1)', fontSize: 14, fontWeight: 500,
                  boxShadow: active === 'password' ? '0 0 0 3px var(--brand-glow)' : 'none',
                  transition: 'border-color 0.14s, box-shadow 0.14s',
                }}
              />
              <button
                onClick={() => setShowPwd(p => !p)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-3)', padding: 6, borderRadius: 6, display: 'flex',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 18 }}>
            {NUMPAD.map(k => {
              const isDel = k === '⌫'
              return (
                <button
                  key={k}
                  onClick={() => numPress(k)}
                  style={{
                    padding: '12px 0', borderRadius: 'var(--r-md)',
                    border: `1.5px solid ${isDel ? 'var(--red-border)' : 'var(--border)'}`,
                    background: isDel ? 'var(--red-bg)' : 'var(--surface)',
                    color: isDel ? 'var(--red)' : 'var(--text-1)',
                    fontSize: isDel ? 14 : 17, fontWeight: 700,
                    fontFamily: isDel ? 'inherit' : "'JetBrains Mono', monospace",
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'transform 0.08s, box-shadow 0.08s, background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = isDel ? '#fee2e2' : 'var(--surface-2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isDel ? 'var(--red-bg)' : 'var(--surface)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.94)'; e.currentTarget.style.boxShadow = 'none' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
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
              width: '100%', padding: '14px 0', borderRadius: 'var(--r-lg)',
              background: loading
                ? 'var(--surface-3)'
                : 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: loading ? 'var(--text-3)' : '#fff',
              fontSize: 14, fontWeight: 800, letterSpacing: 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 18px rgba(107,0,0,0.28)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 24px rgba(107,0,0,0.38)' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 18px rgba(107,0,0,0.28)' }}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.99)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
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
