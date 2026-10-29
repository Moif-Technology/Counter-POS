import { useState } from 'react'
import { usePosStore } from '../../../store/posStore'
import { getCartRowKey } from '../../../lib/cartLine'
import { LITE_TAX_RATE } from '../../../config/appConfig'
import { normalizePaymentMode } from '../../../lib/paymentModes'
import { printReceipt } from '../../../lib/printReceipt'
import { posNotifyError, posNotifySuccess, posNotifyWarning } from '../../../lib/posNotify'
import {
  PRICE_LEVELS, PRICE_LEVEL_ORDER, buildLiteReceiptItems, nextSeq, roundAmt,
} from '../liteHelpers'

/**
 * The bill being rung up on the Lite screen: cart lines live in the shared
 * POS store (same billing engine as the normal POS); Lite-only bill state
 * (sales man, price level, delivery, privilege, qty keypad buffer) lives here.
 * Completed/held/delivery bills are written to the ledger.
 */
export function useLiteBill(ledger) {
  const cartItems          = usePosStore(s => s.cartItems)
  const selectedRowKey     = usePosStore(s => s.selectedRowKey)
  const addItem            = usePosStore(s => s.addItem)
  const updateLine         = usePosStore(s => s.updateLine)
  const removeItemStore    = usePosStore(s => s.removeItem)
  const clearAllStore      = usePosStore(s => s.clearAll)
  const subTotal           = usePosStore(s => s.subTotal)
  const discountAmt        = usePosStore(s => s.discountAmt)
  const taxableAmt         = usePosStore(s => s.taxableAmt)
  const taxAmt             = usePosStore(s => s.taxAmt)
  const roundOff           = usePosStore(s => s.roundOff)
  const netAmount          = usePosStore(s => s.netAmount)
  const paymentMode        = usePosStore(s => s.paymentMode)
  const setPaymentMode     = usePosStore(s => s.setPaymentMode)
  const billComment        = usePosStore(s => s.billComment)
  const setBillComment     = usePosStore(s => s.setBillComment)
  const customerId         = usePosStore(s => s.customerId)
  const customerName       = usePosStore(s => s.customerName)
  const customerCode       = usePosStore(s => s.customerCode)
  const setCustomerStore   = usePosStore(s => s.setCustomer)
  const clearCustomerStore = usePosStore(s => s.clearCustomer)

  const [qtyBuffer, setQtyBuffer]             = useState('')
  const [saving, setSaving]                   = useState(false)
  const [salesMan, setSalesMan]               = useState(null)
  const [privilegeActive, setPrivilegeActive] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [isDelivery, setIsDelivery]           = useState(false)
  const [priceLevel, setPriceLevel]           = useState('Retail')

  const { setHeldBills, setSavedBills, setCashEntries, setDeliveries } = ledger

  // ── Cart ──
  const selectRow = (rowKey) => {
    usePosStore.setState({ selectedRowKey: rowKey })
    setQtyBuffer('')
  }

  const deleteMany = (rowKeys) => {
    const keys = new Set(rowKeys)
    if (!keys.size) return
    const newItems = cartItems
      .filter(i => !keys.has(getCartRowKey(i)))
      .map((i, idx) => ({ ...i, slNo: idx + 1 }))
    usePosStore.setState({ cartItems: newItems, selectedRowKey: null })
    usePosStore.getState().recalc(newItems)
    posNotifySuccess(`${keys.size} item(s) removed`, { title: 'Delete', duration: 1000 })
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

  const clearSelectedLine = () => {
    if (!selectedRowKey) { posNotifyWarning('Select a row first', { title: 'Clear Line' }); return }
    removeItemStore(selectedRowKey)
    posNotifySuccess('Line cleared', { title: 'Clear Line', duration: 1000 })
  }

  const returnSelectedLine = () => {
    if (!selectedRowKey) { posNotifyWarning('Select a row first', { title: 'Return' }); return }
    const item = cartItems.find(i => getCartRowKey(i) === selectedRowKey)
    if (item) updateLine(selectedRowKey, { qty: -Number(item.qty) })
  }

  // ── Qty keypad (right panel) ──
  const pressKey = (key) => {
    if (key === 'C') { setQtyBuffer(''); return }
    if (key === '⌫') { setQtyBuffer(b => b.slice(0, -1)); return }
    if (/^\d$/.test(key)) setQtyBuffer(b => (b.length < 5 ? b + key : b))
  }

  const applyQty = () => {
    if (!selectedRowKey || !qtyBuffer) return
    const qty = parseInt(qtyBuffer, 10)
    if (!Number.isFinite(qty) || qty <= 0) return
    updateLine(selectedRowKey, { qty })
    setQtyBuffer('')
  }

  // ── Customer / pricing ──
  const selectCustomer = (c) => {
    if (c) {
      setCustomerStore(c.customerId, c.customerName, c.customerCode, c.paymentMode, c.osAmount)
      setPaymentMode(normalizePaymentMode(c.paymentMode))
    } else {
      clearCustomerStore()
    }
  }

  const cyclePriceLevel = () => {
    const next = PRICE_LEVEL_ORDER[(PRICE_LEVEL_ORDER.indexOf(priceLevel) + 1) % PRICE_LEVEL_ORDER.length]
    setPriceLevel(next)
    posNotifySuccess(`Price level: ${next}`, { title: 'Price Level', duration: 1200 })
  }

  const applyPrivilege = (customer) => {
    const next = !privilegeActive
    setPrivilegeActive(next)
    usePosStore.getState().setBillDiscount(roundAmt(subTotal * (next ? 5 : 0) / 100))
    posNotifySuccess(
      next ? `Privilege discount applied (+5%) for ${customer.customerName}` : 'Privilege discount removed',
      { title: 'Privilege', duration: 1500 },
    )
  }

  // ── Hold / recall ──
  const holdBill = () => {
    if (!cartItems.length) { posNotifyWarning('Cart is empty', { title: 'Hold Bill' }); return }
    const holdNo = nextSeq('hold')
    setHeldBills(prev => [...prev, {
      id: Date.now(),
      holdNo,
      heldAt: new Date(),
      customerId: customerId ?? null,
      customerName: customerName || '',
      customerCode: customerCode || '',
      comment: billComment || '',
      paymentMode,
      salesMan,
      priceLevel,
      isDelivery,
      deliveryAddress,
      cartItems,
      amount: netAmount,
    }])
    clearAll()
    posNotifySuccess(`Bill held as HOLD-${holdNo}`, { title: 'Hold Bill', duration: 1200 })
  }

  const recallHold = (hold) => {
    usePosStore.setState({ cartItems: hold.cartItems, selectedRowKey: null })
    usePosStore.getState().recalc(hold.cartItems)
    if (hold.customerId != null) {
      setCustomerStore(hold.customerId, hold.customerName, hold.customerCode, hold.paymentMode, 0)
    } else {
      clearCustomerStore()
    }
    setPaymentMode(hold.paymentMode)
    setBillComment(hold.comment || '')
    setSalesMan(hold.salesMan ?? null)
    setPriceLevel(hold.priceLevel ?? 'Retail')
    setIsDelivery(!!hold.isDelivery)
    setDeliveryAddress(hold.deliveryAddress || '')
    setHeldBills(prev => prev.filter(h => h.id !== hold.id))
    posNotifySuccess(`Recalled HOLD-${hold.holdNo}`, { title: 'Recall', duration: 1200 })
  }

  const cancelHold = (hold) => {
    setHeldBills(prev => prev.filter(h => h.id !== hold.id))
    posNotifySuccess(`Hold HOLD-${hold.holdNo} cancelled`, { title: 'Cancel Hold', duration: 1000 })
  }

  // ── Delivery ──
  /** Delivery modal confirmed: save the bill as a delivery, or just mark it for delivery. */
  const confirmDelivery = (details, savePending) => {
    setDeliveryAddress(details.deliveryAddress)
    if (savePending) {
      const deliveryNo = nextSeq('delivery')
      setDeliveries(prev => [...prev, {
        id: Date.now(), deliveryNo, cartItems,
        address: details.deliveryAddress,
        customerName: details.customerName || '',
        amount: netAmount,
      }])
      clearAll()
      posNotifySuccess(`Delivery saved as DEL-${deliveryNo}`, { title: 'Save Delivery', duration: 1200 })
    } else {
      setIsDelivery(true)
      posNotifySuccess('Bill marked for delivery', { title: 'Delivery', duration: 1200 })
    }
  }

  /** Delivery recalled from Delivery Settlement → back into the bill. */
  const loadDelivery = (d) => {
    usePosStore.setState({ cartItems: d.cartItems, selectedRowKey: null })
    usePosStore.getState().recalc(d.cartItems)
    if (d.customerName) {
      setCustomerStore(null, d.customerName, '', 'CASH', 0)
    }
    setDeliveryAddress(d.address || '')
    setIsDelivery(true)
  }

  // ── Cash in/out (CashInOutModal saveFn) ──
  const saveCashEntry = async (entry) => {
    setCashEntries(prev => [...prev, {
      id: Date.now(),
      type: entry.transactionType === 'CASH_IN' ? 'IN' : 'OUT',
      amount: roundAmt(entry.amount),
      remarks: entry.remarks || '',
      createdAt: new Date(),
      counterCloseNo: null,
    }])
  }

  // ── Save ──
  const saveBill = (andPrint = false) => {
    if (!cartItems.length) {
      posNotifyWarning('Cart is empty', { title: 'Save Bill' })
      return
    }
    setSaving(true)
    try {
      const billNo = `LITE-${String(nextSeq('bill')).padStart(4, '0')}`
      const receipt = {
        shopName: 'MOIF POS',
        shopSubName: 'Lite Mode',
        billNo,
        billDate: new Date(),
        cashierName: salesMan || 'Lite',
        counterNo: '1',
        customerId: customerId ?? null,
        customerCode: customerCode || '',
        customerName: customerName || '',
        remarks: billComment || '',
        items: buildLiteReceiptItems(cartItems),
        subTotal,
        discountAmt,
        taxableAmt,
        taxAmt,
        roundOff,
        netAmount,
        paidAmount: netAmount,
        balanceAmount: 0,
        paymentMode,
        currency: 'AED',
      }
      if (andPrint) printReceipt(receipt)
      setSavedBills(prev => [...prev, { billNo, billDate: receipt.billDate, counterCloseNo: null, receipt }])
      posNotifySuccess(`Bill ${billNo} saved!`, { title: 'Bill Saved', duration: 1200 })
      clearAll()
    } catch (err) {
      posNotifyError(err.message ?? 'Save failed', { title: 'Save Bill' })
    } finally {
      setSaving(false)
    }
  }

  return {
    qtyBuffer, saving, salesMan, setSalesMan, priceLevel, isDelivery, deliveryAddress,
    selectRow, deleteMany, addToCart, clearAll, clearSelectedLine, returnSelectedLine,
    pressKey, applyQty, selectCustomer, cyclePriceLevel, applyPrivilege,
    holdBill, recallHold, cancelHold, confirmDelivery, loadDelivery, saveCashEntry, saveBill,
  }
}
