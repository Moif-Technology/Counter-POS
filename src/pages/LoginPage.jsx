import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Monitor, Server } from 'lucide-react'
import { usePosStore } from '../store/posStore'

const NUMPAD = ['7','8','9','4','5','6','1','2','3','.','0','⌫']

const T = {
  wrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: '100%', background: 'var(--bg)',
  },
  card: {
    width: 420, background: 'var(--surface)', borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(160deg, var(--brand) 0%, var(--brand-2) 100%)',
    padding: '32px 36px 28px', textAlign: 'center',
  },
  iconRing: {
    width: 52, height: 52, borderRadius: 14,
    background: 'rgba(255,255,255,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 14px', border: '1px solid rgba(255,255,255,0.25)',
  },
  body: { padding: '28px 32px 32px' },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: 0.8, marginBottom: 6 },
  inputWrap: { position: 'relative', marginBottom: 14 },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    background: 'var(--bg)', border: '1.5px solid var(--border)',
    color: 'var(--text-1)', fontSize: 15, fontWeight: 500,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  toggle: {
    display: 'flex', background: 'var(--bg)', borderRadius: 10,
    padding: 4, marginBottom: 20, gap: 4, border: '1px solid var(--border)',
  },
  tabBtn: (active) => ({
    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--brand)' : 'var(--text-3)',
    fontWeight: active ? 700 : 500, fontSize: 12, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    transition: 'all 0.15s',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
  }),
  numBtn: (isDel) => ({
    padding: '13px 0', borderRadius: 10,
    border: '1.5px solid var(--border)',
    background: isDel ? '#fff5f5' : 'var(--bg)',
    color: isDel ? '#c00000' : 'var(--text-1)',
    fontSize: isDel ? 16 : 18, fontWeight: 700,
    cursor: 'pointer', transition: 'background 0.1s',
  }),
  loginBtn: (loading) => ({
    width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
    background: loading ? 'var(--border-2)' : 'linear-gradient(160deg, var(--brand) 0%, var(--brand-2) 100%)',
    color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: 0.5,
    cursor: loading ? 'not-allowed' : 'pointer',
    boxShadow: loading ? 'none' : '0 4px 16px rgba(92,0,0,0.3)',
    transition: 'all 0.2s',
  }),
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = usePosStore(s => s.setSession)
  const setBillNo = usePosStore(s => s.setBillNo)

  const [active, setActive] = useState('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [dbMode, setDbMode] = useState('LOCAL')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const numPress = (k) => {
    const setter = active === 'username' ? setUsername : setPassword
    if (k === '⌫') { setter(p => p.slice(0, -1)); return }
    setter(p => p + k)
  }

  const login = async () => {
    setError('')
    if (!username.trim()) { setError('Enter username'); return }
    if (!password.trim()) { setError('Enter password'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    setLoading(false)
    setSession({ name: username, id: username }, '01')
    setBillNo('B-00001')
    navigate('/pos')
  }

  const focusStyle = { borderColor: 'var(--brand)', boxShadow: '0 0 0 3px rgba(92,0,0,0.08)' }

  return (
    <div style={T.wrap}>
      <div style={T.card}>
        {/* Header */}
        <div style={T.header}>
          <div style={T.iconRing}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>MOIF POS</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 3, fontWeight: 400 }}>Counter Sales System</div>
        </div>

        <div style={T.body}>
          {/* Error */}
          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16, color: '#b91c1c', fontSize: 13, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* DB toggle */}
          <div style={T.toggle}>
            {['LOCAL','SERVER'].map(m => (
              <button key={m} style={T.tabBtn(dbMode === m)} onClick={() => setDbMode(m)}>
                {m === 'LOCAL' ? <Monitor size={12} /> : <Server size={12} />}
                {m}
              </button>
            ))}
          </div>

          {/* Username */}
          <div style={T.inputWrap}>
            <label style={T.label}>USERNAME</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onFocus={e => { setActive('username'); Object.assign(e.target.style, focusStyle) }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Enter username"
              style={T.input}
            />
          </div>

          {/* Password */}
          <div style={T.inputWrap}>
            <label style={T.label}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => { setActive('password'); Object.assign(e.target.style, focusStyle) }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Enter password"
                style={{ ...T.input, paddingRight: 44 }}
              />
              <button
                onClick={() => setShowPwd(p => !p)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
                  display: 'flex', padding: 4, borderRadius: 6,
                }}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 20 }}>
            {NUMPAD.map(k => (
              <button key={k} onClick={() => numPress(k)} style={T.numBtn(k === '⌫')}
                onMouseEnter={e => e.currentTarget.style.background = k === '⌫' ? '#fee2e2' : 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = k === '⌫' ? '#fff5f5' : 'var(--bg)'}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {k}
              </button>
            ))}
          </div>

          <button onClick={login} disabled={loading} style={T.loginBtn(loading)}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 20px rgba(92,0,0,0.4)' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 16px rgba(92,0,0,0.3)' }}
          >
            {loading ? 'Signing in...' : 'SIGN IN'}
          </button>
        </div>

        <div style={{
          textAlign: 'center', padding: '12px', background: 'var(--bg)',
          borderTop: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 11,
        }}>
          Moif Technology &copy; {new Date().getFullYear()} &middot; POS v2.0
        </div>
      </div>
    </div>
  )
}
