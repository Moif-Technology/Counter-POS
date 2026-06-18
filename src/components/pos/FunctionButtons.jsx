import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GroupModal from '../popup/GroupModal'
import ProductLookupModal from '../popup/ProductLookupModal'
import RecallHoldModal from '../popup/RecallHoldModal'
import BillReprintModal from '../popup/BillReprintModal'
import PrivilegeCustomerModal from '../popup/PrivilegeCustomerModal'
import PriceEnquiryModal from '../popup/PriceEnquiryModal'
import PriceChangeModal from '../popup/PriceChangeModal'
import QtyChangeModal from '../popup/QtyChangeModal'
import PacketScanModal from '../popup/PacketScanModal'
import CashInOutModal from '../popup/CashInOutModal'
import ReportsModal from '../popup/ReportsModal'
import CommentsModal from '../popup/CommentsModal'
import CurrencyModal from '../popup/CurrencyModal'
import ReceiptModal from '../popup/ReceiptModal'
import SalesManModal from '../popup/SalesManModal'
import DiscountModal from '../popup/DiscountModal'
import {
  ShoppingCart, PauseCircle, Archive, Printer, Receipt,
  RefreshCw, Trash2, Minus, RotateCcw, LogOut,
  Search, Tag, Grid3x3, Percent, DollarSign,
  User, BarChart2, ArrowLeftRight, FileText, Package,
  Lock, Layers, Save, Hash, Plus, Crown, SlidersHorizontal,
} from 'lucide-react'
import { usePosStore } from '../../store/posStore'
import { api } from '../../lib/api'

/* ─── Side nav button data ───────────────────────────────────── */
/* feature: entitlement code that must be enabled for the company
   (plan ∩ software type). null/absent = always visible. */
const SIDE_BUTTONS = [
  { label: 'POS',        icon: ShoppingCart, isPOS: true },
  { label: 'Hold Bill',  icon: PauseCircle,  feature: 'pos.hold_bill' },
  { label: 'Recall',     icon: Archive,      feature: 'pos.hold_bill' },
  { label: 'Print',      icon: Printer,      feature: 'pos.billing' },
  { label: 'Reprint',    icon: Printer,      feature: 'pos.reprint_bill' },
  { label: 'Sub Total',  icon: Receipt,      feature: 'pos.billing' },
  { label: 'Repeat',     icon: RefreshCw,    feature: 'pos.billing' },
  { label: 'Clear All',  icon: Trash2,    danger: true, feature: 'pos.billing' },
  { label: 'Clear Line', icon: Minus,     danger: true, feature: 'pos.billing' },
  { label: 'Return',     icon: RotateCcw, danger: true, feature: 'pos.return_bill' },
]

/* ─── Bottom feature grid button data ───────────────────────── */
const FEATURE_BUTTONS = [
  { label: 'Look Up',      icon: Search,           feature: 'pos.product_search',     color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Price Change', icon: Tag,              feature: 'pos.price_change',       color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Qty Change',   icon: SlidersHorizontal,feature: 'pos.quantity_change',    color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Group',        icon: Grid3x3,          feature: 'pos.group_master',       color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Packet Scan',  icon: Package,       feature: 'pos.packet_scan',        color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'Discount',     icon: Percent,       feature: 'pos.discount',           color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Price Enquiry',icon: Search,        feature: 'pos.price_enquiry',      color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Currency',     icon: DollarSign,    feature: 'pos.currency',           color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Sales Man',    icon: User,          feature: 'pos.salesman',           color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Privilege',   icon: Crown,         feature: 'pos.privilege_customer', color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Report',       icon: BarChart2,     feature: 'pos.counter_reports',    color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'Cash In/Out',  icon: ArrowLeftRight,feature: 'pos.cash_in_out',        color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Receipt',      icon: FileText,      feature: 'pos.reprint_bill',       color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
  { label: 'Comments',     icon: FileText,      feature: 'pos.notes',              color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { label: 'NP Scale',     icon: Hash,          feature: 'pos.np_scale',           color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Lock',         icon: Lock,          feature: 'pos.lock_screen',        color: 'var(--red)',    bg: 'var(--red-bg)',    border: 'var(--red-border)' },
  { label: 'Price Level',  icon: Layers,        feature: 'pos.price_level',        color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)' },
  { label: 'Save Delivery',icon: Save,          feature: 'pos.delivery',           color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)' },
  { label: 'Settlement',   icon: Receipt,       feature: 'pos.settlement',         color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)' },
]

/* ─────────────────────────────────────────────────────────────
   SideNav — narrow icon-only left sidebar
   ───────────────────────────────────────────────────────────── */
export function SideNav() {
  const navigate              = useNavigate()
  const clearAll              = usePosStore(s => s.clearAll)
  const repeatLastItem        = usePosStore(s => s.repeatLastItem)
  const pressSubTotal         = usePosStore(s => s.pressSubTotal)
  const toggleReturn          = usePosStore(s => s.toggleReturn)
  const [recallOpen,  setRecallOpen]  = useState(false)
  const [reprintOpen, setReprintOpen] = useState(false)
  const [activeLabel, setActiveLabel] = useState('POS')
  const [holdLoading, setHoldLoading] = useState(false)

  async function doHoldBill() {
    const {
      cartItems,
      accessToken,
      counterNo,
      paymentMode,
      subTotal,
      discountAmt,
      taxableAmt,
      taxAmt,
      roundOff,
      netAmount,
      customerId,
      recalledHoldSalesId,
      clearAll: clear,
    } = usePosStore.getState()

    if (!cartItems.length || holdLoading) return

    setHoldLoading(true)
    try {
      await api.counterPos.holdBill({
        cartItems,
        paymentMode,
        counterNo,
        subTotal,
        discountAmt,
        taxableAmt,
        taxAmt,
        roundOff,
        netAmount,
        customerId,
        recalledHoldSalesId: recalledHoldSalesId ?? null,
      }, accessToken)
      usePosStore.setState({ recalledHoldSalesId: null })
      clear()
    } catch (e) {
      alert(e.message)
    } finally {
      setHoldLoading(false)
    }
  }

  return (
    <>
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflowY: 'auto', overflowX: 'hidden',
      padding: '6px 0',
    }}>
      {SIDE_BUTTONS.map((btn, i) => {
        const Icon      = btn.icon
        const isActive  = activeLabel === btn.label
        const isDanger  = btn.danger

        const handleClick = () => {
          if (btn.label === 'Clear All')  { clearAll(); setActiveLabel(btn.label); return }
          if (btn.label === 'Clear Line') {
            const { selectedRowKey, removeItem } = usePosStore.getState()
            if (selectedRowKey) removeItem(selectedRowKey)
            setActiveLabel(btn.label)
            return
          }
          if (btn.label === 'Repeat')    { repeatLastItem(); setActiveLabel(btn.label); return }
          if (btn.label === 'Sub Total') { pressSubTotal();  setActiveLabel(btn.label); return }
          if (btn.label === 'Hold Bill') { doHoldBill(); setActiveLabel(btn.label); return }
          if (btn.label === 'Return') {
            toggleReturn()
            const newQty = parseFloat(usePosStore.getState().qtyBuffer)
            setActiveLabel(newQty < 0 ? 'Return' : 'POS')
            return
          }
          if (btn.label === 'Recall')  { setRecallOpen(true);  setActiveLabel(btn.label); return }
          if (btn.label === 'Reprint') { setReprintOpen(true); setActiveLabel(btn.label); return }
          setActiveLabel(btn.label)
        }

        const activeBg     = isDanger ? 'var(--red)'        : 'var(--brand)'
        const activeBorder = isDanger ? 'var(--red)'        : 'var(--brand)'
        const activeColor  = '#fff'
        const hoverBg      = isDanger ? 'var(--red-bg)'     : 'var(--brand-bg)'
        const hoverBorder  = isDanger ? 'var(--red-border)' : 'var(--brand-border)'
        const hoverColor   = isDanger ? 'var(--red)'        : 'var(--brand)'

        return (
          <button
            key={i}
            onClick={handleClick}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4,
              padding: '10px 4px', margin: '1px 5px',
              borderRadius: 'var(--r-md)',
              border: isActive ? `1.5px solid ${activeBorder}` : '1px solid transparent',
              background: isActive ? activeBg : 'transparent',
              color: isActive ? activeColor : isDanger ? 'var(--red)' : 'var(--text-2)',
              fontSize: 9, fontWeight: isActive ? 800 : 600, lineHeight: 1.2,
              textAlign: 'center', cursor: btn.label === 'Hold Bill' && holdLoading ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.15)' : 'none',
            }}
            onMouseEnter={e => {
              if (isActive) return
              e.currentTarget.style.background   = hoverBg
              e.currentTarget.style.borderColor  = hoverBorder
              e.currentTarget.style.color        = hoverColor
              e.currentTarget.style.borderWidth  = '1.5px'
              e.currentTarget.style.transform    = 'translateX(2px)'
            }}
            onMouseLeave={e => {
              if (isActive) return
              e.currentTarget.style.background   = 'transparent'
              e.currentTarget.style.borderColor  = 'transparent'
              e.currentTarget.style.color        = isDanger ? 'var(--red)' : 'var(--text-2)'
              e.currentTarget.style.borderWidth  = '1px'
              e.currentTarget.style.transform    = 'translateX(0)'
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
            onMouseUp={e => { e.currentTarget.style.transform = isActive ? 'scale(1)' : 'translateX(2px)' }}
          >
            <Icon size={17} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 8.5, letterSpacing: 0.2, maxWidth: 56, wordBreak: 'break-word' }}>
              {btn.label === 'Hold Bill' && holdLoading ? 'Holding' : btn.label}
            </span>
          </button>
        )
      })}

      {/* Spacer + logout at bottom */}
      <div style={{ flex: 1 }} />
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 4,
          padding: '10px 4px', margin: '2px 5px 6px',
          borderRadius: 'var(--r-md)',
          border: '1px solid transparent', background: 'transparent',
          color: 'var(--text-3)', fontSize: 8.5, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red-border)'; e.currentTarget.style.borderWidth = '1.5px'; e.currentTarget.style.transform = 'translateX(2px)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateX(0)' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <LogOut size={17} />
        <span>Logout</span>
      </button>
    </div>

    {recallOpen && (
      <RecallHoldModal
        onClose={() => setRecallOpen(false)}
        onRecall={(bill) => { setRecallOpen(false) }}
      />
    )}
    {reprintOpen && (
      <BillReprintModal onClose={() => setReprintOpen(false)} />
    )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   FeatureGrid — horizontal button strip at center bottom
   ───────────────────────────────────────────────────────────── */
export function FeatureGrid() {
  const [groupOpen,       setGroupOpen]       = useState(false)
  const [lookupOpen,      setLookupOpen]      = useState(false)
  const [privilegeOpen,   setPrivilegeOpen]   = useState(false)
  const [priceEnqOpen,    setPriceEnqOpen]    = useState(false)
  const [priceChangeOpen, setPriceChangeOpen] = useState(false)
  const [qtyChangeOpen,   setQtyChangeOpen]   = useState(false)
  const [packetScanOpen,  setPacketScanOpen]  = useState(false)
  const [cashInOutOpen,   setCashInOutOpen]   = useState(false)
  const [reportsOpen,     setReportsOpen]     = useState(false)
  const [commentsOpen,    setCommentsOpen]    = useState(false)
  const [currencyOpen,    setCurrencyOpen]    = useState(false)
  const [receiptOpen,     setReceiptOpen]     = useState(false)
  const [salesManOpen,    setSalesManOpen]    = useState(false)
  const [discountOpen,    setDiscountOpen]    = useState(false)
  const addGroupItem = usePosStore(s => s.addGroupItem)
  const qtyBuffer = usePosStore(s => s.qtyBuffer)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  function handleGroupSelect({ group, unitPrice, mode }) {
    if (mode === 'price_entry') {
      const qty = parseFloat(qtyBuffer) > 0 ? parseFloat(qtyBuffer) : 1
      addGroupItem(group, unitPrice, qty)
    } else if (mode === 'product_lookup') {
      setLookupOpen(true)
    }
  }

  return (
    <>
    <div style={{
      display: 'flex', alignItems: 'center',
      height: '100%', padding: '5px 8px', gap: 6,
      overflowX: 'auto',
    }}>
      {FEATURE_BUTTONS.map((btn, i) => {
        const Icon = btn.icon
        const isGroup       = btn.label === 'Group'
        const isLookup      = btn.label === 'Look Up'
        const isPrivilege   = btn.label === 'Privilege'
        const isPriceEnq    = btn.label === 'Price Enquiry'
        const isPriceChange = btn.label === 'Price Change'
        const isQtyChange   = btn.label === 'Qty Change'
        const isPacketScan  = btn.label === 'Packet Scan'
        const isCashInOut   = btn.label === 'Cash In/Out'
        const isReport      = btn.label === 'Report'
        const isComments    = btn.label === 'Comments'
        const isCurrency    = btn.label === 'Currency'
        const isReceipt     = btn.label === 'Receipt'
        const isSalesMan    = btn.label === 'Sales Man'
        const isDiscount    = btn.label === 'Discount' || btn.label === 'Disc'
        const handleClick =
          isGroup       ? () => setGroupOpen(true) :
          isLookup      ? () => setLookupOpen(true) :
          isPrivilege   ? () => setPrivilegeOpen(true) :
          isPriceEnq    ? () => setPriceEnqOpen(true) :
          isPriceChange ? () => { if (selectedRowKey) setPriceChangeOpen(true) } :
          isQtyChange   ? () => { if (selectedRowKey) setQtyChangeOpen(true) } :
          isPacketScan  ? () => setPacketScanOpen(true) :
          isCashInOut   ? () => setCashInOutOpen(true) :
          isReport      ? () => setReportsOpen(true) :
          isComments    ? () => setCommentsOpen(true) :
          isCurrency    ? () => setCurrencyOpen(true) :
          isReceipt     ? () => setReceiptOpen(true) :
          isSalesMan    ? () => setSalesManOpen(true) :
          isDiscount    ? () => { if (selectedRowKey) setDiscountOpen(true) } :
          undefined
        return (
          <button
            key={i}
            onClick={handleClick}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 5,
              flexShrink: 0, width: 72, height: 72,
              borderRadius: 12,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              fontSize: 10, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: 'var(--shadow-xs)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background   = btn.bg
              e.currentTarget.style.color        = btn.color
              e.currentTarget.style.borderColor  = btn.border
              e.currentTarget.style.transform    = 'translateY(-2px)'
              e.currentTarget.style.boxShadow    = '0 6px 16px rgba(0,0,0,0.10)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background   = 'var(--surface)'
              e.currentTarget.style.color        = 'var(--text-2)'
              e.currentTarget.style.borderColor  = 'var(--border)'
              e.currentTarget.style.transform    = 'translateY(0)'
              e.currentTarget.style.boxShadow    = 'var(--shadow-xs)'
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93) translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.10)' }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span style={{ textAlign: 'center', lineHeight: 1.2, maxWidth: 66, wordBreak: 'break-word' }}>{btn.label}</span>
          </button>
        )
      })}

      {/* Add custom button */}
      <button style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0, width: 72, height: 72,
        borderRadius: 12,
        border: '1.5px dashed var(--border)',
        background: 'transparent', color: 'var(--text-4)',
        cursor: 'pointer', transition: 'all 0.15s ease',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <Plus size={18} />
      </button>
    </div>

    {groupOpen && (
      <GroupModal
        onClose={() => setGroupOpen(false)}
        onSelect={(result) => { setGroupOpen(false); handleGroupSelect(result) }}
      />
    )}
    {lookupOpen && (
      <ProductLookupModal
        onClose={() => setLookupOpen(false)}
        onSelect={(row) => { setLookupOpen(false) }}
      />
    )}
    {privilegeOpen && (
      <PrivilegeCustomerModal
        onClose={() => setPrivilegeOpen(false)}
        onApply={(customer) => { setPrivilegeOpen(false) }}
      />
    )}
    {priceEnqOpen && (
      <PriceEnquiryModal onClose={() => setPriceEnqOpen(false)} />
    )}
    {priceChangeOpen && (
      <PriceChangeModal onClose={() => setPriceChangeOpen(false)} />
    )}
    {qtyChangeOpen && (
      <QtyChangeModal onClose={() => setQtyChangeOpen(false)} />
    )}
    {packetScanOpen && (
      <PacketScanModal onClose={() => setPacketScanOpen(false)} />
    )}
    {cashInOutOpen && (
      <CashInOutModal onClose={() => setCashInOutOpen(false)} />
    )}
    {reportsOpen && (
      <ReportsModal
        onClose={() => setReportsOpen(false)}
        onSelect={(_key) => {}}
      />
    )}
    {commentsOpen && (
      <CommentsModal onClose={() => setCommentsOpen(false)} onSave={text => console.log('Comment:', text)} />
    )}
    {currencyOpen && (
      <CurrencyModal onClose={() => setCurrencyOpen(false)} />
    )}
    {receiptOpen && (
      <ReceiptModal onClose={() => setReceiptOpen(false)} />
    )}
    {salesManOpen && (
      <SalesManModal onClose={() => setSalesManOpen(false)} onApply={staff => console.log('Staff:', staff)} />
    )}
    {discountOpen && (
      <DiscountModal onClose={() => setDiscountOpen(false)} />
    )}
    </>
  )
}

/* Default export kept for any existing imports */
export default SideNav
