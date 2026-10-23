import { useState, useEffect } from 'react'
import { UserCheck, ShieldCheck, RefreshCw } from 'lucide-react'
import { usePosStore } from '../store/posStore'
import Modal from '../components/common/Modal'

export default function CashierChangeModal({ onClose }) {
  const setAuthStaff = usePosStore(s => s.setAuthStaff)

  const [staffList, setStaffList] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingStaff, setFetchingStaff] = useState(true)
  const [error, setError] = useState(null)

  // Load mock staff list on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const mockStaff = [
        { id: '1', name: 'Alex Johnson', role: 'Supervisor' },
        { id: '2', name: 'Sarah Connor', role: 'Cashier' },
        { id: '3', name: 'Michael Smith', role: 'Cashier' },
        { id: '4', name: 'Admin User', role: 'Manager' },
      ]
      setStaffList(mockStaff)
      setSelectedStaffId(mockStaff[0].id)
      setFetchingStaff(false)
    }, 400) // slight simulated network delay

    return () => clearTimeout(timer)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedStaffId) {
      setError('Please select a cashier')
      return
    }
    setLoading(true)
    setError(null)

    // Simulate backend verification delay
    setTimeout(() => {
      const chosenStaff = staffList.find(s => s.id === selectedStaffId)
      
      // Mock validation rule: accept any PIN as long as it's not empty (or check for '1234')
      if (pin.trim() === '' ) {
        setError('Please enter a security PIN')
        setLoading(false)
        return
      }

      // Success: update auth staff store and close
      setAuthStaff({
        id: chosenStaff.id,
        name: chosenStaff.name,
        role: chosenStaff.role
      })
      setLoading(false)
      onClose()
    }, 600)
  }

  return (
    <Modal
      onClose={onClose}
      icon={UserCheck}
      kicker="Operations"
      title="Cashier Change (Mock Mode)"
      zIndex={1100}
      width={440}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Form Body */}
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

        {fetchingStaff ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, color: 'var(--text-3)', fontSize: 12 }}>
            <RefreshCw size={16} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />
            Loading mock staff...
          </div>
        ) : (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
                Select Cashier
              </label>
              <select
                value={selectedStaffId}
                onChange={e => setSelectedStaffId(e.target.value)}
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 9,
                  border: '1.5px solid var(--border)', background: 'var(--surface)',
                  fontSize: 13, fontWeight: 600, color: 'var(--text-1)', outline: 'none',
                }}
              >
                {staffList.map(st => (
                  <option key={st.id} value={st.id}>{st.name} ({st.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
                Security PIN / Password <span style={{ fontWeight: 400, color: 'var(--text-4)' }}>(Type any PIN)</span>
              </label>
              <input data-system-keyboard
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter PIN (e.g., 1234)"
                autoFocus
                style={{
                  width: '100%', height: 40, padding: '0 12px', borderRadius: 9,
                  border: '1.5px solid var(--border)', background: 'var(--surface)',
                  fontSize: 14, fontWeight: 700, color: 'var(--text-1)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </>
        )}

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
            disabled={loading || fetchingStaff}
            style={{
              flex: 1, height: 38, borderRadius: 9,
              border: 'none', background: 'var(--brand)',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={14} />}
            Switch Cashier
          </button>
        </div>
      </form>
    </Modal>
  )
}