import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ShieldAlert, Save, RefreshCw } from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { api } from '../../lib/api'

export default function PrivilegeSettingsModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)

  const [roles, setRoles] = useState([])
  const [selectedRole, setSelectedRole] = useState('cashier')
  const [privileges, setPrivileges] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const overlayRef = useRef()

  const fetchPrivileges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.counterPos.getPrivileges(accessToken)
      // Expecting data format: { roles: ['cashier', 'supervisor', ...], permissions: { cashier: { allowDiscount: true, ... }, ... } }
      setRoles(data.roles ?? ['cashier', 'supervisor'])
      setPrivileges(data.permissions ?? {})
    } catch (err) {
      setError(err.message ?? 'Failed to load privilege settings')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { fetchPrivileges() }, [fetchPrivileges])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleToggle = (permissionKey) => {
    setPrivileges(prev => ({
      ...prev,
      [selectedRole]: {
        ...(prev[selectedRole] ?? {}),
        [permissionKey]: !(prev[selectedRole]?.[permissionKey] ?? false)
      }
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      await api.counterPos.updatePrivileges({ role: selectedRole, permissions: privileges[selectedRole] }, accessToken)
      setSuccessMsg('Privileges saved successfully!')
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (err) {
      setError(err.message ?? 'Failed to save privileges')
    } finally {
      setSaving(false)
    }
  }

  const permissionLabels = [
    { key: 'allowDiscount', label: 'Allow Item & Bill Discounts', desc: 'Permit staff to apply custom discount percentages or amounts' },
    { key: 'allowItemDelete', label: 'Allow Deleting Cart Items', desc: 'Permit removal of added line items before final billing' },
    { key: 'allowPriceOverride', label: 'Allow Price Override', desc: 'Permit altering preset item prices directly on terminal' },
    { key: 'allowCounterReading', label: 'View Counter Reading / Z-Report', desc: 'Access financial session summaries and print close reports' },
    { key: 'allowHoldBills', label: 'Manage Hold Bills', desc: 'Hold, recall, or clear pending customer transaction holds' },
  ]

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(15,13,10,0.50)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'swfade 0.15s ease',
      }}
    >
      <style>{`@keyframes swfade { from { opacity:0 } to { opacity:1 } }`}</style>

      <div style={{
        width: 650, maxWidth: '96vw', maxHeight: '88vh',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.20)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '13px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldAlert size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', margin: 0 }}>
                Settings • Admin Access Required
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1, margin: 0 }}>
                Privilege Settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-3)', fontSize: 13 }}>
              <RefreshCw size={18} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
              Loading privileges...
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--green-bg, #e6f4ea)', border: '1px solid var(--green-border, #ceead6)', color: 'var(--green, #137333)', fontSize: 12, fontWeight: 600 }}>
              {successMsg}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Role Selector Tabs */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Select Staff Role to Configure
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {roles.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      style={{
                        padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: selectedRole === r ? 'var(--brand)' : 'var(--surface-2)',
                        color: selectedRole === r ? '#fff' : 'var(--text-2)',
                        border: '1.5px solid var(--border)', textTransform: 'capitalize',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles list */}
              <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
                {permissionLabels.map((p, idx) => {
                  const isChecked = privileges[selectedRole]?.[p.key] ?? false
                  return (
                    <div
                      key={p.key}
                      onClick={() => handleToggle(p.key)}
                      style={{
                        padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', borderBottom: idx < permissionLabels.length - 1 ? '1px solid var(--border)' : 'none',
                        background: isChecked ? 'rgba(var(--brand-rgb, 0,0,0), 0.02)' : 'transparent',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{p.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '2px 0 0' }}>{p.desc}</p>
                      </div>
                      <div style={{
                        width: 42, height: 24, borderRadius: 12, background: isChecked ? 'var(--brand)' : 'var(--border)',
                        position: 'relative', transition: 'background 0.2s', display: 'flex', alignItems: 'center',
                        padding: '0 2px', flexShrink: 0,
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%0', background: '#fff',
                          transform: isChecked ? 'translateX(18px)' : 'translateX(0)',
                          transition: 'transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '10px 18px', borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)', flexShrink: 0, gap: 8,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 34, padding: '0 16px', borderRadius: 9,
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              height: 34, padding: '0 20px', borderRadius: 9, border: 'none',
              background: 'var(--brand)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            Save Privileges
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}