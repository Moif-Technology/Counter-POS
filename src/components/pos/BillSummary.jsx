import { usePosStore } from '../../store/posStore'
import { fmt3 } from '../../lib/utils'
import { Wallet, Save, Receipt } from 'lucide-react'

const PAYMENT_COLORS = {
  CASH:   { color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  CARD:   { color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  CREDIT: { color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  MULTI:  { color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, color: 'var(--text-4)',
      letterSpacing: 1, marginBottom: 7, textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

function SummaryRow({ label, value, muted, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
      <span style={{ fontSize: 11, color: muted ? 'var(--text-4)' : 'var(--text-3)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 11.5, fontWeight: bold ? 700 : 600,
        color: muted ? 'var(--text-4)' : bold ? 'var(--text-1)' : 'var(--text-2)',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {value}
      </span>
    </div>
  )
}

export default function BillSummary() {
  const {
    customerName, customerCode, osAmount,
    subTotal, discountAmt, taxableAmt, taxAmt, voucherAmt,
    roundOff, netAmount, paidAmount, balanceAmount,
    paymentMode, setPayment,
  } = usePosStore()

  const mc = PAYMENT_COLORS[paymentMode] || PAYMENT_COLORS.CASH

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Customer (compact single row) ────────── */}
      <div style={{ padding: '7px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {customerName || 'Walk-in Customer'}
            </div>
            {osAmount > 0 && (
              <div style={{ fontSize: 9.5, color: 'var(--amber)', fontWeight: 700 }}>
                O/S: {fmt3(osAmount)}
              </div>
            )}
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
            background: mc.bg, border: `1px solid ${mc.border}`,
            borderRadius: 5, padding: '3px 8px',
            color: mc.color, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: mc.color, display: 'inline-block' }} />
            {paymentMode}
          </span>
        </div>
      </div>

      {/* ── Bill Breakdown ───────────────────────── */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <SectionLabel>Bill Summary</SectionLabel>
        <SummaryRow label="Sub Total"   value={fmt3(subTotal)} />
        <SummaryRow label="Discount"    value={fmt3(discountAmt)} muted={discountAmt === 0} />
        <SummaryRow label="Taxable Amt" value={fmt3(taxableAmt)} />
        <SummaryRow label="Tax Amount"  value={fmt3(taxAmt)} />
        {voucherAmt > 0 && <SummaryRow label="Voucher" value={`- ${fmt3(voucherAmt)}`} />}
        <SummaryRow label="Round Off"   value={fmt3(roundOff)} muted={roundOff === 0} />
      </div>

      {/* ── Payment Input ────────────────────────── */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <SectionLabel>Payment</SectionLabel>

        <label style={{ display: 'block', fontSize: 10, color: 'var(--text-3)', fontWeight: 600, marginBottom: 5 }}>
          Paid Amount
        </label>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Wallet size={12} color="var(--text-3)" style={{
            position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
          }} />
          <input
            type="number"
            value={paidAmount || ''}
            onChange={e => setPayment(parseFloat(e.target.value) || 0)}
            placeholder="0.000"
            style={{
              width: '100%', padding: '8px 10px 8px 28px',
              borderRadius: 'var(--r-md)',
              background: 'var(--bg)', border: '1.5px solid var(--border)',
              color: 'var(--text-1)', fontSize: 14, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: 'tabular-nums',
              transition: 'border-color 0.13s, box-shadow 0.13s',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 3px var(--brand-glow)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Balance</span>
          <span style={{
            fontSize: 18, fontWeight: 800, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: "'JetBrains Mono', monospace",
            color: balanceAmount >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {fmt3(balanceAmount)}
          </span>
        </div>
      </div>

      {/* ── Save + Bill buttons ─────────────────── */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button
            style={{
              padding: '13px 0', borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--green-border)',
              background: 'var(--green-bg)', color: 'var(--green)',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.11s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-bg)'; e.currentTarget.style.color = 'var(--green)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Save size={14} /> Save
          </button>
          <button
            style={{
              padding: '13px 0', borderRadius: 'var(--r-md)',
              border: 'none',
              background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
              color: '#fff',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 3px 10px rgba(107,0,0,0.2)',
              transition: 'all 0.11s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 16px rgba(107,0,0,0.32)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(107,0,0,0.2)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Receipt size={14} /> Bill
          </button>
        </div>
      </div>

      {/* ── Net Total ────────────────────────────── */}
      <div style={{
        padding: '14px 14px 16px',
        background: 'var(--brand-bg)',
        flexShrink: 0,
        marginTop: 'auto',
      }}>
        <div style={{
          fontSize: 9, fontWeight: 800, color: 'var(--brand)',
          opacity: 0.5, letterSpacing: 1, marginBottom: 5, textTransform: 'uppercase',
        }}>
          Total Amount
        </div>
        <div style={{
          fontSize: 34, fontWeight: 900, color: 'var(--brand)',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1, letterSpacing: '-1px',
        }}>
          {fmt3(netAmount)}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--brand)', opacity: 0.45,
          marginTop: 5, fontWeight: 700, letterSpacing: 1,
        }}>
          AED
        </div>
      </div>

    </div>
  )
}
