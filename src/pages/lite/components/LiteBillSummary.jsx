import { ChevronDown, ChevronUp, Receipt } from 'lucide-react'
import { fmtMoney } from '../../../lib/currencyFormat'
import { LITE_TAX_RATE } from '../../../config/appConfig'
import SummaryRow from './SummaryRow'

export default function LiteBillSummary({
  expanded, setExpanded, itemCount, total,
  subTotal, discountAmt, taxableAmt, taxAmt, roundOff,
  customerName, paymentModeLabel, priceLevel,
  salesMan, isDelivery, deliveryAddress, billComment,
}) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 2,
      marginBottom: 12, borderRadius: 'var(--r-md)',
      border: '1px solid var(--border)', overflow: 'hidden',
      background: 'var(--surface)', boxShadow: 'var(--shadow-xs)',
    }}>
      <div
        className="lite-btn"
        onClick={() => setExpanded(e => !e)}
        title="Tap to expand"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', gap: 10,
          cursor: 'pointer', userSelect: 'none',
          minHeight: 36,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Receipt size={12} color="var(--text-3)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 17, fontWeight: 800, color: 'var(--brand)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {fmtMoney(total)}
          </span>
          {expanded
            ? <ChevronUp size={13} color="var(--text-3)" />
            : <ChevronDown size={13} color="var(--text-3)" />
          }
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
          <SummaryRow label="Sub Total" value={fmtMoney(subTotal)} />
          <SummaryRow label="Discount" value={fmtMoney(discountAmt)} muted={!discountAmt} />
          <SummaryRow label="Taxable Amt" value={fmtMoney(taxableAmt)} />
          <SummaryRow label={`Tax (${LITE_TAX_RATE}%)`} value={fmtMoney(taxAmt)} />
          {roundOff !== 0 && <SummaryRow label="Round Off" value={fmtMoney(roundOff)} muted />}
          <div style={{ height: 1, background: 'var(--border)', margin: '5px 0' }} />
          <SummaryRow label="Customer" value={customerName || 'Walk-in'} />
          <SummaryRow label="Mode" value={paymentModeLabel} />
          <SummaryRow label="Price Level" value={priceLevel} muted={priceLevel === 'Retail'} />
          {salesMan && <SummaryRow label="Sales Man" value={salesMan} />}
          {isDelivery && <SummaryRow label="Delivery" value={deliveryAddress || 'Yes'} accent="red" />}
          {billComment && <SummaryRow label="Comment" value={billComment} muted />}
          <SummaryRow label="Paid Amount" value={fmtMoney(total)} bold />
          <SummaryRow label="Balance" value={fmtMoney(0)} accent="green" />
        </div>
      )}
    </div>
  )
}
