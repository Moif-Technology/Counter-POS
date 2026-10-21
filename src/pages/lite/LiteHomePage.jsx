import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../../store/posStore'
import { posConfirm, posNotifyInfo, posNotifyWarning } from '../../lib/posNotify'
import { searchLiteProducts } from './data/liteProducts'
import { LITE_GROUP_OBJECTS } from './liteHelpers'
import { useLiteLedger } from './hooks/useLiteLedger'
import { useLiteBill } from './hooks/useLiteBill'
import './lite.css'

import LiteHeader from './components/LiteHeader'
import LiteSearchPanel from './components/LiteSearchPanel'
import LiteCartTable from './components/LiteCartTable'
import LiteQuickActionToolbar from './components/LiteQuickActionToolbar'
import LiteCustomerPicker from './components/LiteCustomerPicker'
import LiteBillSummary from './components/LiteBillSummary'
import LiteQtyKeypad from './components/LiteQtyKeypad'
import LitePaymentModes, { PAYMENT_MODES } from './components/LitePaymentModes'
import LiteActionBar from './components/LiteActionBar'
import LiteMobileTabs from './components/LiteMobileTabs'
import LiteModals from './components/LiteModals'

// More Options / quick-toolbar label → modal key (see LiteModals).
const OPTION_MODALS = {
  'Recall': 'recall',
  'Reprint': 'reprint',
  'Group': 'group',
  'Packet Scan': 'packetScan',
  'Price Enquiry': 'priceEnquiry',
  'Currency': 'currency',
  'Sales Man': 'salesMan',
  'Report': 'report',
  'Cash In/Out': 'cashInOut',
  'Comments': 'comments',
  'Receipt': 'creditSettlement',
  'Settlement': 'deliverySettlement',
}
// …that need a selected cart row first
const ROW_MODALS = { 'Price Change': 'priceChange', 'Qty Change': 'qtyChange' }
// …that need items in the cart first
const CART_MODALS = { 'Discount': 'billDiscount', 'Privilege': 'privilege' }

export default function LiteHomePage() {
  const navigate = useNavigate()

  // ── Shared POS store — same cart/billing engine the normal POS uses ──
  const cartItems       = usePosStore(s => s.cartItems)
  const selectedRowKey  = usePosStore(s => s.selectedRowKey)
  const adjustLineQty   = usePosStore(s => s.adjustLineQty)
  const removeItemStore = usePosStore(s => s.removeItem)
  const clearAllStore   = usePosStore(s => s.clearAll)
  const subTotal        = usePosStore(s => s.subTotal)
  const discountAmt     = usePosStore(s => s.discountAmt)
  const taxableAmt      = usePosStore(s => s.taxableAmt)
  const taxAmt          = usePosStore(s => s.taxAmt)
  const roundOff        = usePosStore(s => s.roundOff)
  const netAmount       = usePosStore(s => s.netAmount)
  const paymentMode     = usePosStore(s => s.paymentMode)
  const setPaymentMode  = usePosStore(s => s.setPaymentMode)
  const billComment     = usePosStore(s => s.billComment)
  const customerName    = usePosStore(s => s.customerName)

  const ledger = useLiteLedger()
  const bill = useLiteBill(ledger)

  // ── Screen state ──
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState(null)
  const [mobileTab, setMobileTab] = useState('search') // 'search' | 'cart' | 'bill' — only used ≤720px
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [showCustomers, setShowCustomers] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')
  const [showCustomerKeyboard, setShowCustomerKeyboard] = useState(false)
  const searchInputRef = useRef(null)

  // ── Popups — one at a time, rendered by <LiteModals> ──
  const [activeModal, setActiveModal] = useState(null)
  const [lookupGroup, setLookupGroup] = useState(null) // { groupId, groupDescription }
  const [deliverySavePending, setDeliverySavePending] = useState(false)
  const closeModal = () => { setActiveModal(null); setLookupGroup(null) }

  // Seed the shared store's productGroups from local mock data so GroupModal
  // (reused as-is from the normal POS) has something to show — Lite has no
  // accessToken, so the modal's own accessToken-gated fetch never overwrites this.
  useEffect(() => {
    usePosStore.setState({ productGroups: LITE_GROUP_OBJECTS })
  }, [])

  // Opened from the normal POS (a cashier is signed in) → return there with an
  // empty cart, since Lite's demo items don't exist in the real catalogue.
  // Opened via the Lite PIN → back to the login screen as before.
  const handleExitLite = async () => {
    if (!usePosStore.getState().cashier) { navigate('/'); return }
    if (cartItems.length) {
      const ok = await posConfirm({
        title: 'Exit Lite',
        message: 'Cart has items. Clear the current bill and return to the normal POS?',
        confirmLabel: 'Exit Lite',
        cancelLabel: 'Cancel',
      })
      if (!ok) return
    }
    clearAllStore()
    navigate('/pos')
  }

  const results = useMemo(() => searchLiteProducts(query, activeGroup), [query, activeGroup])

  const itemCount = cartItems.reduce((sum, i) => sum + Number(i.qty || 0), 0)

  const handleSelectCustomer = (c) => {
    bill.selectCustomer(c)
    setShowCustomers(false)
  }

  const handleCustomerKbKey = (key) => {
    if (key === '⌫') { setCustomerQuery(v => v.slice(0, -1)); return }
    if (key === 'ENTER') { setShowCustomerKeyboard(false); return }
    if (key === '123') return
    setCustomerQuery(v => v + key)
  }

  // More Options menu and the quick-action toolbar both route through here.
  const handleMoreOption = (label) => {
    setActiveModal(null)

    if (OPTION_MODALS[label]) { setActiveModal(OPTION_MODALS[label]); return }
    if (ROW_MODALS[label]) {
      if (!selectedRowKey) { posNotifyWarning('Select a row first', { title: label }); return }
      setActiveModal(ROW_MODALS[label])
      return
    }
    if (CART_MODALS[label]) {
      if (!cartItems.length) { posNotifyWarning('Cart is empty', { title: label }); return }
      setActiveModal(CART_MODALS[label])
      return
    }

    switch (label) {
      case 'Hold Bill':   bill.holdBill(); return
      case 'Clear Line':  bill.clearSelectedLine(); return
      case 'Return':      bill.returnSelectedLine(); return
      case 'Price Level': bill.cyclePriceLevel(); return
      case 'Look Up':
        setLookupGroup(null)
        setActiveModal('productLookup')
        return
      case 'Delivery':
      case 'Save Delivery':
        if (!cartItems.length) { posNotifyWarning('Cart is empty', { title: label }); return }
        setDeliverySavePending(label === 'Save Delivery')
        setActiveModal('delivery')
        return
      case 'NP Scale':
        posNotifyInfo('Weighing scale requires the Android/Sunmi hardware build', { title: 'NP Scale', duration: 1800 })
        return
      case 'Lock':
        navigate('/')
        return
      default:
        posNotifyInfo('Available in the full POS only', { title: label })
    }
  }

  const handleGroupSelect = ({ group, unitPrice, mode }) => {
    if (mode === 'price_entry') {
      usePosStore.getState().addGroupItem(group, unitPrice, 1)
    } else if (mode === 'product_lookup') {
      setLookupGroup({ groupId: group.groupId, groupDescription: group.groupDescription })
      setActiveModal('productLookup')
    }
  }

  return (
    <div className="lite-page" style={{
      width: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', overflow: 'hidden',
      touchAction: 'manipulation',
    }}>
      <LiteHeader onExit={handleExitLite} />

      {/* ── BODY ───────────────────────────── */}
      <div className="lite-body" data-mtab={mobileTab}>

        <LiteSearchPanel
          searchInputRef={searchInputRef}
          query={query}
          setQuery={setQuery}
          activeGroup={activeGroup}
          setActiveGroup={setActiveGroup}
          results={results}
          onAddToCart={bill.addToCart}
          onOpenMore={() => setActiveModal('more')}
        />

        {/* Center: cart + quick actions */}
        <div
          className="lite-panel-center"
          style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}
        >
          <div className="lite-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <LiteCartTable
              cartItems={cartItems}
              selectedRowKey={selectedRowKey}
              onSelectRow={bill.selectRow}
              onAdjustQty={adjustLineQty}
              onRemoveItem={removeItemStore}
              onDeleteMany={bill.deleteMany}
            />
          </div>

          <LiteQuickActionToolbar
            onDiscount={() => handleMoreOption('Discount')}
            onHold={() => handleMoreOption('Hold Bill')}
            onRecall={() => handleMoreOption('Recall')}
            onReturn={() => handleMoreOption('Return')}
            onPriceChange={() => handleMoreOption('Price Change')}
            onQtyChange={() => handleMoreOption('Qty Change')}
            onMore={() => setActiveModal('more')}
          />
        </div>

        {/* Right: billing. Three zones — the total (top) and the Save /
            Bill & Print buttons (bottom) stay pinned and always visible;
            only the keypad + payment area in the middle scrolls when the
            viewport is too short to show everything at once. */}
        <div className="lite-panel-right" style={{
          display: 'flex', flexDirection: 'column', position: 'relative',
          background: 'var(--surface)', minHeight: 0, overflow: 'hidden',
        }}>

          <div className="lite-scroll" style={{ flexShrink: 0, maxHeight: '52%', overflowY: 'auto', padding: 'clamp(10px, 1.6vw, 16px) clamp(10px, 1.6vw, 16px) 0' }}>
            <LiteCustomerPicker
              customerName={customerName}
              customersList={ledger.customersList}
              showCustomers={showCustomers}
              setShowCustomers={setShowCustomers}
              customerQuery={customerQuery}
              setCustomerQuery={setCustomerQuery}
              showCustomerKeyboard={showCustomerKeyboard}
              setShowCustomerKeyboard={setShowCustomerKeyboard}
              onSelectCustomer={handleSelectCustomer}
              onCustomerKbKey={handleCustomerKbKey}
            />

            <LiteBillSummary
              expanded={summaryExpanded}
              setExpanded={setSummaryExpanded}
              itemCount={itemCount}
              total={netAmount}
              subTotal={subTotal}
              discountAmt={discountAmt}
              taxableAmt={taxableAmt}
              taxAmt={taxAmt}
              roundOff={roundOff}
              customerName={customerName}
              paymentModeLabel={PAYMENT_MODES.find(m => m.key === paymentMode)?.label ?? paymentMode}
              priceLevel={bill.priceLevel}
              salesMan={bill.salesMan}
              isDelivery={bill.isDelivery}
              deliveryAddress={bill.deliveryAddress}
              billComment={billComment}
            />
          </div>

          <div className="lite-scroll" style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            padding: '0 clamp(10px, 1.6vw, 16px)',
          }}>
            <LiteQtyKeypad
              selectedRowKey={selectedRowKey}
              qtyBuffer={bill.qtyBuffer}
              onPressKey={bill.pressKey}
              onApply={bill.applyQty}
            />

            <LitePaymentModes paymentMode={paymentMode} onSelect={setPaymentMode} />
          </div>

          <div style={{ flexShrink: 0, padding: 'clamp(8px, 1.4vw, 14px) clamp(10px, 1.6vw, 16px) clamp(10px, 1.6vw, 16px)', borderTop: '1px solid var(--border)' }}>
            <LiteActionBar
              hasItems={cartItems.length > 0}
              saving={bill.saving}
              onClearAll={bill.clearAll}
              onSave={() => bill.saveBill(false)}
              onBillAndPrint={() => bill.saveBill(true)}
            />
          </div>
        </div>
      </div>

      <LiteMobileTabs activeTab={mobileTab} onChange={setMobileTab} itemCount={itemCount} total={netAmount} />

      <LiteModals
        active={activeModal}
        onClose={closeModal}
        ledger={ledger}
        salesMan={bill.salesMan}
        lookupGroup={lookupGroup}
        deliverySavePending={deliverySavePending}
        onMoreOption={handleMoreOption}
        onRecallHold={bill.recallHold}
        onCancelHold={bill.cancelHold}
        onAddItem={bill.addToCart}
        onGroupSelect={handleGroupSelect}
        onPrivilegeApply={bill.applyPrivilege}
        onCashInOutSave={bill.saveCashEntry}
        onDeliveryConfirm={(details) => { setActiveModal(null); bill.confirmDelivery(details, deliverySavePending) }}
        onDeliveryRecall={bill.loadDelivery}
        onSalesManApply={(s) => bill.setSalesMan(s.name || s.code || null)}
      />
    </div>
  )
}
