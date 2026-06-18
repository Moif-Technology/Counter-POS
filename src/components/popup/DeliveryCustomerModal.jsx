import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Truck, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { usePosStore } from '../../store/posStore'

function defaultDeliveryTime() {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 60)
  d.setSeconds(0, 0)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function DeliveryCustomerModal({ onClose, onConfirm, title = 'Delivery Details' }) {
  const accessToken = usePosStore(s => s.accessToken)
  const storeCustomerId = usePosStore(s => s.customerId)
  const storeCustomerName = usePosStore(s => s.customerName)
  const storeCustomerCode = usePosStore(s => s.customerCode)
  const storeDeliveryPhone = usePosStore(s => s.deliveryPhone)
  const storeDeliveryAddress = usePosStore(s => s.deliveryAddress)
  const storeDeliveryTime = usePosStore(s => s.deliveryTime)

  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [phone, setPhone] = useState(storeDeliveryPhone || '')
  const [address, setAddress] = useState(storeDeliveryAddress || '')
  const [deliveryTime, setDeliveryTime] = useState(storeDeliveryTime || defaultDeliveryTime())
  const overlayRef = useRef()
  const debounceRef = useRef()

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const doSearch = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const { customers: list } = await api.counterPos.customerSearch(q, 80, accessToken)
      setCustomers(list ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { doSearch('') }, [doSearch])

  useEffect(() => {
    if (!storeCustomerId || selected) return
    const match = customers.find(c => Number(c.customerId) === Number(storeCustomerId))
    if (match) {
      setSelected(match)
      if (!phone && match.mobileNo) setPhone(match.mobileNo)
    } else if (storeCustomerName) {
      setSelected({
        customerId: storeCustomerId,
        customerCode: storeCustomerCode,
        customerName: storeCustomerName,
        mobileNo: storeDeliveryPhone || '',
      })
    }
  }, [customers, storeCustomerId, storeCustomerName, storeCustomerCode, storeDeliveryPhone, selected, phone])

  const scheduleSearch = (q) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 280)
  }

  const pickCustomer = (c) => {
    setSelected(c)
    if (c.mobileNo) setPhone(c.mobileNo)
    setError(null)
  }

  const handleConfirm = () => {
    if (!selected?.customerId) {
      setError('Select a customer for delivery')
      return
    }
    if (!deliveryTime) {
      setError('Delivery time is required')
      return
    }
    if (!String(address).trim()) {
      setError('Delivery address is required')
      return
    }
    onConfirm?.({
      customerId: selected.customerId,
      customerName: selected.customerName,
      customerCode: selected.customerCode ?? '',
      mobileNo: selected.mobileNo ?? phone,
      telephone: selected.telephone ?? null,
      taxRegNo: selected.taxRegNo ?? null,
      customerAddress: selected.address ?? null,
      deliveryPhone: phone.trim(),
      deliveryAddress: address.trim(),
      deliveryTime: new Date(deliveryTime).toISOString(),
    })
  }

  return (
    <div
      ref={overlayRef}
      data-pos-overlay
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,13,10,0.42)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 560, maxWidth: '95vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Truck size={18} color="#fff" />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{title}</span>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)',
              fontSize: 12, fontWeight: 600,
            }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Search Customer
          </label>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); scheduleSearch(e.target.value) }}
            placeholder="Name, code, or mobile…"
            autoFocus
            style={{
              width: '100%', marginTop: 4, marginBottom: 10, height: 38,
              border: '1.5px solid var(--border)', borderRadius: 10, padding: '0 12px',
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />

          <div style={{
            maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)',
            borderRadius: 10, marginBottom: 14,
          }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading…
              </div>
            ) : customers.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>No customers</div>
            ) : customers.map((c, i) => {
              const active = selected?.customerId === c.customerId
              return (
                <div
                  key={c.customerId ?? i}
                  onClick={() => pickCustomer(c)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer',
                    background: active ? 'var(--brand-bg)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{c.customerName}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                    {c.customerCode}{c.mobileNo ? ` · ${c.mobileNo}` : ''}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Phone</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{
                  width: '100%', marginTop: 4, height: 36, border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '0 10px', fontSize: 13, boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Delivery Time</label>
              <input
                type="datetime-local"
                value={deliveryTime}
                onChange={e => setDeliveryTime(e.target.value)}
                style={{
                  width: '100%', marginTop: 4, height: 36, border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '0 8px', fontSize: 12, boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Delivery Address</label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            rows={3}
            placeholder="Building, street, area…"
            style={{
              width: '100%', marginTop: 4, border: '1.5px solid var(--border)',
              borderRadius: 10, padding: 10, fontSize: 13, resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, height: 40, borderRadius: 10, border: '1.5px solid var(--border)',
            background: 'var(--surface-2)', fontWeight: 700, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleConfirm} style={{
            flex: 1, height: 40, borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
            color: '#fff', fontWeight: 800, cursor: 'pointer',
          }}>Confirm</button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
