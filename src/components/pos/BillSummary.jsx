import { useState } from 'react'
import { usePosStore } from '../../store/posStore'
import { normalizePaymentMode } from '../../lib/paymentModes'
import { getGvTax } from '../../lib/gvtax'
import { fmt3 } from '../../lib/utils'
import { ChevronUp, ChevronDown, Receipt } from 'lucide-react'

function SummaryRow({ label, value, accent, muted, bold, large }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0',
    }}>
      <span style={{
        fontSize: large ? 12 : 11,
        color: muted ? 'var(--text-4)' : 'var(--text-3)',
        fontWeight: bold ? 700 : 500,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: large ? 13 : 11.5,
        fontWeight: bold ? 800 : 600,
        color: accent === 'red'
          ? 'var(--red)'
          : accent === 'green'
            ? 'var(--green)'
            : bold
              ? 'var(--text-1)'
              : muted
                ? 'var(--text-4)'
                : 'var(--text-2)',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {value}
      </span>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
}

export default function BillSummary() {
  const [collapsed, setCollapsed] = useState(false)

  const {
    subTotal, lineDiscountAmt, billDiscountAmt, discountAmt, taxableAmt, taxAmt, voucherAmt,
    roundOff, netAmount, paidAmount, balanceAmount,
    paymentMode,
  } = usePosStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Collapsible section header ────────────── */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px 9px',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Receipt size={13} color="var(--text-3)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>Bill Summary</span>
        </div>
        {collapsed
          ? <ChevronDown size={14} color="var(--text-3)" />
          : <ChevronUp   size={14} color="var(--text-3)" />
        }
      </div>

      {/* ── Summary rows ─────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '8px 14px' }}>
          <SummaryRow label="Sub Total"       value={fmt3(subTotal)} />
          {lineDiscountAmt > 0 && (
            <SummaryRow label="Line Discount" value={fmt3(lineDiscountAmt)} muted />
          )}
          {billDiscountAmt > 0 && (
            <SummaryRow label="Bill Discount" value={fmt3(billDiscountAmt)} muted />
          )}
          {lineDiscountAmt <= 0 && billDiscountAmt <= 0 && (
            <SummaryRow label="Discount" value={fmt3(discountAmt)} muted />
          )}
          <SummaryRow label="Taxable Amt"     value={fmt3(taxableAmt)} />
          <SummaryRow label={`Tax Amount (${getGvTax()}%)`} value={fmt3(taxAmt)} />
          {voucherAmt > 0 && (
            <SummaryRow label="Voucher" value={`- ${fmt3(voucherAmt)}`} />
          )}
          <SummaryRow label="Round Off" value={fmt3(roundOff)} muted={roundOff === 0} />
        </div>
      )}

      {/* ── Payment (always visible) ─────────────── */}
      <div style={{ padding: '8px 14px', borderTop: collapsed ? '1px solid var(--border)' : 'none' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
          Payment
        </div>

        <SummaryRow label="Paid Amount" value={fmt3(paidAmount)} bold />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Balance</span>
          <span style={{
            fontSize: 16, fontWeight: 800, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: "'JetBrains Mono', monospace",
            color: balanceAmount >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {fmt3(balanceAmount)}
          </span>
        </div>
      </div>

      {/* ── Net total strip (always visible) ─────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        background: 'var(--brand-bg)',
        borderTop: '1px solid var(--brand-border)',
        borderBottom: '1px solid var(--brand-border)',
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--brand)', opacity: 0.6, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
            Total Amount
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{
              fontSize: 26, fontWeight: 900, color: 'var(--brand)',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1, letterSpacing: '-0.5px',
            }}>
              {fmt3(netAmount)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', opacity: 0.5 }}>AED</span>
          </div>
        </div>
        <div style={{
          background: 'var(--brand)', borderRadius: 'var(--r-md)',
          padding: '4px 10px',
          fontSize: 9, fontWeight: 800, color: '#fff',
          letterSpacing: 0.6, textTransform: 'uppercase',
        }}>
          {normalizePaymentMode(paymentMode)}
        </div>
      </div>

    </div>
  )
}
