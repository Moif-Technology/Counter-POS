import { Percent, XCircle } from 'lucide-react'
import { fmtMoney, moneyPlaceholder } from '../../lib/currencyFormat'

function SummaryRow({ label, value, highlight, muted, minus }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0',
      borderBottom: highlight ? 'none' : '1px dashed var(--border)',
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: muted ? 'var(--text-4)' : highlight ? 'var(--brand)' : 'var(--text-3)',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: highlight ? 16 : 13,
        fontWeight: highlight ? 900 : 700,
        color: minus ? 'var(--amber)' : highlight ? 'var(--brand)' : 'var(--text-1)',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {minus && value !== fmtMoney(0) ? `− ${value}` : value}
      </span>
    </div>
  )
}

export default function DiscountEntryPanel({
  contextLabel,
  contextHint,
  taxableBefore,
  discountAmt,
  taxableAfter,
  totalWithVat,
  totalLabel = 'Total (incl. VAT)',
  mode,
  setMode,
  displayPct,
  displayAmt,
  onKey,
  applyPreset,
  onClear,
  onDone,
  onClose,
}) {
  const press = e => { e.currentTarget.style.transform = 'scale(0.91)' }
  const release = e => { e.currentTarget.style.transform = 'scale(1)' }

  const NumBtn = ({ label, keyVal, flex = 1, style = {}, onClick }) => (
    <button
      type="button"
      onClick={onClick ?? (() => onKey(keyVal ?? label))}
      onMouseDown={press}
      onMouseUp={release}
      style={{
        flex, height: 48, borderRadius: 10,
        border: '1.5px solid var(--border)', background: '#fff',
        color: 'var(--text-1)', fontSize: 17, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit', ...style,
      }}
      onMouseEnter={e => {
        if (!style.background) {
          e.currentTarget.style.background = 'var(--brand-bg)'
          e.currentTarget.style.borderColor = 'var(--brand-border)'
          e.currentTarget.style.color = 'var(--brand)'
        } else {
          e.currentTarget.style.filter = 'brightness(0.92)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = 'brightness(1)'
        if (!style.background) {
          e.currentTarget.style.background = '#fff'
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-1)'
        }
      }}
    >
      {label}
    </button>
  )

  const tabStyle = active => ({
    flex: 1, height: 36, borderRadius: 8, border: 'none',
    fontSize: 12, fontWeight: 800, cursor: 'pointer',
    background: active ? 'var(--brand)' : 'var(--surface-2)',
    color: active ? '#fff' : 'var(--text-3)',
    transition: 'all 0.12s',
  })

  const inputValue = mode === 'pct'
    ? (displayPct || moneyPlaceholder())
    : (displayAmt || moneyPlaceholder())

  return (
    <div className="dc-body" style={{ display: 'flex', overflow: 'hidden' }}>
      <div className="dc-left" style={{
        flex: 1, padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 14,
        borderRight: '1px solid var(--border)',
      }}>
        {contextLabel && (
          <div style={{
            padding: '9px 12px', borderRadius: 10,
            background: 'var(--brand-bg)', border: '1.5px solid var(--brand-border)',
            fontSize: 12, fontWeight: 800, color: 'var(--brand)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {contextLabel}
          </div>
        )}

        {contextHint && (
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', margin: 0, lineHeight: 1.4 }}>
            {contextHint}
          </p>
        )}

        {/* Summary — clear before → discount → after flow */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: 'var(--surface-2)', border: '1.5px solid var(--border)',
        }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: 'var(--text-4)',
            letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
          }}>
            Summary
          </div>
          <SummaryRow label="Taxable (before discount)" value={fmtMoney(taxableBefore)} />
          <SummaryRow label="Discount" value={fmtMoney(discountAmt)} minus muted />
          <div style={{
            margin: '8px 0', padding: '8px 10px', borderRadius: 8,
            background: 'var(--brand-bg)', border: '1.5px solid var(--brand-border)',
          }}>
            <SummaryRow label="Taxable (after discount)" value={fmtMoney(taxableAfter)} highlight />
          </div>
          <SummaryRow label={totalLabel} value={fmtMoney(totalWithVat)} />
        </div>

        {/* Single entry area */}
        <div>
          <div style={{
            fontSize: 9, fontWeight: 800, color: 'var(--text-4)',
            letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Enter discount
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button type="button" onClick={() => setMode('pct')} style={tabStyle(mode === 'pct')}>
              By %
            </button>
            <button type="button" onClick={() => setMode('amt')} style={tabStyle(mode === 'amt')}>
              By Amount
            </button>
          </div>
          <div style={{
            height: 52, borderRadius: 10,
            border: '2px solid var(--amber-border)',
            background: 'var(--amber-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '0 14px',
          }}>
            <Percent size={16} color="var(--amber)" style={{ flexShrink: 0, opacity: mode === 'pct' ? 1 : 0.35 }} />
            <span style={{
              flex: 1, textAlign: 'center',
              fontSize: 22, fontWeight: 900, color: 'var(--amber)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {inputValue}
            </span>
            {mode === 'pct' && (
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--amber)', flexShrink: 0 }}>%</span>
            )}
          </div>
          {mode === 'pct' && displayAmt && (
            <p style={{ fontSize: 10, color: 'var(--text-4)', margin: '6px 0 0', textAlign: 'center', minHeight: 14 }}>
              = {fmtMoney(discountAmt)} off taxable
            </p>
          )}
          {mode === 'amt' && displayPct && (
            <p style={{ fontSize: 10, color: 'var(--text-4)', margin: '6px 0 0', textAlign: 'center', minHeight: 14 }}>
              = {displayPct}% of taxable
            </p>
          )}
          {!(mode === 'pct' && displayAmt) && !(mode === 'amt' && displayPct) && (
            <p style={{ minHeight: 20, margin: '6px 0 0' }} />
          )}
        </div>
      </div>

      <div className="dc-right" style={{
        width: 252, flexShrink: 0, padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {[
          { digits: ['7', '8', '9'], preset: 5 },
          { digits: ['4', '5', '6'], preset: 10 },
          { digits: ['1', '2', '3'], preset: 25 },
        ].map(({ digits, preset }) => (
          <div key={preset} style={{ display: 'flex', gap: 5 }}>
            {digits.map(d => <NumBtn key={d} label={d} />)}
            {mode === 'pct' && (
              <NumBtn
                label={`${preset}%`}
                onClick={() => applyPreset(preset)}
                style={{
                  background: 'var(--amber-bg)', borderColor: 'var(--amber-border)',
                  color: 'var(--amber)', fontSize: 12, fontWeight: 800,
                }}
              />
            )}
            {mode === 'amt' && <div style={{ flex: 1 }} />}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 5 }}>
          <NumBtn label="0" />
          <NumBtn label="." />
          <NumBtn
            label={<XCircle size={17} />}
            onClick={onClear}
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-3)' }}
          />
          <NumBtn
            label="Cancel"
            onClick={onClose}
            style={{ background: 'var(--red-bg)', borderColor: 'var(--red-border)', color: 'var(--red)', fontSize: 10, fontWeight: 800 }}
          />
        </div>

        <button
          type="button"
          onClick={onDone}
          onMouseDown={press}
          onMouseUp={release}
          style={{
            height: 50, borderRadius: 10, border: 'none', marginTop: 4,
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
            color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(107,0,0,0.22)',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
