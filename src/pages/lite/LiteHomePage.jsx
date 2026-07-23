import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronUp, Receipt, MoreHorizontal, X,
  PauseCircle, Archive, Minus, RotateCcw,
  Search, Tag, SlidersHorizontal, Grid3x3, Package, Percent, DollarSign,
  User, Crown, BarChart2, ArrowLeftRight, FileText, Hash, Lock, Layers, Truck, Save,
  Banknote, CreditCard, UserCheck, Layers as LayersIcon,
} from 'lucide-react'
import { fmtMoney } from '../../lib/currencyFormat'
import { LITE_TAX_RATE } from '../../config/appConfig'
import { LITE_GROUPS, searchLiteProducts } from './liteProducts'
import { LITE_CUSTOMERS } from './liteCustomers'
import { printReceipt } from '../../lib/printReceipt'
import { posNotifyError, posNotifyInfo, posNotifySuccess, posNotifyWarning } from '../../lib/posNotify'
import { PM, normalizePaymentMode } from '../../lib/paymentModes'

const NUMPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫']

const PAYMENT_MODES = [
  { key: PM.CASH,         label: 'Cash',     icon: Banknote },
  { key: PM.CREDITCARD,   label: 'Card',     icon: CreditCard },
  { key: PM.CREDIT,       label: 'Credit',   icon: UserCheck },
  { key: PM.MULTIPAYMENT, label: 'Multi',    icon: LayersIcon },
]

/* Mirrors the main POS's feature grid — most actions are informational in Lite mode. */
const MORE_OPTIONS = [
  { label: 'Hold Bill',    icon: PauseCircle,      color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Recall',       icon: Archive,          color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Clear Line',   icon: Minus,            color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
  { label: 'Return',       icon: RotateCcw,        color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
  { label: 'Discount',     icon: Percent,          color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Look Up',      icon: Search,           color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Price Change', icon: Tag,              color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Qty Change',   icon: SlidersHorizontal,color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Group',        icon: Grid3x3,          color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Packet Scan',  icon: Package,          color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'Price Enquiry',icon: Search,           color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Currency',     icon: DollarSign,       color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Sales Man',    icon: User,             color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Privilege',    icon: Crown,            color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Report',       icon: BarChart2,        color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'Cash In/Out',  icon: ArrowLeftRight,   color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Comments',     icon: FileText,         color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'NP Scale',     icon: Hash,             color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Lock',         icon: Lock,             color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
  { label: 'Price Level',  icon: Layers,           color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Delivery',     icon: Truck,            color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Save Delivery',icon: Save,             color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Settlement',   icon: Receipt,          color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
]

let liteBillSeq = 1

export default function LiteHomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState(null)
  const [cart, setCart] = useState([]) // { productId, barcode, description, price, qty }
  const [selectedId, setSelectedId] = useState(null)
  const [qtyBuffer, setQtyBuffer] = useState('')
  const [saving, setSaving] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [heldBills, setHeldBills] = useState([]) // { id, cart }
  const [discountPct, setDiscountPct] = useState(0)
  const [paymentMode, setPaymentMode] = useState(PM.CASH)
  const [customer, setCustomerSel] = useState(null) // null = Walk-in Customer
  const [showCustomers, setShowCustomers] = useState(false)

  const results = useMemo(() => searchLiteProducts(query, activeGroup), [query, activeGroup])

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.productId)
      if (existing) {
        return prev.map(i =>
          i.productId === product.productId ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, { ...product, qty: 1 }]
    })
    setSelectedId(product.productId)
    setQtyBuffer('')
  }

  const changeQty = (productId, delta) => {
    const current = cart.find(i => i.productId === productId)
    const willRemove = current && current.qty + delta <= 0
    setCart(prev => prev
      .map(i => i.productId === productId ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    )
    if (willRemove && selectedId === productId) {
      setSelectedId(null)
      setQtyBuffer('')
    }
  }

  const removeItem = (productId) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
    if (selectedId === productId) setSelectedId(null)
  }

  const clearAll = () => {
    setCart([])
    setSelectedId(null)
    setQtyBuffer('')
    setDiscountPct(0)
    setPaymentMode(PM.CASH)
    setCustomerSel(null)
  }

  const selectCustomer = (c) => {
    setCustomerSel(c)
    if (c) setPaymentMode(normalizePaymentMode(c.paymentMode))
    setShowCustomers(false)
  }

  const selectRow = (productId) => {
    setSelectedId(productId)
    setQtyBuffer('')
  }

  const pressKey = (key) => {
    if (key === 'C') { setQtyBuffer(''); return }
    if (key === '⌫') { setQtyBuffer(b => b.slice(0, -1)); return }
    if (/^\d$/.test(key)) setQtyBuffer(b => (b.length < 5 ? b + key : b))
  }

  const applyQty = () => {
    if (!selectedId || !qtyBuffer) return
    const qty = parseInt(qtyBuffer, 10)
    if (!Number.isFinite(qty) || qty <= 0) return
    setCart(prev => prev.map(i => i.productId === selectedId ? { ...i, qty } : i))
    setQtyBuffer('')
  }

  const subTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const discountAmt = subTotal * (discountPct / 100)
  const taxableAmt = subTotal - discountAmt
  const taxAmt = taxableAmt * (LITE_TAX_RATE / 100)
  const total = taxableAmt + taxAmt
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0)

  const handleMoreOption = (label) => {
    setShowMore(false)
    switch (label) {
      case 'Hold Bill': {
        if (!cart.length) { posNotifyWarning('Cart is empty', { title: 'Hold Bill' }); return }
        setHeldBills(prev => [...prev, { id: Date.now(), cart }])
        clearAll()
        posNotifySuccess('Bill held', { title: 'Hold Bill', duration: 1200 })
        return
      }
      case 'Recall': {
        if (!heldBills.length) { posNotifyWarning('No held bills', { title: 'Recall' }); return }
        const last = heldBills[heldBills.length - 1]
        setCart(last.cart)
        setHeldBills(prev => prev.slice(0, -1))
        posNotifySuccess('Bill recalled', { title: 'Recall', duration: 1200 })
        return
      }
      case 'Clear Line': {
        if (!selectedId) { posNotifyWarning('Select a row first', { title: 'Clear Line' }); return }
        removeItem(selectedId)
        return
      }
      case 'Return': {
        if (!selectedId) { posNotifyWarning('Select a row first', { title: 'Return' }); return }
        setCart(prev => prev.map(i => i.productId === selectedId ? { ...i, qty: -i.qty } : i))
        return
      }
      case 'Discount': {
        const input = window.prompt('Bill discount %', String(discountPct))
        if (input == null) return
        const pct = parseFloat(input)
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
          posNotifyError('Enter a value between 0 and 100', { title: 'Discount' })
          return
        }
        setDiscountPct(pct)
        return
      }
      default:
        posNotifyInfo('Available in the full POS only', { title: label })
    }
  }

  const handleSave = (andPrint = false) => {
    if (!cart.length) {
      posNotifyWarning('Cart is empty', { title: 'Save Bill' })
      return
    }
    setSaving(true)
    try {
      const billNo = `LITE-${String(liteBillSeq++).padStart(4, '0')}`
      if (andPrint) {
        printReceipt({
          shopName: 'MOIF POS',
          shopSubName: 'Lite Mode',
          billNo,
          billDate: new Date(),
          cashierName: 'Lite',
          counterNo: '1',
          customerName: customer?.customerName || '',
          items: cart.map(i => ({
            description: i.description,
            qty: i.qty,
            unitPrice: i.price,
            vatPer: LITE_TAX_RATE,
            lineTotal: i.price * i.qty,
          })),
          subTotal,
          discountAmt,
          taxAmt,
          roundOff: 0,
          netAmount: total,
          paidAmount: total,
          balanceAmount: 0,
          paymentMode,
          currency: 'AED',
        })
      }
      posNotifySuccess(`Bill ${billNo} saved!`, { title: 'Bill Saved', duration: 1200 })
      clearAll()
    } catch (err) {
      posNotifyError(err.message ?? 'Save failed', { title: 'Save Bill' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="lite-page" style={{
      width: '100vw', minHeight: '100vh', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', overflow: 'hidden',
      touchAction: 'manipulation',
    }}>
      <style>{`
        .lite-body { display: flex; flex: 1; min-height: 0; }
        .lite-panel-left, .lite-panel-right { width: 320px; flex-shrink: 0; }
        .lite-panel-left { border-right: 1px solid var(--border); }
        .lite-panel-right { border-left: 1px solid var(--border); }
        .lite-btn { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }

        @media (max-width: 1180px) {
          .lite-panel-left, .lite-panel-right { width: 280px; }
        }

        @media (max-width: 860px) {
          .lite-page { height: auto; min-height: 100vh; overflow: visible; }
          .lite-body { flex-direction: column; overflow: visible; }
          .lite-panel-left, .lite-panel-right {
            width: 100%; border: none; border-top: 1px solid var(--border);
          }
          .lite-panel-center { flex: none !important; }
        }
      `}</style>

      {/* ── HEADER ─────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0, flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)' }}>MOIF POS · Lite</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Simplified billing mode</div>
        </div>

        <button
          className="lite-btn"
          onClick={() => navigate('/')}
          style={{
            padding: '11px 18px', borderRadius: 'var(--r-md)',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-2)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            minHeight: 44,
          }}
        >
          Exit Lite Mode
        </button>
      </div>

      {/* ── BODY ───────────────────────────── */}
      <div className="lite-body">

        {/* Left: search + results */}
        <div className="lite-panel-left" style={{
          display: 'flex', flexDirection: 'column', padding: 16, minHeight: 0,
        }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search item or scan barcode..."
            style={{
              padding: '13px 14px', borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-1)', fontSize: 15, marginBottom: 10, outline: 'none',
              minHeight: 44,
            }}
          />

          {/* Group chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <button
              className="lite-btn"
              onClick={() => setActiveGroup(null)}
              style={groupChipStyle(activeGroup === null)}
            >
              All
            </button>
            {LITE_GROUPS.map(g => (
              <button
                key={g}
                className="lite-btn"
                onClick={() => setActiveGroup(prev => (prev === g ? null : g))}
                style={groupChipStyle(activeGroup === g)}
              >
                {g}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map(p => (
              <button
                key={p.productId}
                className="lite-btn"
                onClick={() => addToCart(p)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 14px', borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left', minHeight: 48,
                }}
              >
                <span style={{ fontSize: 13.5, color: 'var(--text-1)', fontWeight: 600 }}>{p.description}</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmtMoney(p.price)}
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>
                No items found
              </div>
            )}
          </div>

          {/* More — reveals the full function grid, like the normal POS */}
          <button
            className="lite-btn"
            onClick={() => setShowMore(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '13px 0', marginTop: 12, borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              flexShrink: 0, minHeight: 46,
            }}
          >
            <MoreHorizontal size={16} /> More
          </button>
        </div>

        {/* Center: table */}
        <div className="lite-panel-center" style={{ flex: 1, overflowY: 'auto', padding: 16, minWidth: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Item</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((i, idx) => (
                <tr
                  key={i.productId}
                  onClick={() => selectRow(i.productId)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedId === i.productId ? 'var(--brand-bg)' : 'transparent',
                  }}
                >
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{i.description}</td>
                  <td style={tdStyle}>
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <button className="lite-btn" onClick={() => changeQty(i.productId, -1)} style={qtyBtnStyle}>−</button>
                      <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700 }}>{i.qty}</span>
                      <button className="lite-btn" onClick={() => changeQty(i.productId, 1)} style={qtyBtnStyle}>+</button>
                    </div>
                  </td>
                  <td style={tdStyle}>{fmtMoney(i.price)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtMoney(i.price * i.qty)}</td>
                  <td style={tdStyle}>
                    <button className="lite-btn" onClick={e => { e.stopPropagation(); removeItem(i.productId) }} style={removeBtnStyle}>✕</button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                    Cart is empty — search and tap an item to add it
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right: billing summary + keypad */}
        <div className="lite-panel-right" style={{
          display: 'flex', flexDirection: 'column', position: 'relative',
          background: 'var(--surface)',
          padding: 16, minHeight: 0, overflowY: 'auto',
        }}>

          {/* Customer — minimal trigger, tap for a short list (not the full customer panel) */}
          <button
            className="lite-btn"
            onClick={() => setShowCustomers(o => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              maxWidth: 150, padding: '7px 9px', marginBottom: 8, minHeight: 32,
              borderRadius: 'var(--r-md)',
              border: `1.5px solid ${customer ? 'var(--blue-border)' : 'var(--border)'}`,
              background: customer ? 'var(--blue-bg)' : 'var(--surface)',
              color: customer ? 'var(--blue)' : 'var(--text-2)',
              cursor: 'pointer', fontSize: 10.5, fontWeight: 600,
            }}
          >
            <User size={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customer ? customer.customerName : 'Walk-in Customer'}
            </span>
            <ChevronDown size={10} />
          </button>

          {showCustomers && (
            <div
              onClick={() => setShowCustomers(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 9 }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', top: 100, left: 16,
                  width: 260, maxWidth: 'calc(100% - 32px)', maxHeight: 300, overflowY: 'auto',
                  background: 'var(--surface)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--r-md)', boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
                }}
              >
                <div
                  className="lite-btn"
                  onClick={() => selectCustomer(null)}
                  style={{
                    padding: '10px 12px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', background: !customer ? 'var(--brand-bg)' : 'transparent',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>Walk-in Customer</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>Cash sale — no customer account</div>
                </div>
                {LITE_CUSTOMERS.map(c => (
                  <div
                    key={c.customerId}
                    className="lite-btn"
                    onClick={() => selectCustomer(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: customer?.customerId === c.customerId ? 'var(--brand-bg)' : 'transparent',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.customerName}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                        {c.customerCode} · {c.mobileNo}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
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
                ))}
              </div>
            </div>
          )}

          {/* Billing summary — minimal by default, pinned in view; tap to expand detail */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 2,
            marginBottom: 12, borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)', overflow: 'hidden',
            background: 'var(--surface)', boxShadow: 'var(--shadow-xs)',
          }}>
            <div
              className="lite-btn"
              onClick={() => setSummaryExpanded(e => !e)}
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
                {summaryExpanded
                  ? <ChevronUp size={13} color="var(--text-3)" />
                  : <ChevronDown size={13} color="var(--text-3)" />
                }
              </div>
            </div>

            {summaryExpanded && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                <SummaryRow label="Sub Total" value={fmtMoney(subTotal)} />
                <SummaryRow label={`Discount (${discountPct}%)`} value={fmtMoney(discountAmt)} muted={!discountAmt} />
                <SummaryRow label="Taxable Amt" value={fmtMoney(taxableAmt)} />
                <SummaryRow label={`Tax (${LITE_TAX_RATE}%)`} value={fmtMoney(taxAmt)} />
                <div style={{ height: 1, background: 'var(--border)', margin: '5px 0' }} />
                <SummaryRow label="Customer" value={customer ? customer.customerName : 'Walk-in'} />
                <SummaryRow label="Mode" value={PAYMENT_MODES.find(m => m.key === paymentMode)?.label ?? paymentMode} />
                <SummaryRow label="Paid Amount" value={fmtMoney(total)} bold />
                <SummaryRow label="Balance" value={fmtMoney(0)} accent="green" />
              </div>
            )}
          </div>

          {/* Keypad — enters qty for the selected row */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              padding: '9px 12px', borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)',
              fontSize: 12, color: 'var(--text-3)', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{selectedId ? 'Set Qty' : 'Select a row'}</span>
              <span style={{ fontWeight: 800, color: 'var(--brand)', fontFamily: "'JetBrains Mono', monospace" }}>
                {qtyBuffer || '—'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {NUMPAD_KEYS.map(k => {
                const isAction = k === '⌫' || k === 'C'
                return (
                  <button
                    key={k}
                    className="lite-btn"
                    onClick={() => pressKey(k)}
                    style={{
                      padding: '22px 0', borderRadius: 'var(--r-md)',
                      border: `1.5px solid ${isAction ? 'var(--red-border)' : 'var(--border)'}`,
                      background: isAction ? 'var(--red-bg)' : 'var(--surface)',
                      color: isAction ? 'var(--red)' : 'var(--text-1)',
                      fontSize: isAction ? 15 : 22, fontWeight: 700,
                      fontFamily: k === '⌫' ? 'inherit' : "'JetBrains Mono', monospace",
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-xs)',
                      transition: 'transform 0.07s, background 0.08s',
                    }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    {k}
                  </button>
                )
              })}
            </div>
            <button
              className="lite-btn"
              onClick={applyQty}
              disabled={!selectedId || !qtyBuffer}
              style={{
                width: '100%', padding: '14px 0', marginTop: 8, borderRadius: 'var(--r-md)',
                border: 'none', minHeight: 48,
                background: selectedId && qtyBuffer ? 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--surface-3)',
                color: selectedId && qtyBuffer ? '#fff' : 'var(--text-3)',
                fontSize: 13.5, fontWeight: 800, letterSpacing: 1,
                cursor: selectedId && qtyBuffer ? 'pointer' : 'not-allowed',
              }}
            >
              APPLY QTY
            </button>
          </div>

          {/* Payment mode */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-4)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 }}>
              Payment
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {PAYMENT_MODES.map(({ key, label, icon: Icon }) => {
                const active = paymentMode === key
                return (
                  <button
                    key={key}
                    className="lite-btn"
                    onClick={() => setPaymentMode(key)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      padding: '9px 2px', minHeight: 46, borderRadius: 'var(--r-md)',
                      border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                      background: active ? 'var(--brand-bg)' : 'var(--surface)',
                      color: active ? 'var(--brand)' : 'var(--text-3)',
                      cursor: 'pointer', fontSize: 10, fontWeight: active ? 800 : 600,
                    }}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <button
            className="lite-btn"
            onClick={clearAll}
            disabled={!cart.length || saving}
            style={{
              width: '100%', padding: '13px 0', marginBottom: 8, borderRadius: 'var(--r-lg)',
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 13, fontWeight: 700, minHeight: 46,
              cursor: cart.length ? 'pointer' : 'not-allowed',
              opacity: cart.length ? 1 : 0.5,
            }}
          >
            Clear All
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="lite-btn"
              onClick={() => handleSave(false)}
              disabled={!cart.length || saving}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 'var(--r-lg)', minHeight: 50,
                border: '1.5px solid var(--border)',
                background: cart.length ? 'var(--surface)' : 'var(--surface-3)',
                color: cart.length ? 'var(--text-1)' : 'var(--text-3)',
                fontSize: 13.5, fontWeight: 800, letterSpacing: 0.3,
                cursor: cart.length && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              className="lite-btn"
              onClick={() => handleSave(true)}
              disabled={!cart.length || saving}
              style={{
                flex: 1.4, padding: '14px 0', borderRadius: 'var(--r-lg)', minHeight: 50,
                border: 'none',
                background: cart.length
                  ? 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)'
                  : 'var(--surface-3)',
                color: cart.length ? '#fff' : 'var(--text-3)',
                fontSize: 13, fontWeight: 800, letterSpacing: 0.3,
                cursor: cart.length && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              Bill & Print
            </button>
          </div>
        </div>
      </div>

      {/* ── MORE OPTIONS OVERLAY ───────────── */}
      {showMore && (
        <div
          onClick={() => setShowMore(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 640, maxWidth: '92vw', maxHeight: '82vh', overflowY: 'auto',
              background: 'var(--surface)', borderRadius: 'var(--r-lg)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.3))',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>More Options</span>
              <button
                className="lite-btn"
                onClick={() => setShowMore(false)}
                style={{ border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 10, minWidth: 40, minHeight: 40 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
              {MORE_OPTIONS.map(({ label, icon: Icon, color, bg, border }) => (
                <button
                  key={label}
                  className="lite-btn"
                  onClick={() => handleMoreOption(label)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '16px 6px', borderRadius: 'var(--r-md)', minHeight: 76,
                    border: `1.5px solid ${border}`, background: bg,
                    color, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
                  }}
                >
                  <Icon size={18} />
                  <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryRow({ label, value, muted, bold, accent }) {
  const color = accent === 'green'
    ? 'var(--green)'
    : accent === 'red'
      ? 'var(--red)'
      : bold
        ? 'var(--text-1)'
        : muted
          ? 'var(--text-4)'
          : 'var(--text-2)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: 12, color: muted ? 'var(--text-4)' : 'var(--text-3)', fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: bold ? 800 : 600, color,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {value}
      </span>
    </div>
  )
}

const thStyle = { padding: '10px 6px', textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 0.4 }
const tdStyle = { padding: '14px 6px', textAlign: 'center', color: 'var(--text-1)' }
const qtyBtnStyle = {
  width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text-1)', cursor: 'pointer', fontSize: 17,
  lineHeight: 1, touchAction: 'manipulation',
}
const removeBtnStyle = {
  border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16,
  width: 36, height: 36, touchAction: 'manipulation',
}
function groupChipStyle(active) {
  return {
    padding: '8px 13px', borderRadius: 999, minHeight: 34,
    border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-2)',
    fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}
