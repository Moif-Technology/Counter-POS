import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../../store/posStore'
import { getCartRowKey } from '../../lib/cartLine'
import { fmtMoney } from '../../lib/currencyFormat'
import { LITE_TAX_RATE } from '../../config/appConfig'
import { searchLiteProducts } from './liteProducts'
import { LITE_CUSTOMERS } from './liteCustomers'
import { PM, normalizePaymentMode } from '../../lib/paymentModes'
import { printReceipt } from '../../lib/printReceipt'
import { posNotifyError, posNotifyInfo, posNotifySuccess, posNotifyWarning } from '../../lib/posNotify'

import LitePacketScanModal from './LitePacketScanModal'
import BillDiscountModal from '../../components/popup/BillDiscountModal'
import PriceChangeModal from '../../components/popup/PriceChangeModal'
import QtyChangeModal from '../../components/popup/QtyChangeModal'
import CurrencyModal from '../../components/popup/CurrencyModal'
import CommentsModal from '../../components/popup/CommentsModal'
import SalesManModal from '../../components/popup/SalesManModal'

import LiteHeader from './components/LiteHeader'
import LiteSearchPanel from './components/LiteSearchPanel'
import LiteCartTable from './components/LiteCartTable'
import LiteCustomerPicker from './components/LiteCustomerPicker'
import LiteBillSummary from './components/LiteBillSummary'
import LiteQtyKeypad from './components/LiteQtyKeypad'
import LitePaymentModes, { PAYMENT_MODES } from './components/LitePaymentModes'
import LiteActionBar from './components/LiteActionBar'
import LiteMoreOptionsModal from './components/LiteMoreOptionsModal'
import LitePromptModal from './components/LitePromptModal'

const PRICE_LEVELS = { Retail: 1, Wholesale: 0.9, VIP: 0.85 }
const PRICE_LEVEL_ORDER = ['Retail', 'Wholesale', 'VIP']

const roundAmt = (n) => Math.round((Number(n) || 0) * 100) / 100

let liteBillSeq = 1
let liteHoldSeq = 1

export default function LiteHomePage() {
  const navigate = useNavigate()

  // ── Shared POS store — same cart/billing engine the normal POS uses ──
  const cartItems          = usePosStore(s => s.cartItems)
  const selectedRowKey     = usePosStore(s => s.selectedRowKey)
  const addItem             = usePosStore(s => s.addItem)
  const updateLine          = usePosStore(s => s.updateLine)
  const adjustLineQty      = usePosStore(s => s.adjustLineQty)
  const removeItemStore    = usePosStore(s => s.removeItem)
  const clearAllStore      = usePosStore(s => s.clearAll)
  const subTotal           = usePosStore(s => s.subTotal)
  const discountAmt        = usePosStore(s => s.discountAmt)
  const taxableAmt         = usePosStore(s => s.taxableAmt)
  const taxAmt             = usePosStore(s => s.taxAmt)
  const roundOff           = usePosStore(s => s.roundOff)
  const netAmount           = usePosStore(s => s.netAmount)
  const paymentMode         = usePosStore(s => s.paymentMode)
  const setPaymentMode      = usePosStore(s => s.setPaymentMode)
  const billComment         = usePosStore(s => s.billComment)
  const customerName        = usePosStore(s => s.customerName)
  const setCustomerStore    = usePosStore(s => s.setCustomer)
  const clearCustomerStore  = usePosStore(s => s.clearCustomer)

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
        .lite-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .lite-scroll::-webkit-scrollbar { display: none; }

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

      <LiteHeader onExit={() => navigate('/')} />

      {/* ── BODY ───────────────────────────── */}
      <div className="lite-body">

        <LiteSearchPanel
          searchInputRef={searchInputRef}
          query={query}
          setQuery={setQuery}
          activeGroup={activeGroup}
          setActiveGroup={setActiveGroup}
          results={results}
          onAddToCart={addToCart}
          onOpenMore={() => setShowMore(true)}
        />

        <LiteCartTable
          cartItems={cartItems}
          selectedRowKey={selectedRowKey}
          onSelectRow={selectRow}
          onAdjustQty={adjustLineQty}
          onRemoveItem={removeItemStore}
        />

        {/* Right: billing summary + keypad */}
        <div className="lite-panel-right lite-scroll" style={{
          display: 'flex', flexDirection: 'column', position: 'relative',
          background: 'var(--surface)',
          padding: 16, minHeight: 0, overflowY: 'auto',
        }}>

          <LiteCustomerPicker
            customerName={customerName}
            customersList={customersList}
            showCustomers={showCustomers}
            setShowCustomers={setShowCustomers}
            customerQuery={customerQuery}
            setCustomerQuery={setCustomerQuery}
            showCustomerKeyboard={showCustomerKeyboard}
            setShowCustomerKeyboard={setShowCustomerKeyboard}
            onSelectCustomer={selectCustomer}
            onCustomerKbKey={handleCustomerKbKey}
          />

          <LiteBillSummary
            expanded={summaryExpanded}
            setExpanded={setSummaryExpanded}
            itemCount={itemCount}
            total={total}
            subTotal={subTotal}
            discountAmt={discountAmt}
            taxableAmt={taxableAmt}
            taxAmt={taxAmt}
            roundOff={roundOff}
            customerName={customerName}
            paymentModeLabel={PAYMENT_MODES.find(m => m.key === paymentMode)?.label ?? paymentMode}
            priceLevel={priceLevel}
            salesMan={salesMan}
            isDelivery={isDelivery}
            deliveryAddress={deliveryAddress}
            billComment={billComment}
          />

          <LiteQtyKeypad
            selectedRowKey={selectedRowKey}
            qtyBuffer={qtyBuffer}
            onPressKey={pressKey}
            onApply={applyQty}
          />

          <LitePaymentModes paymentMode={paymentMode} onSelect={setPaymentMode} />

          <div style={{ flex: 1 }} />

          <LiteActionBar
            hasItems={cartItems.length > 0}
            saving={saving}
            onClearAll={clearAll}
            onSave={() => handleSave(false)}
            onBillAndPrint={() => handleSave(true)}
          />
        </div>
      </div>

      {showMore && (
        <LiteMoreOptionsModal
          onClose={() => setShowMore(false)}
          onSelect={handleMoreOption}
        />
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

      {promptModal && (
        <LitePromptModal
          title={promptModal.title}
          hint={promptModal.hint}
          value={promptValue}
          onChange={setPromptValue}
          onCancel={() => setPromptModal(null)}
          onSubmit={submitPrompt}
        />
      )}
    </div>
  )
}
