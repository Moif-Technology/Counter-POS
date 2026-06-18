import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor } from 'lucide-react'
import { api } from '../lib/api'
import { getOrCreateDeviceToken, saveEnrollment } from '../lib/device'
import { posNotifyError, posNotifyWarning } from '../lib/posNotify'

export default function EnrollPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    adminUsername: '',
    adminPassword: '',
    label: '',
  })
  const [loading, setLoading] = useState(false)

  const field = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const enroll = async (e) => {
    e.preventDefault()
    const { adminUsername, adminPassword } = form
    if (!adminUsername || !adminPassword) {
      posNotifyWarning('Email and password are required', { title: 'Device Setup' })
      return
    }
    setLoading(true)
    try {
      const deviceToken = getOrCreateDeviceToken()
      const result = await api.counterPos.enrollDevice({
        adminUsername,
        adminPassword,
        label:       form.label || null,
        deviceToken,
      })
      saveEnrollment({
        companyId:  result.companyId,
        branchId:   result.branchId,
        deviceToken,
        label:      result.label,
      })
      navigate('/')
    } catch (err) {
      posNotifyError(err.message, { title: 'Device Setup' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(145deg, var(--brand), var(--brand-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Monitor size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Device Setup</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Register this terminal to a branch
            </div>
          </div>
        </div>

        <form onSubmit={enroll}>
          {[
            { key: 'adminUsername', label: 'Admin Email', type: 'text',     placeholder: 'admin@example.com' },
            { key: 'adminPassword', label: 'Password',    type: 'password', placeholder: '••••••••' },
            { key: 'label',         label: 'Terminal Label (optional)', type: 'text', placeholder: 'e.g. Counter 1' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 10.5, fontWeight: 700,
                color: 'var(--text-3)', letterSpacing: 0.8, marginBottom: 6,
              }}>
                {label.toUpperCase()}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={field(key)}
                placeholder={placeholder}
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 8,
                  background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                  color: 'var(--text-1)', fontSize: 13.5, fontWeight: 500,
                }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', marginTop: 8, padding: '13px 0',
              borderRadius: 10,
              background: loading
                ? 'var(--surface-3)'
                : 'linear-gradient(145deg, var(--brand), var(--brand-2))',
              color: loading ? 'var(--text-3)' : '#fff',
              fontSize: 13.5, fontWeight: 800, letterSpacing: 0.8,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 18px rgba(107,0,0,0.28)',
            }}
          >
            {loading ? 'Registering…' : 'REGISTER DEVICE'}
          </button>
        </form>
      </div>
    </div>
  )
}
