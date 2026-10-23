import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerPlugin } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { usePosStore } from '../../../store/posStore'
import { api } from '../../../lib/api'
import { enrichCartItemsForSave } from '../../../lib/cartLine'
import { isGroupBrowseMode } from '../../../lib/groupUtils'
import { closeAndFocusBarcode } from '../../../lib/posFocus'
import { togglePosQtyMode } from '../../../lib/posNumpadKeys'
import { posAskPrintCopies, posConfirm, posNotifyError, posNotifyInfo, posNotifySuccess, posNotifyWarning } from '../../../lib/posNotify'
import { holdDataFromPosState, printHoldReceipt } from '../../../lib/printHoldReceipt'
import { deliveryDataFromPosState, printDeliveryReceipt } from '../../../lib/printDeliveryReceipt'
import { openDisplayWindow, isWindowOpen, closeDisplayWindow, setSunmiDisplayPlugin } from '../../../lib/customerDisplay'
import { IS_ANDROID } from '../../../lib/sunmiCameraScanner'

import GroupModal from '../../../modals/GroupModal'
import ProductLookupModal from '../../../modals/ProductLookupModal'
import RecallHoldModal from '../../../modals/RecallHoldModal'
import BillReprintModal from '../../../modals/BillReprintModal'
import PrivilegeCustomerModal from '../../../modals/PrivilegeCustomerModal'
import PriceEnquiryModal from '../../../modals/PriceEnquiryModal'
import PriceChangeModal from '../../../modals/PriceChangeModal'
import QtyWheelModal from '../../../modals/QtyWheelModal'
import PacketScanModal from '../../../modals/PacketScanModal'
import CashInOutModal from '../../../modals/CashInOutModal'
import ReportsModal from '../../../modals/ReportsModal'
import CommentsModal from '../../../modals/CommentsModal'
import CurrencyModal from '../../../modals/CurrencyModal'
import CreditSettlementModal from '../../../modals/CreditSettlementModal'
import SalesManModal from '../../../modals/SalesManModal'
import BillDiscountModal from '../../../modals/BillDiscountModal'
import DeliveryCustomerModal from '../../../modals/DeliveryCustomerModal'
import DeliverySettlementModal from '../../../modals/DeliverySettlementModal'

const SunmiCustomerDisplay = registerPlugin('SunmiCustomerDisplay', {
  web: {
    async isAvailable() { return { available: false, displayCount: 1 } },
    async openDisplay() {},
    async closeDisplay() {},
    async sendState() {},
  },
})

/**
 * Every POS home-screen action, by label, plus the modals they open.
 *
 *   const actions = usePosActions({ onSave })
 *   actions.run('Hold')          // perform an action
 *   actions.openGroup(group)     // Groups tab: a product group was tapped
 *   {actions.modals}             // render once
 *
 * `onSave(andPrint)` is the page's save handler (used by "Bill Print").
 */
export function usePosActions({ onSave }) {
  const navigate       = useNavigate()
  const cartItems      = usePosStore(s => s.cartItems)
  const selectedRowKey = usePosStore(s => s.selectedRowKey)
  const qtyBuffer      = usePosStore(s => s.qtyBuffer)
  const returnMode     = usePosStore(s => s.returnMode)
  const qtyEntry       = usePosStore(s => s.inputMode === 'qty')
  const customerDisplayEnabled = usePosStore(s => s.customerDisplayEnabled)

  // One popup at a time
  const [modal, setModal]           = useState(null)
  const [groupPreset, setGroupPreset] = useState(null)
  const [lookupGroup, setLookupGroup] = useState(null)
  const [deliverySavePending, setDeliverySavePending] = useState(false)
  const [holdLoading, setHoldLoading] = useState(false)
  const [deliverySaving, setDeliverySaving] = useState(false)
  const [cdOpen, setCdOpen] = useState(false)

  const close = () => { setModal(null); setGroupPreset(null); setLookupGroup(null) }

  // Auto-open customer display on Android when feature is enabled
  useEffect(() => {
    if (!customerDisplayEnabled || !IS_ANDROID || cdOpen) return
    SunmiCustomerDisplay.isAvailable().then(({ available }) => {
      if (!available) return
      SunmiCustomerDisplay.openDisplay({ url: `${window.location.origin}/customer-display` })
        .then(() => { setSunmiDisplayPlugin(SunmiCustomerDisplay); setCdOpen(true) })
        .catch(() => {})
    }).catch(() => {})
  }, [customerDisplayEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Hold ───────────────────────────────────────────────── */
  async function doHoldBill() {
    const state = usePosStore.getState()
    if (!state.cartItems.length || holdLoading) return

    setHoldLoading(true)
    try {
      const result = await api.counterPos.holdBill({
        cartItems: enrichCartItemsForSave(state.cartItems),
        paymentMode: state.paymentMode,
        counterNo: state.counterNo,
        subTotal: state.subTotal,
        discountAmt: state.discountAmt,
        taxableAmt: state.taxableAmt,
        taxAmt: state.taxAmt,
        roundOff: state.roundOff,
        netAmount: state.netAmount,
        customerId: state.customerId,
        remarks: state.billComment?.trim() || null,
        isReturn: state.returnMode || state.cartItems.some(i => Number(i.qty) < 0),
        recalledHoldSalesId: state.recalledHoldSalesId ?? null,
      }, state.accessToken)
      setHoldLoading(false)
      const holdPrint = holdDataFromPosState(state, result)
      try {
        const copies = await posAskPrintCopies({ title: 'Hold Print', message: 'How many copies do you need?', defaultValue: 1 })
        if (copies != null) {
          await printHoldReceipt(holdPrint, { companyName: state.shopName, branchName: state.shopSubName }, copies)
        }
      } catch (printErr) {
        posNotifyWarning(printErr.message ?? 'Hold saved but print failed', { title: 'Hold Print' })
      }
      usePosStore.setState({ recalledHoldSalesId: null })
      state.clearAll()
      posNotifySuccess(result.message ?? `Bill held as ${result.holdNo}`, { title: 'Hold Bill', duration: 1200 })
    } catch (e) {
      posNotifyError(e.message, { title: 'Hold Bill' })
    } finally {
      setHoldLoading(false)
    }
  }

  /* ── Delivery ───────────────────────────────────────────── */
  async function doSaveDelivery(details) {
    const state = usePosStore.getState()
    if (!state.cartItems.length || deliverySaving) return

    state.setDeliveryInfo(details)
    setDeliverySaving(true)
    try {
      const result = await api.counterPos.saveDelivery({
        cartItems: enrichCartItemsForSave(state.cartItems),
        counterNo: state.counterNo,
        subTotal: state.subTotal,
        discountAmt: state.discountAmt,
        taxableAmt: state.taxableAmt,
        taxAmt: state.taxAmt,
        roundOff: state.roundOff,
        netAmount: state.netAmount,
        customerId: details.customerId,
        deliveryTime: details.deliveryTime,
        deliveryAddress: details.deliveryAddress,
        deliveryPhone: details.deliveryPhone,
        remarks: state.billComment?.trim() || null,
        recalledDeliverySalesId: state.recalledDeliverySalesId ?? null,
      }, state.accessToken)
      setDeliverySaving(false)
      const deliveryPrint = deliveryDataFromPosState(state, result, details)
      try {
        const copies = await posAskPrintCopies({ title: 'Delivery Print', message: 'How many copies do you need?', defaultValue: 1 })
        if (copies != null) {
          await printDeliveryReceipt(deliveryPrint, { companyName: state.shopName, branchName: state.shopSubName }, copies)
        }
      } catch (printErr) {
        posNotifyWarning(printErr.message ?? 'Delivery saved but print failed', { title: 'Delivery Print' })
      }
      usePosStore.setState({ recalledDeliverySalesId: null })
      state.clearAll()
      close()
      setDeliverySavePending(false)
      posNotifySuccess(result.message ?? `Delivery saved as ${result.holdNo}`, { title: 'Save Delivery', duration: 1200 })
    } catch (e) {
      posNotifyError(e.message, { title: 'Save Delivery' })
    } finally {
      setDeliverySaving(false)
    }
  }

  function handleDeliveryConfirm(details) {
    usePosStore.getState().setDeliveryInfo(details)
    close()
    if (deliverySavePending) doSaveDelivery(details)
  }

  /* ── Customer display (second screen) ───────────────────── */
  function toggleCustomerDisplay() {
    if (IS_ANDROID) {
      if (cdOpen) {
        SunmiCustomerDisplay.closeDisplay().catch(() => {})
        setCdOpen(false)
        return
      }
      SunmiCustomerDisplay.isAvailable().then(({ available }) => {
        if (!available) {
          posNotifyWarning('No secondary display detected on this device', { title: 'Customer Display' })
          return
        }
        SunmiCustomerDisplay.openDisplay({ url: `${window.location.origin}/customer-display` })
          .then(() => { setSunmiDisplayPlugin(SunmiCustomerDisplay); setCdOpen(true) })
          .catch(e => posNotifyError(e.message, { title: 'Customer Display' }))
      })
      return
    }
    if (cdOpen && isWindowOpen()) { closeDisplayWindow(); setCdOpen(false) }
    else { openDisplayWindow(); setCdOpen(true) }
  }

  /* ── Product / group entry ──────────────────────────────── */
  function handleLookupSelect(product) {
    if (!product?.productId && !product?.productCode && !product?.barcode) return
    const { parseScanQty, resetAfterLineScan, addItem } = usePosStore.getState()
    addItem({
      productId:   product.productId,
      barcode:     product.barcode ?? product.productCode,
      productCode: product.productCode,
      description: product.description ?? product.productName,
      qty:         parseScanQty(qtyBuffer),
      unitPrice:   product.unitPrice,
      discount:    0,
      vatPer:      product.vatPer ?? 0,
    })
    resetAfterLineScan()
  }

  function handleGroupSelect({ group, unitPrice, mode }) {
    if (mode === 'price_entry') {
      const qty = parseFloat(qtyBuffer) > 0 ? parseFloat(qtyBuffer) : 1
      usePosStore.getState().addGroupItem(group, unitPrice, qty)
    } else if (mode === 'product_lookup') {
      setLookupGroup(group)
      setModal('lookup')
    }
  }

  /** Groups tab: browse groups open product lookup; price groups ask for the price. */
  function openGroup(group) {
    if (isGroupBrowseMode(group)) { setLookupGroup(group); setModal('lookup'); return }
    setGroupPreset(group)
    setModal('group')
  }

  const needRow = (title, next) => () => {
    if (!usePosStore.getState().selectedRowKey) { posNotifyWarning('Select a row first', { title }); return }
    next()
  }
  const needCart = (title, next) => () => {
    if (!usePosStore.getState().cartItems.length) { posNotifyWarning('Cart is empty', { title }); return }
    next()
  }
  const open = (key) => () => setModal(key)

  const ACTIONS = {
    // Page 1
    'Clear All':      () => usePosStore.getState().clearAll(),
    'Clear Line':     () => {
      const { selectedRowKey: key, removeItem } = usePosStore.getState()
      if (key) removeItem(key)
      else posNotifyWarning('Select a row first', { title: 'Clear Line' })
    },
    'Qty':            () => togglePosQtyMode(),
    'Groups':         open('group'),
    'Return':         () => usePosStore.getState().toggleReturn(),
    'Product Lookup': open('lookup'),
    'Hold':           () => doHoldBill(),
    'Recall Hold':    open('recall'),
    'Bill Print':     () => onSave?.(true),
    'Bill Reprint':   open('reprint'),
    'Repeat':         () => usePosStore.getState().repeatLastItem(),
    'Price Change':   needRow('Price Change', open('priceChange')),
    'Qty Change':     needRow('Qty Change', open('qtyChange')),

    // Page 2
    'Sub Total':      () => usePosStore.getState().pressSubTotal(),
    'Discount':       needCart('Discount', open('billDiscount')),
    'Packet Scan':    open('packetScan'),
    'Price Enquiry':  open('priceEnquiry'),
    'Currency':       open('currency'),
    'Sales Man':      open('salesMan'),
    'Privilege':      open('privilege'),
    'Report':         open('reports'),
    'Cash In/Out':    open('cashInOut'),
    'Receipt':        open('creditSettlement'),
    'Comments':       open('comments'),
    'Cust Display':   () => toggleCustomerDisplay(),
    'NP Scale':       () => posNotifyInfo('Weighing scale requires the Android/Sunmi hardware build', { title: 'NP Scale', duration: 1800 }),
    // Lock: back to the PIN screen; the open bill stays in memory.
    'Lock':           () => navigate('/'),
    'No Sale':        () => posNotifyInfo('No cash drawer is connected to this counter', { title: 'No Sale', duration: 1800 }),
    'Top Move':       () => posNotifyInfo('Not available yet', { title: 'Top Move' }),

    // Delivery
    'Delivery':       () => { setDeliverySavePending(false); setModal('delivery') },
    'Save Delivery':  needCart('Save Delivery', () => { setDeliverySavePending(true); setModal('delivery') }),
    'Settlement':     open('deliverySettlement'),

    // Session (Log Out tab)
    'Add New':        () => posNotifyInfo('Not available yet', { title: 'Add New' }),
    'Exit': async () => {
      const ok = await posConfirm({ title: 'Exit', message: 'Close the POS?', confirmLabel: 'Exit', cancelLabel: 'Cancel' })
      if (!ok) return
      usePosStore.getState().logout()
      if (IS_ANDROID) CapacitorApp.exitApp()
      else navigate('/')
    },
    'Log Out': async () => {
      const ok = await posConfirm({ title: 'Log Out', message: 'Log out of the POS?', confirmLabel: 'Log Out', cancelLabel: 'Cancel' })
      if (!ok) return
      usePosStore.getState().logout()
      navigate('/')
    },
  }

  const run = (label) => {
    const fn = ACTIONS[label]
    if (fn) fn()
    else posNotifyInfo('Not available yet', { title: label })
  }

  const done = (fn) => closeAndFocusBarcode(fn ?? close)

  const modals = (
    <>
      {modal === 'group' && (
        <GroupModal
          initialGroup={groupPreset}
          onClose={done()}
          onSelect={done((result) => { close(); handleGroupSelect(result) })}
        />
      )}
      {modal === 'lookup' && (
        <ProductLookupModal
          groupId={lookupGroup?.groupId ?? null}
          groupLabel={lookupGroup?.groupDescription ?? ''}
          onClose={done()}
          onSelect={done((product) => { handleLookupSelect(product); close() })}
        />
      )}
      {modal === 'recall'       && <RecallHoldModal onClose={done()} onRecall={done()} />}
      {modal === 'reprint'      && <BillReprintModal onClose={done()} />}
      {modal === 'privilege'    && <PrivilegeCustomerModal onClose={done()} onApply={done()} />}
      {modal === 'priceEnquiry' && <PriceEnquiryModal onClose={done()} />}
      {modal === 'priceChange'  && <PriceChangeModal onClose={done()} />}
      {modal === 'qtyChange'    && <QtyWheelModal onClose={done()} />}
      {modal === 'packetScan'   && <PacketScanModal onClose={done()} />}
      {modal === 'cashInOut'    && <CashInOutModal onClose={done()} />}
      {modal === 'reports'      && <ReportsModal onClose={done()} onSelect={() => {}} />}
      {modal === 'comments'     && <CommentsModal onClose={done()} />}
      {modal === 'currency'     && <CurrencyModal onClose={done()} />}
      {modal === 'creditSettlement' && <CreditSettlementModal onClose={done()} />}
      {modal === 'salesMan'     && <SalesManModal onClose={done()} onApply={done()} />}
      {modal === 'billDiscount' && <BillDiscountModal onClose={done()} />}
      {modal === 'delivery' && (
        <DeliveryCustomerModal
          title={deliverySavePending ? 'Save Delivery — Customer Details' : 'Delivery — Customer Details'}
          onClose={done(() => { close(); setDeliverySavePending(false) })}
          onConfirm={done(handleDeliveryConfirm)}
        />
      )}
      {modal === 'deliverySettlement' && <DeliverySettlementModal onClose={done()} />}
    </>
  )

  return {
    run,
    openGroup,
    modals,
    holdLoading,
    isActive: (label) => (label === 'Return' ? returnMode : label === 'Qty' ? qtyEntry : label === 'Cust Display' ? cdOpen : false),
    hasCart: cartItems.length > 0,
    hasRow: !!selectedRowKey,
  }
}
