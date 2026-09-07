import { ChevronDown, Keyboard, User } from 'lucide-react'
import NeumorphicKeyboard from './common/NeumorphicKeyboard'
import { fmtMoney } from '../../../lib/currencyFormat'
import { PM, normalizePaymentMode } from '../../../lib/paymentModes'

export default function LiteCustomerPicker({
  customerName, customersList,
  showCustomers, setShowCustomers,
  customerQuery, setCustomerQuery,
  showCustomerKeyboard, setShowCustomerKeyboard,
  onSelectCustomer, onCustomerKbKey,
}) {
  const q = customerQuery.trim().toLowerCase()
  const matches = (c) =>
    c.customerName.toLowerCase().includes(q)
    || c.customerCode.toLowerCase().includes(q)
    || c.mobileNo.includes(q)
  const filtered = customersList.filter(c => !q || matches(c))

  return (
    <>
      <button
        className="lite-btn"
        onClick={() => setShowCustomers(o => {
          const next = !o
          if (next) setCustomerQuery('')
          setShowCustomerKeyboard(false)
          return next
        })}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', padding: '6px 9px', marginBottom: 'clamp(4px, 1vh, 8px)', minHeight: 30,
          borderRadius: 'var(--r-md)',
          border: `1.5px solid ${customerName ? 'var(--blue-border)' : 'var(--border)'}`,
          background: customerName ? 'var(--blue-bg)' : 'var(--surface)',
          color: customerName ? 'var(--blue)' : 'var(--text-2)',
          cursor: 'pointer', fontSize: 10.5, fontWeight: 600,
        }}
      >
        <User size={11} />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {customerName || 'Walk-in Customer'}
        </span>
        <ChevronDown size={10} />
      </button>

      {showCustomers && (
        <>
          {/* Backdrop — click outside to dismiss */}
          <div
            onClick={() => { setShowCustomers(false); setShowCustomerKeyboard(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 8 }}
          />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 48, left: 0, right: 0, zIndex: 9,
              maxHeight: 340, display: 'flex', flexDirection: 'column',
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-md)', boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', gap: 6, padding: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input
                autoFocus
                value={customerQuery}
                onChange={e => setCustomerQuery(e.target.value)}
                placeholder="Search name, code or mobile…"
                style={{
                  flex: 1, height: 36, boxSizing: 'border-box', padding: '0 11px', borderRadius: 'var(--r-md)',
                  border: '1.5px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text-1)', fontSize: 12.5, outline: 'none',
                }}
              />
              <button
                className="lite-btn"
                onClick={() => setShowCustomerKeyboard(o => !o)}
                title="On-screen keyboard"
                style={{
                  width: 36, height: 36, boxSizing: 'border-box', borderRadius: 'var(--r-md)', flexShrink: 0,
                  border: `1.5px solid ${showCustomerKeyboard ? 'var(--brand)' : 'var(--border)'}`,
                  background: showCustomerKeyboard ? 'var(--brand-bg)' : 'var(--surface)',
                  color: showCustomerKeyboard ? 'var(--brand)' : 'var(--text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <Keyboard size={15} />
              </button>
            </div>
            <div className="lite-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {!q && (
                <div
                  className="lite-btn"
                  onClick={() => onSelectCustomer(null)}
                  style={{
                    padding: '10px 12px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', background: !customerName ? 'var(--brand-bg)' : 'transparent',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>Walk-in Customer</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>Cash sale — no customer account</div>
                </div>
              )}
              {filtered.map(c => (
                <div
                  key={c.customerId}
                  className="lite-btn"
                  onClick={() => onSelectCustomer(c)}
                  style={{
                    padding: '10px 12px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: customerName === c.customerName ? 'var(--brand-bg)' : 'transparent',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>
                    {c.customerName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                      {c.customerCode} · {c.mobileNo}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {normalizePaymentMode(c.paymentMode) !== PM.CASH && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, color: 'var(--amber)',
                          background: 'var(--amber-bg)', border: '1px solid var(--amber-border)',
                          borderRadius: 4, padding: '1px 5px',
                        }}>
                          {normalizePaymentMode(c.paymentMode)}
                        </span>
                      )}
                      {c.osAmount > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>
                          O/S {fmtMoney(c.osAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {q && filtered.length === 0 && (
                <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>
                  No customers found
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showCustomers && showCustomerKeyboard && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10,
            boxShadow: '0 -8px 28px rgba(0,0,0,0.18)',
          }}
        >
          <NeumorphicKeyboard
            onKey={onCustomerKbKey}
            onClose={() => setShowCustomerKeyboard(false)}
          />
        </div>
      )}
    </>
  )
}
