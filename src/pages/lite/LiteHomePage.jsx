import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronUp, Receipt, MoreHorizontal, X, ShoppingCart, Keyboard,
  PauseCircle, Minus, RotateCcw, Printer,
  Search, Tag, SlidersHorizontal, Grid3x3, Package, Percent, DollarSign,
  User, Crown, BarChart2, ArrowLeftRight, FileText, Hash, Lock, Layers, Truck, Save,
  Banknote, CreditCard, UserCheck, Layers as LayersIcon,
} from 'lucide-react'
import TouchKeyboard from '../../components/ui/TouchKeyboard'
import { usePosStore } from '../../store/posStore'
import { getCartRowKey } from '../../lib/cartLine'
import { fmtMoney } from '../../lib/currencyFormat'
import { LITE_TAX_RATE } from '../../config/appConfig'
import { LITE_GROUPS, searchLiteProducts } from './liteProducts'
import { LITE_CUSTOMERS } from './liteCustomers'
import LitePacketScanModal from './LitePacketScanModal'
import BillDiscountModal from '../../components/popup/BillDiscountModal'
import PriceChangeModal from '../../components/popup/PriceChangeModal'
import QtyChangeModal from '../../components/popup/QtyChangeModal'
import CurrencyModal from '../../components/popup/CurrencyModal'
import CommentsModal from '../../components/popup/CommentsModal'
import SalesManModal from '../../components/popup/SalesManModal'
import { printReceipt } from '../../lib/printReceipt'
import { posNotifyError, posNotifyInfo, posNotifySuccess, posNotifyWarning } from '../../lib/posNotify'
import { PM, normalizePaymentMode } from '../../lib/paymentModes'

const PAYMENT_MODES = [
  { key: PM.CASH,         label: 'Cash',     icon: Banknote },
  { key: PM.CREDITCARD,   label: 'Card',     icon: CreditCard },
  { key: PM.CREDIT,       label: 'Credit',   icon: UserCheck },
  { key: PM.MULTIPAYMENT, label: 'Multi',    icon: LayersIcon },
]

/* These now open the exact same modal components as the normal POS
   (they read/write the shared usePosStore). A few that need a live backend
   session — Group, Price Enquiry, Report, Cash In/Out persistence,
   Settlement, Privilege, Delivery — stay as lightweight local
   equivalents since Lite mode has no real login/accessToken. */
const MORE_OPTIONS = [
  { label: 'Hold Bill',    icon: PauseCircle,      color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
  { label: 'Reprint',      icon: Printer,          color: 'var(--brand)',  bg: 'var(--brand-bg)',  border: 'var(--brand-border)' },
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

const PRICE_LEVELS = { Retail: 1, Wholesale: 0.9, VIP: 0.85 }
const PRICE_LEVEL_ORDER = ['Retail', 'Wholesale', 'VIP']

const roundAmt = (n) => Math.round((Number(n) || 0) * 100) / 100

let liteBillSeq = 1
let liteHoldSeq = 1

export default function LiteHomePage() {
  const navigate = useNavigate()

  // ── Shared POS store — same cart/billing engine the normal POS uses ──
  const cartItems       = usePosStore(s => s.cartItems)
  const selectedRowKey  = usePosStore(s => s.selectedRowKey)
  const addItem         = usePosStore(s => s.addItem)
  const updateLine       = usePosStore(s => s.updateLine)
  const adjustLineQty   = usePosStore(s => s.adjustLineQty)
  const removeItemStore = usePosStore(s => s.removeItem)
  const clearAllStore   = usePosStore(s => s.clearAll)
  const subTotal        = usePosStore(s => s.subTotal)
  const discountAmt     = usePosStore(s => s.discountAmt)
  const taxableAmt      = usePosStore(s => s.taxableAmt)
  const taxAmt          = usePosStore(s => s.taxAmt)
  const roundOff        = usePosStore(s => s.roundOff)
  const netAmount        = usePosStore(s => s.netAmount)
  const paymentMode      = usePosStore(s => s.paymentMode)
  const setPaymentMode   = usePosStore(s => s.setPaymentMode)
  const billComment      = usePosStore(s => s.billComment)
  const customerName     = usePosStore(s => s.customerName)
  const setCustomerStore = usePosStore(s => s.setCustomer)
  const clearCustomerStore = usePosStore(s => s.clearCustomer)

  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState(null)
  const [qtyBuffer, setQtyBuffer] = useState('')
  const [saving, setSaving] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [heldBills, setHeldBills] = useState([]) // { id, cartItems }
  const [showCustomers, setShowCustomers] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')
  const [showCustomerKeyboard, setShowCustomerKeyboard] = useState(false)
  const [customersList, setCustomersList] = useState(LITE_CUSTOMERS)
  const [salesMan, setSalesMan] = useState(null)
  const [privilegeActive, setPrivilegeActive] = useState(false)
  const [cashEntries, setCashEntries] = useState([]) // { id, type: 'IN'|'OUT', amount }
  const [deliveries, setDeliveries] = useState([]) // { id, cartItems, address }
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [isDelivery, setIsDelivery] = useState(false)
  const [priceLevel, setPriceLevel] = useState('Retail')
  const [savedBillsCount, setSavedBillsCount] = useState(0)
  const [savedRevenue, setSavedRevenue] = useState(0)
  const [savedBills, setSavedBills] = useState([]) // { billNo, billDate, receipt }
  const [promptModal, setPromptModal] = useState(null) // { title, hint, onSubmit }
  const [promptValue, setPromptValue] = useState('')
  const [showPacketScan, setShowPacketScan] = useState(false)
  const [showBillDiscount, setShowBillDiscount] = useState(false)
  const [showPriceChange, setShowPriceChange] = useState(false)
  const [showQtyChange, setShowQtyChange] = useState(false)
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [showSalesManModal, setShowSalesManModal] = useState(false)
  const searchInputRef = useRef(null)

  const results = useMemo(() => searchLiteProducts(query, activeGroup), [query, activeGroup])

  /** In-app replacement for window.prompt — native browser dialogs are unreliable
   *  inside touch/embedded WebViews (including the Android/Capacitor build). */
  const askInput = (title, defaultValue, onSubmit, hint) => {
    setPromptValue(defaultValue != null ? String(defaultValue) : '')
    setPromptModal({ title, hint, onSubmit })
  }

  const submitPrompt = () => {
    const submit = promptModal?.onSubmit
    setPromptModal(null)
    submit?.(promptValue)
  }

  const selectRow = (rowKey) => {
    usePosStore.setState({ selectedRowKey: rowKey })
    setQtyBuffer('')
  }

  const addToCart = (product) => {
    const price = roundAmt(product.price * (PRICE_LEVELS[priceLevel] ?? 1))
    addItem({
      productId: product.productId,
      barcode: product.barcode,
      description: product.description,
      qty: 1,
      unitPrice: price,
      vatPer: LITE_TAX_RATE,
    })
    setQtyBuffer('')
  }

  const clearAll = () => {
    clearAllStore()
    setQtyBuffer('')
    setSalesMan(null)
    setPrivilegeActive(false)
    setDeliveryAddress('')
    setIsDelivery(false)
  }

  const selectCustomer = (c) => {
    if (c) {
      setCustomerStore(c.customerId, c.customerName, c.customerCode, c.paymentMode, c.osAmount)
      setPaymentMode(normalizePaymentMode(c.paymentMode))
    } else {
      clearCustomerStore()
    }
    setShowCustomers(false)
  }

  const pressKey = (key) => {
    if (key === 'C') { setQtyBuffer(''); return }
    if (key === '⌫') { setQtyBuffer(b => b.slice(0, -1)); return }
    if (/^\d$/.test(key)) setQtyBuffer(b => (b.length < 5 ? b + key : b))
  }

  const handleCustomerKbKey = (key) => {
    if (key === '⌫') { setCustomerQuery(v => v.slice(0, -1)); return }
    if (key === 'ENTER') { setShowCustomerKeyboard(false); return }
    if (key === '123') return
    setCustomerQuery(v => v + key)
  }

  const applyQty = () => {
    if (!selectedRowKey || !qtyBuffer) return
    const qty = parseInt(qtyBuffer, 10)
    if (!Number.isFinite(qty) || qty <= 0) return
    updateLine(selectedRowKey, { qty })
    setQtyBuffer('')
  }

  const itemCount = cartItems.reduce((sum, i) => sum + Number(i.qty || 0), 0)
  const total = netAmount

  const handleMoreOption = (label) => {
    setShowMore(false)
    switch (label) {
      case 'Hold Bill': {
        if (!cartItems.length) { posNotifyWarning('Cart is empty', { title: 'Hold Bill' }); return }
        setHeldBills(prev => [...prev, {
          id: Date.now(),
          holdNo: liteHoldSeq++,
          heldAt: new Date(),
          customerName: customerName || '',
          comment: billComment || '',
          cartItems,
          amount: netAmount,
        }])
        clearAll()
        posNotifySuccess('Bill held', { title: 'Hold Bill', duration: 1200 })
        return
      }
      case 'Reprint': {
        if (!savedBills.length) {
          posNotifyWarning('No saved bills yet', { title: 'Reprint' })
          return
        }
        askInput(
          `Bill number to reprint (last: ${savedBills[savedBills.length - 1].billNo})`,
          savedBills[savedBills.length - 1].billNo,
          (val) => {
            const match = savedBills.find(b => b.billNo.toUpperCase() === val.trim().toUpperCase())
            if (!match) { posNotifyError(`Bill ${val} not found`, { title: 'Reprint' }); return }
            printReceipt(match.receipt)
            posNotifySuccess(`Reprinting ${match.billNo}`, { title: 'Reprint', duration: 1000 })
          },
        )
        return
      }
      case 'Clear Line': {
        if (!selectedRowKey) { posNotifyWarning('Select a row first', { title: 'Clear Line' }); return }
        removeItemStore(selectedRowKey)
        return
      }
      case 'Return': {
        if (!selectedRowKey) { posNotifyWarning('Select a row first', { title: 'Return' }); return }
        const item = cartItems.find(i => getCartRowKey(i) === selectedRowKey)
        if (item) updateLine(selectedRowKey, { qty: -Number(item.qty) })
        return
      }
      case 'Discount': {
        if (!cartItems.length) { posNotifyWarning('Cart is empty', { title: 'Discount' }); return }
        setShowBillDiscount(true)
        return
      }
      case 'Look Up': {
        searchInputRef.current?.focus()
        posNotifyInfo('Type an item name or barcode to look it up', { title: 'Look Up', duration: 1500 })
        return
      }
      case 'Price Change': {
        if (!selectedRowKey) { posNotifyWarning('Select a row first', { title: 'Price Change' }); return }
        setShowPriceChange(true)
        return
      }
      case 'Qty Change': {
        if (!selectedRowKey) { posNotifyWarning('Select a row first', { title: 'Qty Change' }); return }
        setShowQtyChange(true)
        return
      }
      case 'Group': {
        posNotifyInfo('Use the category chips above the search list to filter by group', { title: 'Group', duration: 1800 })
        return
      }
      case 'Packet Scan': {
        setShowPacketScan(true)
        return
      }
      case 'Price Enquiry': {
        askInput('Item name or barcode', '', (val) => {
          if (!val.trim()) return
          const match = searchLiteProducts(val)[0]
          if (!match) { posNotifyWarning('No matching item', { title: 'Price Enquiry' }); return }
          posNotifyInfo(`${match.description}: ${fmtMoney(match.price)} AED`, { title: 'Price Enquiry', duration: 2200 })
        })
        return
      }
      case 'Currency': {
        setShowCurrencyModal(true)
        return
      }
      case 'Sales Man': {
        setShowSalesManModal(true)
        return
      }
      case 'Privilege': {
        if (!cartItems.length) { posNotifyWarning('Cart is empty', { title: 'Privilege' }); return }
        const next = !privilegeActive
        setPrivilegeActive(next)
        const pct = next ? 5 : 0
        usePosStore.getState().setBillDiscount(roundAmt(subTotal * pct / 100))
        posNotifySuccess(next ? 'Privilege discount applied (+5%)' : 'Privilege discount removed', { title: 'Privilege', duration: 1200 })
        return
      }
      case 'Report': {
        const cashNet = cashEntries.reduce((s, e) => s + (e.type === 'IN' ? e.amount : -e.amount), 0)
        posNotifyInfo(
          `Bills: ${savedBillsCount}  ·  Revenue: ${fmtMoney(savedRevenue)}  ·  Held: ${heldBills.length}  ·  Deliveries: ${deliveries.length}  ·  Cash net: ${fmtMoney(cashNet)}`,
          { title: 'Session Report', duration: 4000 },
        )
        return
      }
      case 'Cash In/Out': {
        askInput('Type "in" or "out"', 'in', (typeVal) => {
          const norm = typeVal.trim().toUpperCase() === 'OUT' ? 'OUT' : 'IN'
          askInput(`Amount to cash ${norm.toLowerCase()}`, '', (amtVal) => {
            const amount = parseFloat(amtVal)
            if (!Number.isFinite(amount) || amount <= 0) {
              posNotifyError('Enter a valid amount', { title: 'Cash In/Out' })
              return
            }
            setCashEntries(prev => [...prev, { id: Date.now(), type: norm, amount: roundAmt(amount) }])
            posNotifySuccess(`Cash ${norm.toLowerCase()} recorded`, { title: 'Cash In/Out', duration: 1000 })
          })
        })
        return
      }
      case 'Comments': {
        setShowCommentsModal(true)
        return
      }
      case 'NP Scale': {
        posNotifyInfo('Weighing scale requires the Android/Sunmi hardware build', { title: 'NP Scale', duration: 1800 })
        return
      }
      case 'Lock': {
        navigate('/')
        return
      }
      case 'Price Level': {
        const next = PRICE_LEVEL_ORDER[(PRICE_LEVEL_ORDER.indexOf(priceLevel) + 1) % PRICE_LEVEL_ORDER.length]
        setPriceLevel(next)
        posNotifySuccess(`Price level: ${next}`, { title: 'Price Level', duration: 1200 })
        return
      }
      case 'Delivery': {
        if (!cartItems.length) { posNotifyWarning('Cart is empty', { title: 'Delivery' }); return }
        askInput('Delivery address', deliveryAddress, (val) => {
          setDeliveryAddress(val.trim())
          setIsDelivery(true)
          posNotifySuccess('Bill marked for delivery', { title: 'Delivery', duration: 1200 })
        })
        return
      }
      case 'Save Delivery': {
        if (!cartItems.length) { posNotifyWarning('Cart is empty', { title: 'Save Delivery' }); return }
        const finish = (addr) => {
          setDeliveries(prev => [...prev, { id: Date.now(), cartItems, address: addr.trim() }])
          clearAll()
          posNotifySuccess('Delivery saved', { title: 'Save Delivery', duration: 1200 })
        }
        if (deliveryAddress) { finish(deliveryAddress); return }
        askInput('Delivery address', '', finish)
        return
      }
      case 'Settlement': {
        askInput('Customer code to settle (e.g. CUS-00004)', '', (codeVal) => {
          if (!codeVal.trim()) return
          const target = customersList.find(c => c.customerCode.toUpperCase() === codeVal.trim().toUpperCase())
          if (!target) { posNotifyError('Customer not found', { title: 'Settlement' }); return }
          if (!target.osAmount) { posNotifyWarning(`${target.customerName} has no outstanding balance`, { title: 'Settlement' }); return }
          askInput(`Settle amount (O/S ${fmtMoney(target.osAmount)})`, target.osAmount, (amtVal) => {
            const amount = parseFloat(amtVal)
            if (!Number.isFinite(amount) || amount <= 0 || amount > target.osAmount) {
              posNotifyError('Enter a valid amount up to the outstanding balance', { title: 'Settlement' })
              return
            }
            setCustomersList(prev => prev.map(c =>
              c.customerId === target.customerId ? { ...c, osAmount: roundAmt(c.osAmount - amount) } : c
            ))
            posNotifySuccess(`${fmtMoney(amount)} settled for ${target.customerName}`, { title: 'Settlement', duration: 1500 })
          })
        })
        return
      }
      default:
        posNotifyInfo('Available in the full POS only', { title: label })
    }
  }

  const handleSave = (andPrint = false) => {
    if (!cartItems.length) {
      posNotifyWarning('Cart is empty', { title: 'Save Bill' })
      return
    }
    setSaving(true)
    try {
      const billNo = `LITE-${String(liteBillSeq++).padStart(4, '0')}`
      const receipt = {
        shopName: 'MOIF POS',
        shopSubName: 'Lite Mode',
        billNo,
        billDate: new Date(),
        cashierName: salesMan || 'Lite',
        counterNo: '1',
        customerName: customerName || '',
        items: cartItems.map(i => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
          vatPer: i.vatPer,
          lineTotal: i.lineTotal,
        })),
        subTotal,
        discountAmt,
        taxAmt,
        roundOff,
        netAmount: total,
        paidAmount: total,
        balanceAmount: 0,
        paymentMode,
        currency: 'AED',
      }
      if (andPrint) printReceipt(receipt)
      setSavedBills(prev => [...prev, { billNo, billDate: receipt.billDate, receipt }])
      setSavedBillsCount(n => n + 1)
      setSavedRevenue(r => roundAmt(r + total))
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShoppingCart size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)' }}>MOIF POS · Lite</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Simplified billing mode</div>
          </div>
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
            ref={searchInputRef}
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
              {cartItems.map((i, idx) => {
                const rowKey = getCartRowKey(i)
                return (
                  <tr
                    key={rowKey}
                    onClick={() => selectRow(rowKey)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: selectedRowKey === rowKey ? 'var(--brand-bg)' : 'transparent',
                    }}
                  >
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{i.description}</td>
                    <td style={tdStyle}>
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <button className="lite-btn" onClick={() => adjustLineQty(rowKey, -1)} style={qtyBtnStyle}>−</button>
                        <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700 }}>{i.qty}</span>
                        <button className="lite-btn" onClick={() => adjustLineQty(rowKey, 1)} style={qtyBtnStyle}>+</button>
                      </div>
                    </td>
                    <td style={tdStyle}>{fmtMoney(i.unitPriceGross ?? i.unitPrice)}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtMoney(i.lineTotal)}</td>
                    <td style={tdStyle}>
                      <button className="lite-btn" onClick={e => { e.stopPropagation(); removeItemStore(rowKey) }} style={removeBtnStyle}>✕</button>
                    </td>
                  </tr>
                )
              })}
              {cartItems.length === 0 && (
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
            onClick={() => setShowCustomers(o => { const next = !o; if (next) setCustomerQuery(''); return next })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: '6px 9px', marginBottom: 8, minHeight: 30,
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
                onClick={() => setShowCustomers(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 8 }}
              />
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', top: 48, left: 0, right: 0, zIndex: 9,
                  maxHeight: showCustomerKeyboard ? 520 : 340, display: 'flex', flexDirection: 'column',
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
                    onFocus={() => setShowCustomerKeyboard(true)}
                    placeholder="Search name, code or mobile…"
                    style={{
                      flex: 1, padding: '9px 11px', borderRadius: 'var(--r-md)',
                      border: '1.5px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text-1)', fontSize: 12.5, outline: 'none', minHeight: 36,
                    }}
                  />
                  <button
                    className="lite-btn"
                    onClick={() => setShowCustomerKeyboard(o => !o)}
                    title="On-screen keyboard"
                    style={{
                      width: 36, height: 36, borderRadius: 'var(--r-md)', flexShrink: 0,
                      border: `1.5px solid ${showCustomerKeyboard ? 'var(--brand)' : 'var(--border)'}`,
                      background: showCustomerKeyboard ? 'var(--brand-bg)' : 'var(--surface)',
                      color: showCustomerKeyboard ? 'var(--brand)' : 'var(--text-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <Keyboard size={15} />
                  </button>
                </div>
                {showCustomerKeyboard && (
                  <TouchKeyboard
                    onKey={handleCustomerKbKey}
                    onClose={() => setShowCustomerKeyboard(false)}
                  />
                )}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {!customerQuery.trim() && (
                  <div
                    className="lite-btn"
                    onClick={() => selectCustomer(null)}
                    style={{
                      padding: '10px 12px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', background: !customerName ? 'var(--brand-bg)' : 'transparent',
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>Walk-in Customer</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-4)' }}>Cash sale — no customer account</div>
                  </div>
                )}
                {customersList
                  .filter(c => {
                    const q = customerQuery.trim().toLowerCase()
                    if (!q) return true
                    return c.customerName.toLowerCase().includes(q)
                      || c.customerCode.toLowerCase().includes(q)
                      || c.mobileNo.includes(q)
                  })
                  .map(c => (
                  <div
                    key={c.customerId}
                    className="lite-btn"
                    onClick={() => selectCustomer(c)}
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
                {customerQuery.trim() && !customersList.some(c => {
                  const q = customerQuery.trim().toLowerCase()
                  return c.customerName.toLowerCase().includes(q)
                    || c.customerCode.toLowerCase().includes(q)
                    || c.mobileNo.includes(q)
                }) && (
                  <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>
                    No customers found
                  </div>
                )}
                </div>
              </div>
            </>
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
                <SummaryRow label="Discount" value={fmtMoney(discountAmt)} muted={!discountAmt} />
                <SummaryRow label="Taxable Amt" value={fmtMoney(taxableAmt)} />
                <SummaryRow label={`Tax (${LITE_TAX_RATE}%)`} value={fmtMoney(taxAmt)} />
                {roundOff !== 0 && <SummaryRow label="Round Off" value={fmtMoney(roundOff)} muted />}
                <div style={{ height: 1, background: 'var(--border)', margin: '5px 0' }} />
                <SummaryRow label="Customer" value={customerName || 'Walk-in'} />
                <SummaryRow label="Mode" value={PAYMENT_MODES.find(m => m.key === paymentMode)?.label ?? paymentMode} />
                <SummaryRow label="Price Level" value={priceLevel} muted={priceLevel === 'Retail'} />
                {salesMan && <SummaryRow label="Sales Man" value={salesMan} />}
                {isDelivery && <SummaryRow label="Delivery" value={deliveryAddress || 'Yes'} accent="red" />}
                {billComment && <SummaryRow label="Comment" value={billComment} muted />}
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
              <span>{selectedRowKey ? 'Set Qty' : 'Select a row'}</span>
              <span style={{ fontWeight: 800, color: 'var(--brand)', fontFamily: "'JetBrains Mono', monospace" }}>
                {qtyBuffer || '—'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'].map(k => {
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
              disabled={!selectedRowKey || !qtyBuffer}
              style={{
                width: '100%', padding: '14px 0', marginTop: 8, borderRadius: 'var(--r-md)',
                border: 'none', minHeight: 48,
                background: selectedRowKey && qtyBuffer ? 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)' : 'var(--surface-3)',
                color: selectedRowKey && qtyBuffer ? '#fff' : 'var(--text-3)',
                fontSize: 13.5, fontWeight: 800, letterSpacing: 1,
                cursor: selectedRowKey && qtyBuffer ? 'pointer' : 'not-allowed',
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
            disabled={!cartItems.length || saving}
            style={{
              width: '100%', padding: '13px 0', marginBottom: 8, borderRadius: 'var(--r-lg)',
              border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
              color: 'var(--red)', fontSize: 13, fontWeight: 700, minHeight: 46,
              cursor: cartItems.length ? 'pointer' : 'not-allowed',
              opacity: cartItems.length ? 1 : 0.5,
            }}
          >
            Clear All
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="lite-btn"
              onClick={() => handleSave(false)}
              disabled={!cartItems.length || saving}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 'var(--r-lg)', minHeight: 50,
                border: '1.5px solid var(--border)',
                background: cartItems.length ? 'var(--surface)' : 'var(--surface-3)',
                color: cartItems.length ? 'var(--text-1)' : 'var(--text-3)',
                fontSize: 13.5, fontWeight: 800, letterSpacing: 0.3,
                cursor: cartItems.length && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              className="lite-btn"
              onClick={() => handleSave(true)}
              disabled={!cartItems.length || saving}
              style={{
                flex: 1.4, padding: '14px 0', borderRadius: 'var(--r-lg)', minHeight: 50,
                border: 'none',
                background: cartItems.length
                  ? 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)'
                  : 'var(--surface-3)',
                color: cartItems.length ? '#fff' : 'var(--text-3)',
                fontSize: 13, fontWeight: 800, letterSpacing: 0.3,
                cursor: cartItems.length && !saving ? 'pointer' : 'not-allowed',
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

      {/* ── Real POS modals — same components/behaviour as the normal counter POS ── */}
      {showBillDiscount && <BillDiscountModal onClose={() => setShowBillDiscount(false)} />}
      {showPriceChange && <PriceChangeModal onClose={() => setShowPriceChange(false)} />}
      {showQtyChange && <QtyChangeModal onClose={() => setShowQtyChange(false)} />}
      {showCurrencyModal && <CurrencyModal onClose={() => setShowCurrencyModal(false)} />}
      {showCommentsModal && <CommentsModal onClose={() => setShowCommentsModal(false)} />}
      {showSalesManModal && (
        <SalesManModal
          onClose={() => setShowSalesManModal(false)}
          onApply={(s) => setSalesMan(s.name || s.code || null)}
        />
      )}

      {showPacketScan && (
        <LitePacketScanModal
          onClose={() => setShowPacketScan(false)}
          onAddItem={addToCart}
        />
      )}

      {/* ── IN-APP PROMPT (replaces window.prompt, which is unreliable in WebViews) ── */}
      {promptModal && (
        <div
          onClick={() => setPromptModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 60, padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 320, maxWidth: '100%',
              background: 'var(--surface)', borderRadius: 'var(--r-lg)',
              border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              padding: 18,
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>
              {promptModal.title}
            </div>
            <input
              autoFocus
              value={promptValue}
              onChange={e => setPromptValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitPrompt() }}
              placeholder={promptModal.hint || ''}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)',
                border: '1.5px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-1)', fontSize: 15, outline: 'none', marginBottom: 14,
                minHeight: 44,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="lite-btn"
                onClick={() => setPromptModal(null)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)', minHeight: 44,
                  border: '1.5px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                className="lite-btn"
                onClick={submitPrompt}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)', minHeight: 44,
                  border: 'none', background: 'linear-gradient(145deg, var(--brand) 0%, var(--brand-2) 100%)',
                  color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                }}
              >
                OK
              </button>
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
