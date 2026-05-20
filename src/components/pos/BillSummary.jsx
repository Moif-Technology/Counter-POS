import { usePosStore } from '../../store/posStore'
import { fmt3 } from '../../lib/utils'
import { Wallet } from 'lucide-react'

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: bold ? 700 : 500,
        color: bold ? 'var(--text-1)' : 'var(--text-2)',
        fontVariantNumeric: 'tabular-nums', fontFamily: "'DM Mono', monospace",
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

  const modeMap = {
    CASH:   { color: 'var(--green)',  bg: 'var(--green-bg)',  border: '#bbf7d0' },
    CARD:   { color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: '#bfdbfe' },
    CREDIT: { color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: '#fde68a' },
    MULTI:  { color: 'var(--purple)', bg: 'var(--purple-bg)', border: '#ddd6fe' },
  }
  const mc = modeMap[paymentMode] || modeMap.CASH

  const divider = <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

  return (
    <div style={{ display: 'flex', height: '100%' }}>

      {/* Customer */}
      <div style={{ width: 195, padding: '12px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, marginBottom: 5 }}>CUSTOMER</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
          {customerName || 'Walk-in Customer'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{customerCode || '—'}</div>
        {osAmount > 0 && <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>OS: {fmt3(osAmount)}</div>}
        <div style={{ marginTop: 'auto' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: mc.bg, border: `1px solid ${mc.border}`,
            borderRadius: 6, padding: '4px 10px',
            color: mc.color, fontSize: 11, fontWeight: 700,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: mc.color, display: 'inline-block' }} />
            {paymentMode}
          </span>
        </div>
      </div>

      {divider}

      {/* Summary rows */}
      <div style={{ flex: 1, padding: '12px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, marginBottom: 8 }}>BILL SUMMARY</div>
        <Row label="Sub Total" value={fmt3(subTotal)} />
        <Row label="Discount" value={fmt3(discountAmt)} />
        <Row label="Taxable Amount" value={fmt3(taxableAmt)} />
        <Row label="Tax Amount" value={fmt3(taxAmt)} />
        {voucherAmt > 0 && <Row label="Voucher" value={fmt3(voucherAmt)} />}
        <Row label="Round Off" value={fmt3(roundOff)} />
      </div>

      {divider}

      {/* Payment input */}
      <div style={{ width: 200, padding: '12px 14px', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, marginBottom: 10 }}>PAYMENT</div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>Paid Amount</label>
          <div style={{ position: 'relative' }}>
            <Wallet size={13} color="var(--text-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="number"
              value={paidAmount || ''}
              onChange={e => setPayment(parseFloat(e.target.value) || 0)}
              placeholder="0.000"
              style={{
                width: '100%', padding: '9px 10px 9px 30px', borderRadius: 8,
                background: 'var(--bg)', border: '1.5px solid var(--border)',
                color: 'var(--text-1)', fontSize: 14, fontWeight: 700,
                fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(92,0,0,0.08)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>Balance</span>
          <span style={{
            fontSize: 15, fontWeight: 800,
            fontVariantNumeric: 'tabular-nums', fontFamily: "'DM Mono', monospace",
            color: balanceAmount >= 0 ? 'var(--green)' : 'var(--brand)',
          }}>
            {fmt3(balanceAmount)}
          </span>
        </div>
      </div>

      {divider}

      {/* Net total */}
      <div style={{
        width: 196, padding: '12px 16px', flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        background: 'var(--brand-bg)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', letterSpacing: 1, marginBottom: 6, opacity: 0.7 }}>
          TOTAL AMOUNT
        </div>
        <div style={{
          fontSize: 36, fontWeight: 900, color: 'var(--brand)',
          fontVariantNumeric: 'tabular-nums', fontFamily: "'DM Mono', monospace",
          lineHeight: 1, letterSpacing: '-1px',
        }}>
          {fmt3(netAmount)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--brand)', opacity: 0.5, marginTop: 5, fontWeight: 600 }}>AED</div>
      </div>

    </div>
  )
}
