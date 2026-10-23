import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, History, Check, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/api'
import { getOrCreateDeviceToken, saveEnrollment, getPreviousEnrollment } from '../../lib/device'
import { posNotifyError, posNotifyWarning } from '../../lib/posNotify'
import BrandLogo from '../../components/common/BrandLogo'

const inputStyle = {
  width: '100%', padding: '10px 13px', borderRadius: 8,
  background: 'var(--surface-2)', border: '1.5px solid var(--border)',
  color: 'var(--text-1)', fontSize: 13.5, fontWeight: 500,
}

const inUseMessage = (s) =>
  `${s.stationName} is already open on another terminal${s.inUseLabel ? ` ("${s.inUseLabel}")` : ''}.`

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
  const [previous] = useState(getPreviousEnrollment)
  // { stationId, message } when the chosen counter is open on another terminal
  const [conflict, setConflict] = useState(null)

  const step = stations === null ? 1 : 2
  // Station this terminal was last registered to (same company only).
  const lastUsed = stations && previous && Number(previous.companyId) === Number(companyId)
    ? stations.find((s) => Number(s.stationId) === Number(previous.stationId) && !s.inUse) ?? null
    : null

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
      const result = await api.counterPos.enrollListStations({
        adminUsername, adminPassword, deviceToken: getOrCreateDeviceToken(),
      })
      if (!result.stations?.length) {
        posNotifyError(
          'No Counter POS stations found for this company. Create one in Station Management first.',
          { title: 'Device Setup' },
        )
        return
      }
      setCompanyId(result.companyId)
      setStations(result.stations)
      // pre-select the station used last on this terminal, else the only one
      const prev = previous && Number(previous.companyId) === Number(result.companyId)
        ? result.stations.find((s) => Number(s.stationId) === Number(previous.stationId) && !s.inUse)
        : null
      const free = result.stations.filter((s) => !s.inUse)
      if (prev) setStationId(String(prev.stationId))
      else if (free.length === 1) setStationId(String(free[0].stationId))
      if (prev && previous.label) setLabel(previous.label)
    } catch (err) {
      posNotifyError(err.message, { title: 'Device Setup' })
    } finally {
      setLoading(false)
    }
  }

  // Step 2 submit — enroll device with chosen station
  const handleEnroll = async (e, chosenId = stationId, takeOver = false) => {
    e?.preventDefault()
    if (!chosenId) {
      posNotifyWarning('Select a station', { title: 'Device Setup' })
      return
    }
    const chosen = stations?.find((s) => String(s.stationId) === String(chosenId))
    if (chosen?.inUse && !takeOver) {
      setConflict({ stationId: String(chosenId), message: inUseMessage(chosen) })
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
        stationId:     Number(chosenId),
        takeOver,
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
      if (err.code === 'STATION_IN_USE') {
        setConflict({ stationId: String(chosenId), message: err.message })
        return
      }
      posNotifyError(err.message, { title: 'Device Setup' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', overflowY: 'auto', padding: 16, boxSizing: 'border-box',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, margin: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <BrandLogo variant="horizontal" height={46} style={{ margin: '0 auto 28px' }} />

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
                <input data-system-keyboard
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
                boxShadow: loading ? 'none' : '0 4px 18px rgba(120,8,41,0.28)',
              }}
            >
              {loading ? 'Verifying…' : 'NEXT →'}
            </button>
          </form>
        )}

        {/* Step 2 — station picker + label */}
        {step === 2 && (
          <form onSubmit={handleEnroll}>
            {lastUsed && (
              <div style={{
                marginBottom: 16, padding: '14px 16px', borderRadius: 12,
                background: 'rgba(107,0,0,0.05)',
                border: '1.5px solid rgba(107,0,0,0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, color: 'var(--brand)' }}>
                  <History size={13} /> PREVIOUSLY USED ON THIS TERMINAL
                </div>
                <div style={{ marginTop: 6, fontSize: 14.5, fontWeight: 800, color: 'var(--text-1)' }}>
                  {lastUsed.stationName}
                  {lastUsed.counterNo != null && (
                    <span style={{ fontWeight: 600, color: 'var(--text-2)' }}> · Counter {lastUsed.counterNo}</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => { setStationId(String(lastUsed.stationId)); handleEnroll(null, String(lastUsed.stationId)) }}
                  style={{
                    width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 9,
                    background: loading ? 'var(--surface-3)' : 'linear-gradient(145deg, var(--brand), var(--brand-2))',
                    color: loading ? 'var(--text-3)' : '#fff',
                    fontSize: 13, fontWeight: 800, letterSpacing: 0.6,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Registering…' : 'CONTINUE ON THIS STATION'}
                </button>
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-3)', textAlign: 'center' }}>
                  or choose a different station below
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>COUNTER POS STATION</label>
              <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                {stations.map((s) => {
                  const selected = String(s.stationId) === stationId
                  const isLast = lastUsed && lastUsed.stationId === s.stationId
                  return (
                    <button
                      key={s.stationId}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => { setStationId(String(s.stationId)); setConflict(null) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                        padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                        background: selected ? 'rgba(107,0,0,0.06)' : 'var(--surface-2)',
                        border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
                        opacity: s.inUse && !selected ? 0.65 : 1,
                      }}
                    >
                      <div style={{
                        width: 54, height: 48, flex: 'none', borderRadius: 9,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: selected ? 'var(--brand)' : 'var(--surface-3)',
                        color: selected ? '#fff' : 'var(--text-1)',
                      }}>
                        <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.6, opacity: 0.8 }}>COUNTER</span>
                        <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{s.counterNo ?? '—'}</span>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.stationName}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                          {[s.stationCode, s.branchName].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </div>
                      {s.inUse && (
                        <span title={s.inUseLabel ? `Open on "${s.inUseLabel}"` : 'Open on another terminal'} style={{
                          flex: 'none', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5,
                          padding: '3px 8px', borderRadius: 999,
                          background: 'rgba(217,119,6,0.14)', color: '#b45309',
                        }}>IN USE</span>
                      )}
                      {isLast && (
                        <span style={{
                          flex: 'none', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5,
                          padding: '3px 8px', borderRadius: 999,
                          background: 'rgba(107,0,0,0.1)', color: 'var(--brand)',
                        }}>LAST USED</span>
                      )}
                      {selected && <Check size={16} color="var(--brand)" style={{ flex: 'none' }} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {conflict && conflict.stationId === stationId && (
              <div role="alert" style={{
                marginBottom: 14, padding: '12px 14px', borderRadius: 10,
                background: 'rgba(217,119,6,0.08)', border: '1.5px solid rgba(217,119,6,0.45)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: '#b45309' }}>
                  <AlertTriangle size={15} /> Counter already in use
                </div>
                <div style={{ marginTop: 5, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.45 }}>
                  {conflict.message} Choose another counter, or move it to this terminal
                  — the other terminal will be removed from this counter and must be set up again.
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleEnroll(null, conflict.stationId, true)}
                  style={{
                    marginTop: 10, width: '100%', padding: '10px 0', borderRadius: 8,
                    background: 'var(--surface)', border: '1.5px solid rgba(217,119,6,0.6)',
                    color: '#b45309', fontSize: 12.5, fontWeight: 800, letterSpacing: 0.4,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Moving…' : 'MOVE COUNTER TO THIS TERMINAL'}
                </button>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>TERMINAL LABEL (OPTIONAL)</label>
              <input data-system-keyboard
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
                  boxShadow: loading || !stationId ? 'none' : '0 4px 18px rgba(120,8,41,0.28)',
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
