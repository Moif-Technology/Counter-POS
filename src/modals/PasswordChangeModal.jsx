import { useState } from 'react'
import { KeyRound, ShieldCheck, RefreshCw } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { api } from '../lib/api'
import Modal from '../components/common/Modal'

export default function PasswordChangeModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const authStaff   = usePosStore(s => s.authStaff)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters long')
      return
    }

    setLoading(true)
    try {
      const res = await api.counterPos.changePassword({
        staffId: authStaff?.id,
        currentPassword,
        newPassword,
      }, accessToken)

      if (res.success || res.ok) {
        setSuccessMsg('Password updated successfully!')
        setTimeout(() => onClose(), 1200)
      } else {
        setError(res.message || 'Failed to update password')
      }
    } catch (err) {
      setError(err.message ?? 'An error occurred while changing password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      icon={KeyRound}
      kicker="Settings"
      title="Password Change"
      zIndex={1100}
      width={440}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Body Form */}
      <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{
            padding: 12, borderRadius: 8, background: 'var(--red-bg)',
            border: '1px solid var(--red-border)', color: 'var(--red)',
            fontSize: 12, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: 12, borderRadius: 8, background: 'var(--green-bg, var(--green-bg))',
            border: '1px solid var(--green-border, var(--green-border))', color: 'var(--green, var(--green))',
            fontSize: 12, fontWeight: 600,
          }}>
            {successMsg}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            autoFocus
            style={{
              width: '100%', height: 40, padding: '0 12px', borderRadius: 9,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              fontSize: 13, fontWeight: 600, color: 'var(--text-1)', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            style={{
              width: '100%', height: 40, padding: '0 12px', borderRadius: 9,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              fontSize: 13, fontWeight: 600, color: 'var(--text-1)', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            style={{
              width: '100%', height: 40, padding: '0 12px', borderRadius: 9,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              fontSize: 13, fontWeight: 600, color: 'var(--text-1)', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, height: 38, borderRadius: 9,
              border: '1.5px solid var(--border)', background: 'var(--surface-2)',
              color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1, height: 38, borderRadius: 9,
              border: 'none', background: 'var(--brand)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={14} />}
            Update Password
          </button>
        </div>
      </form>
    </Modal>
  )
}