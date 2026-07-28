import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor } from 'lucide-react'
import { api } from '../lib/api'
import { getOrCreateDeviceToken, saveEnrollment } from '../lib/device'
import { posNotifyError, posNotifyWarning } from '../lib/posNotify'

const inputStyle = {
  width: '100%', padding: '10px 13px', borderRadius: 8,
  background: 'var(--surface-2)', border: '1.5px solid var(--border)',
  color: 'var(--text-1)', fontSize: 13.5, fontWeight: 500,
}

const labelStyle = {
  display: 'block', fontSize: 10.5, fontWeight: 700,
  color: 'var(--text-3)', letterSpacing: 0.8, marginBottom: 6,
}

export default function EnrollPage() {
  const navigate = useNavigate()

  // Step 1: credentials
  const [creds, setCreds] = useState({ adminUsername: '', adminPassword: '' })
  // Step 2: station + label
  const [stations, setStations] = useState(null)   // null = not fetched yet
  const [stationId, setStationId] = useState('')
  const [label, setLabel] = useState('')

  const [loading, setLoading] = useState(false)
  const [companyId, setCompanyId] = useState(null)

  const step = stations === null ? 1 : 2

  const credField = (k) => (e) => setCreds(f => ({ ...f, [k]: e.target.value }))

  // Step 1 submit — verify creds + load station list
  const handleVerify = async (e) => {
    e.preventDefault()
    const { adminUsername, adminPassword } = creds
    if (!adminUsername || !adminPassword) {
      posNotifyWarning('Email and password are required', { title: 'Device Setup' })
      return
    }
    setLoading(true)
    try {
      const result = await api.counterPos.enrollListStations({ adminUsername, adminPassword })
      if (!result.stations?.length) {
        posNotifyError(
          'No Counter POS stations found for this company. Create one in Station Management first.',
          { title: 'Device Setup' },
        )
        return
      }
      setCompanyId(result.companyId)
      setStations(result.stations)
      // pre-select if only one
      if (result.stations.length === 1) setStationId(String(result.stations[0].stationId))
    } catch (err) {
      posNotifyError(err.message, { title: 'Device Setup' })
    } finally {
      setLoading(false)
    }
  }

  // Step 2 submit — enroll device with chosen station
  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!stationId) {
      posNotifyWarning('Select a station', { title: 'Device Setup' })
      return
    }
    setLoading(true)
    try {
      const deviceToken = getOrCreateDeviceToken()
      const result = await api.counterPos.enrollDevice({
        adminUsername: creds.adminUsername,
        adminPassword: creds.adminPassword,
        label:         label || null,
        deviceToken,
        stationId:     Number(stationId),
      })
      saveEnrollment({
        companyId:  result.companyId,
        branchId:   result.branchId,
        stationId:  result.stationId ?? result.branchId,
        counterNo:  result.counterNo ?? 1,
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
              {step === 1 ? 'Register this terminal to a station' : 'Select station for this terminal'}
            </div>
          </div>
        </div>

        {/* Step 1 — credentials */}
        {step === 1 && (
          <form onSubmit={handleVerify}>
            {[
              { key: 'adminUsername', label: 'Admin Email',  type: 'text',     placeholder: 'admin@example.com' },
              { key: 'adminPassword', label: 'Password',     type: 'password', placeholder: '••••••••' },
            ].map(({ key, label: lbl, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{lbl.toUpperCase()}</label>
                <input
                  type={type}
                  value={creds[key]}
                  onChange={credField(key)}
                  placeholder={placeholder}
                  style={inputStyle}
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
              {loading ? 'Verifying…' : 'NEXT →'}
            </button>
          </form>
        )}

        {/* Step 2 — station picker + label */}
        {step === 2 && (
          <form onSubmit={handleEnroll}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>COUNTER POS STATION</label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                <option value="">— Select station —</option>
                {stations.map((s) => (
                  <option key={s.stationId} value={String(s.stationId)}>
                    {s.stationName}
                    {s.stationCode ? ` (${s.stationCode})` : ''}
                    {s.branchName ? ` · ${s.branchName}` : ''}
                    {s.counterNo != null ? ` · Counter ${s.counterNo}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>TERMINAL LABEL (OPTIONAL)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Counter 1"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => { setStations(null); setStationId(''); setLabel('') }}
                disabled={loading}
                style={{
                  flex: '0 0 auto', padding: '13px 18px', borderRadius: 10,
                  background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                  color: 'var(--text-2)', fontSize: 13, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading || !stationId}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 10,
                  background: loading || !stationId
                    ? 'var(--surface-3)'
                    : 'linear-gradient(145deg, var(--brand), var(--brand-2))',
                  color: loading || !stationId ? 'var(--text-3)' : '#fff',
                  fontSize: 13.5, fontWeight: 800, letterSpacing: 0.8,
                  cursor: loading || !stationId ? 'not-allowed' : 'pointer',
                  boxShadow: loading || !stationId ? 'none' : '0 4px 18px rgba(107,0,0,0.28)',
                }}
              >
                {loading ? 'Registering…' : 'REGISTER DEVICE'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
