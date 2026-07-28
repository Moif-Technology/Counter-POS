import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../../store/posStore'
import { getCartRowKey } from '../../lib/cartLine'
import { LITE_TAX_RATE } from '../../config/appConfig'
import { searchLiteProducts, LITE_GROUPS } from './liteProducts'
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
import ProductLookupModal from '../../components/popup/ProductLookupModal'
import GroupModal from '../../components/popup/GroupModal'
import PriceEnquiryModal from '../../components/popup/PriceEnquiryModal'
import PrivilegeCustomerModal from '../../components/popup/PrivilegeCustomerModal'
import CashInOutModal from '../../components/popup/CashInOutModal'
import DeliveryCustomerModal from '../../components/popup/DeliveryCustomerModal'
import CreditSettlementModal from '../../components/popup/CreditSettlementModal'
import DeliverySettlementModal from '../../components/popup/DeliverySettlementModal'
import ReportsModal from '../../components/popup/ReportsModal'

import LiteHeader from './components/LiteHeader'
import LiteSearchPanel from './components/LiteSearchPanel'
import LiteCartTable from './components/LiteCartTable'
import LiteCustomerPicker from './components/LiteCustomerPicker'
import LiteBillSummary from './components/LiteBillSummary'
import LiteQtyKeypad from './components/LiteQtyKeypad'
import LitePaymentModes, { PAYMENT_MODES } from './components/LitePaymentModes'
import LiteActionBar from './components/LiteActionBar'
import LiteMoreOptionsModal from './components/LiteMoreOptionsModal'
import LiteRecallModal from './components/LiteRecallModal'
import LiteReprintModal from './components/LiteReprintModal'

const PRICE_LEVELS = { Retail: 1, Wholesale: 0.9, VIP: 0.85 }
const PRICE_LEVEL_ORDER = ['Retail', 'Wholesale', 'VIP']

/** Same shape the normal POS's GroupModal expects (groupId/groupDescription/keyShift).
 *  keyShift=0 → price-entry mode (same as normal POS default): pick a group, type an
 *  amount, Done adds a group-priced line to the cart. */
const LITE_GROUP_OBJECTS = LITE_GROUPS.map((name, i) => ({ groupId: i + 1, groupDescription: name, keyShift: 0 }))

const roundAmt = (n) => Math.round((Number(n) || 0) * 100) / 100

/** Same item shape the normal POS's Sales Viewer / Bill Detail expect. */
const buildLiteReceiptItems = (cartItems) => cartItems.map((i, idx) => ({
  productCode: i.barcode ?? '', description: i.description, qty: i.qty,
  unitPrice: i.unitPrice, vatPer: i.vatPer, vatAmt: i.vatAmt ?? 0,
  discount: i.discountAmt ?? 0, subTotal: i.subTotal ?? i.lineTotal,
  lineTotal: i.lineTotal, salesChildId: idx,
}))

let liteBillSeq = 1
let liteHoldSeq = 1
let liteDeliverySeq = 1
let liteSettlementSeq = 1
let liteCloseSeq = 1

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
  const setBillComment      = usePosStore(s => s.setBillComment)
  const customerId          = usePosStore(s => s.customerId)
  const customerName        = usePosStore(s => s.customerName)
  const customerCode        = usePosStore(s => s.customerCode)
  const setCustomerStore    = usePosStore(s => s.setCustomer)
  const clearCustomerStore  = usePosStore(s => s.clearCustomer)

  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState(null)
  const [qtyBuffer, setQtyBuffer] = useState('')
  const [saving, setSaving] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showRecall, setShowRecall] = useState(false)
  const [showReprint, setShowReprint] = useState(false)
  const [heldBills, setHeldBills] = useState([]) // { id, holdNo, heldAt, customerName, customerId, customerCode, comment, paymentMode, salesMan, priceLevel, isDelivery, deliveryAddress, cartItems, amount }
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
  const [savedBills, setSavedBills] = useState([]) // { billNo, billDate, receipt }
  const [showPacketScan, setShowPacketScan] = useState(false)
  const [showBillDiscount, setShowBillDiscount] = useState(false)
  const [showPriceChange, setShowPriceChange] = useState(false)
  const [showQtyChange, setShowQtyChange] = useState(false)
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [showSalesManModal, setShowSalesManModal] = useState(false)
  const [showProductLookup, setShowProductLookup] = useState(false)
  const [lookupGroup, setLookupGroup] = useState(null) // { groupId, groupDescription }
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showPriceEnquiry, setShowPriceEnquiry] = useState(false)
  const [showPrivilegeModal, setShowPrivilegeModal] = useState(false)
  const [showCashInOut, setShowCashInOut] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [deliverySavePending, setDeliverySavePending] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [settlementHistory, setSettlementHistory] = useState([]) // credit settlement receipts
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [counterCloses, setCounterCloses] = useState([]) // X/Z counter-close history
  const searchInputRef = useRef(null)

  // Seed the shared store's productGroups from local mock data so GroupModal
  // (reused as-is from the normal POS) has something to show — Lite has no
  // accessToken, so the modal's own accessToken-gated fetch never overwrites this.
  useEffect(() => {
    usePosStore.setState({ productGroups: LITE_GROUP_OBJECTS })
  }, [])

  const results = useMemo(() => searchLiteProducts(query, activeGroup), [query, activeGroup])

  const liteProductSearchFn = async (q, price, gid) => {
    const groupName = gid != null ? LITE_GROUP_OBJECTS.find(g => g.groupId === gid)?.groupDescription : null
    let list = searchLiteProducts(q, groupName)
    const maxPrice = parseFloat(price)
    if (Number.isFinite(maxPrice) && maxPrice > 0) list = list.filter(p => p.price <= maxPrice)
    return { products: list.map(p => ({ ...p, unitPrice: p.price, unitName: '—' })) }
  }

  const litePriceEnquiryFn = async (term) => {
    const match = searchLiteProducts(term)[0]
    if (!match) { const e = new Error('No item found for this barcode'); e.status = 404; throw e }
    return {
      product: {
        barcode: match.barcode, description: match.description, unitName: '—',
        unitPrice: match.price, vatPer: LITE_TAX_RATE, qtyOnHand: 999,
      },
    }
  }

  const liteCustomerSearchFn = (limit) => async (q) => {
    const term = String(q || '').trim().toLowerCase()
    const list = customersList.filter(c => !term
      || c.customerName.toLowerCase().includes(term)
      || c.customerCode.toLowerCase().includes(term)
      || (c.mobileNo || '').includes(term))
    return { customers: list.slice(0, limit) }
  }

  // ── Credit Settlement ("Receipt") — same CreditSettlementModal as the normal
  // POS, backed by Lite's local customersList/osAmount instead of the server ──
  const liteCreditCustomersFn = async (q) => {
    const term = String(q || '').trim().toLowerCase()
    const list = customersList.filter(c => normalizePaymentMode(c.paymentMode) === PM.CREDIT
      && (!term || c.customerName.toLowerCase().includes(term) || c.customerCode.toLowerCase().includes(term)))
    return { customers: list }
  }

  const liteOutstandingBillsFn = async (customerId) => {
    const c = customersList.find(x => x.customerId === customerId)
    const osAmount = roundAmt(c?.osAmount ?? 0)
    return {
      billsTotal: osAmount,
      osAmount,
      billsSum: osAmount,
      bills: osAmount > 0
        ? [{ billId: 1, invoiceNo: `LITE-INV-${customerId}`, billDate: new Date(), currentAmount: osAmount }]
        : [],
    }
  }

  const liteSettleFn = async ({ customerId, amount, paymentMode, counterNo }) => {
    const c = customersList.find(x => x.customerId === customerId)
    const osBefore = roundAmt(c?.osAmount ?? 0)
    const osAfter = roundAmt(osBefore - amount)
    setCustomersList(prev => prev.map(x => x.customerId === customerId ? { ...x, osAmount: osAfter } : x))

    const transactionNo = liteSettlementSeq++
    const clearedBills = [{
      billId: 1, invoiceNo: `LITE-INV-${customerId}`, billDate: new Date(),
      invoiceAmount: osBefore, osBefore, paidAmount: amount, osAfter,
    }]
    const transactionDate = new Date()
    setSettlementHistory(prev => [...prev, {
      transactionId: transactionNo, receiptNo: `RCV-${transactionNo}`,
      customerId, customerCode: c?.customerCode, customerName: c?.customerName,
      transactionDate, paidAmount: amount, paymentMode, osBefore, osAfter, clearedBills,
      voucher: null, counterNo,
    }])

    return {
      transactionNo, receiptNo: `RCV-${transactionNo}`,
      customerId, customerCode: c?.customerCode, customerName: c?.customerName,
      amount, paymentMode, osBefore, remainingOs: osAfter, counterNo,
      billsCleared: clearedBills,
    }
  }

  const liteHistoryFn = async ({ customerId, dateFrom, dateTo, limit }) => {
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(dateTo) : null
    const list = settlementHistory
      .filter(h => !customerId || String(h.customerId) === String(customerId))
      .filter(h => !from || h.transactionDate >= from)
      .filter(h => !to || h.transactionDate <= new Date(to.getTime() + 86400000))
      .sort((a, b) => b.transactionDate - a.transactionDate)
      .slice(0, limit || 150)
    return { receipts: list }
  }

  const liteReceiptFn = async (transactionId) => {
    const h = settlementHistory.find(x => x.transactionId === transactionId)
    if (!h) { const e = new Error('Receipt not found'); e.status = 404; throw e }
    return h
  }

  // ── Delivery Settlement ("Settlement" — post invoice after payment) — same
  // DeliverySettlementModal as the normal POS, backed by Lite's local deliveries ──
  const liteLoadDeliveriesFn = async () => deliveries.map(d => ({
    sales_id: d.id, hold_no: d.deliveryNo,
    customer_name: d.customerName || null, customer_code: '',
    delivery_time: null, remarks: d.address, amount: d.amount,
  }))

  const liteDeliverySettleFn = async ({ items }) => {
    const settledIds = new Set(items.map(i => i.salesId))
    const settled = deliveries.filter(d => settledIds.has(d.id))
    setDeliveries(prev => prev.filter(d => !settledIds.has(d.id)))

    settled.forEach(d => {
      const item = items.find(i => i.salesId === d.id)
      const billNo = `DEL-${d.deliveryNo}`
      const itemsList = buildLiteReceiptItems(d.cartItems)
      const lineSubTotal = roundAmt(itemsList.reduce((s, i) => s + i.subTotal, 0))
      const lineTax = roundAmt(itemsList.reduce((s, i) => s + i.vatAmt, 0))
      const lineDisc = roundAmt(itemsList.reduce((s, i) => s + i.discount, 0))
      const receipt = {
        shopName: 'MOIF POS', shopSubName: 'Lite Mode — Delivery Settlement',
        billNo, billDate: new Date(),
        cashierName: salesMan || 'Lite', counterNo: '1',
        customerCode: '', customerName: d.customerName || '', remarks: d.address || '',
        items: itemsList,
        subTotal: lineSubTotal, discountAmt: lineDisc, taxableAmt: lineSubTotal, taxAmt: lineTax, roundOff: 0,
        netAmount: d.amount, paidAmount: item?.paidAmount ?? d.amount, balanceAmount: item?.balanceAmount ?? 0,
        paymentMode: item?.paymentMode ?? 'CASH', currency: 'AED',
      }
      setSavedBills(prev => [...prev, { billNo, billDate: receipt.billDate, counterCloseNo: null, receipt }])
    })

    return { message: `${settled.length} invoice(s) posted`, count: settled.length, results: items.map(i => ({ salesId: i.salesId })) }
  }

  const liteDeliveryRecallFn = async (deliveryNo) => {
    const d = deliveries.find(x => String(x.deliveryNo) === String(deliveryNo))
    if (!d) { const e = new Error(`Delivery ${deliveryNo} not found`); e.status = 404; throw e }
    usePosStore.setState({ cartItems: d.cartItems, selectedRowKey: null })
    usePosStore.getState().recalc(d.cartItems)
    if (d.customerName) {
      setCustomerStore(null, d.customerName, '', 'CASH', 0)
    }
    setDeliveryAddress(d.address || '')
    setIsDelivery(true)
    setDeliveries(prev => prev.filter(x => x.id !== d.id))
  }

  // ── Reports & Operations — same ReportsModal shell as the normal POS.
  // Counter Reading / Staff Wise / Sales Viewer / Counter Close Viewer / Cash
  // In-Out Viewer are all backed by Lite's local savedBills/cashEntries/
  // counterCloses instead of the server. ──
  const litePendingBills = () => savedBills.filter(b => b.counterCloseNo == null)
  const litePendingCash = () => cashEntries.filter(e => e.counterCloseNo == null)

  const buildLiteCounterSummary = () => {
    const bills = litePendingBills()
    const cash = litePendingCash()
    const sumByMode = (mode) => bills.filter(b => b.receipt.paymentMode === mode).reduce((s, b) => s + b.receipt.netAmount, 0)
    const countByMode = (mode) => bills.filter(b => b.receipt.paymentMode === mode).length

    const totalCash = roundAmt(sumByMode('CASH'))
    const totalCredit = roundAmt(sumByMode('CREDIT'))
    const totalCard = roundAmt(sumByMode('CREDITCARD'))
    const multiBillCount = bills.length - countByMode('CASH') - countByMode('CREDIT') - countByMode('CREDITCARD')

    const creditReceiptCash = roundAmt(settlementHistory.filter(h => h.paymentMode === 'CASH').reduce((s, h) => s + h.paidAmount, 0))
    const creditReceiptCard = roundAmt(settlementHistory.filter(h => h.paymentMode !== 'CASH').reduce((s, h) => s + h.paidAmount, 0))

    const totalRefund = roundAmt(bills.filter(b => b.receipt.netAmount < 0).reduce((s, b) => s - b.receipt.netAmount, 0))
    const cashIn = roundAmt(cash.filter(e => e.type === 'IN').reduce((s, e) => s + e.amount, 0))
    const cashOut = roundAmt(cash.filter(e => e.type === 'OUT').reduce((s, e) => s + e.amount, 0))
    const cashToBeCollected = roundAmt(totalCash + creditReceiptCash + cashIn - cashOut)
    const totalDiscount = roundAmt(bills.reduce((s, b) => s + (b.receipt.discountAmt || 0), 0))
    const totalTax = roundAmt(bills.reduce((s, b) => s + (b.receipt.taxAmt || 0), 0))
    const grossAmount = roundAmt(bills.reduce((s, b) => s + b.receipt.netAmount, 0))

    return {
      totalCash, totalCredit, totalCard, creditReceiptCash, creditReceiptCard,
      creditReceiptCount: settlementHistory.length,
      totalRefund, cashIn, cashOut, cashToBeCollected, totalDiscount, totalTax, grossAmount,
      billCount: bills.length, cashBillCount: countByMode('CASH'), creditBillCount: countByMode('CREDIT'),
      cardBillCount: countByMode('CREDITCARD'), multiBillCount: Math.max(0, multiBillCount),
      startBillNo: bills[0]?.billNo, endBillNo: bills[bills.length - 1]?.billNo,
      cashInOutList: cash.map(e => ({ id: e.id, transactionType: e.type === 'IN' ? 'CASH_IN' : 'CASH_OUT', amount: e.amount, remarks: e.remarks })),
    }
  }

  const liteCounterSummaryFn = async () => buildLiteCounterSummary()

  const liteCounterCloseFn = async ({ counterNo, reportType, collectedCash }) => {
    const summary = buildLiteCounterSummary()
    const cashDifference = roundAmt(collectedCash - summary.cashToBeCollected)

    if (reportType !== 'Z') {
      return { closeId: null, closeNo: null, billsClosed: summary.billCount, ...summary, collectedCash, cashDifference }
    }

    const closeId = liteCloseSeq++
    const closeNo = `LITE-Z-${String(closeId).padStart(3, '0')}`
    const closeDate = new Date()
    setSavedBills(prev => prev.map(b => b.counterCloseNo == null ? { ...b, counterCloseNo: closeNo } : b))
    setCashEntries(prev => prev.map(e => e.counterCloseNo == null ? { ...e, counterCloseNo: closeNo } : e))
    setCounterCloses(prev => [...prev, {
      closeId, closeNo, closeDate, reportType: 'Z', counterNo, collectedCash, cashDifference, ...summary,
    }])
    return { closeId, closeNo, billsClosed: summary.billCount, ...summary, collectedCash, cashDifference }
  }

  const liteStaffReportFn = async () => {
    const bills = litePendingBills()
    const byStaff = new Map()
    bills.forEach(b => {
      const name = b.receipt.cashierName || 'Lite'
      if (!byStaff.has(name)) byStaff.set(name, [])
      byStaff.get(name).push(b)
    })
    return Array.from(byStaff.entries()).map(([staffName, rows]) => ({
      staffId: staffName,
      staffName,
      billCount: rows.length,
      grossAmount: roundAmt(rows.reduce((s, b) => s + (b.receipt.subTotal || 0), 0)),
      totalDiscount: roundAmt(rows.reduce((s, b) => s + (b.receipt.discountAmt || 0), 0)),
      totalRoundOff: roundAmt(rows.reduce((s, b) => s + (b.receipt.roundOff || 0), 0)),
      netAmount: roundAmt(rows.reduce((s, b) => s + b.receipt.netAmount, 0)),
      totalCash: roundAmt(rows.filter(b => b.receipt.paymentMode === 'CASH').reduce((s, b) => s + b.receipt.netAmount, 0)),
      totalCard: roundAmt(rows.filter(b => b.receipt.paymentMode === 'CREDITCARD').reduce((s, b) => s + b.receipt.netAmount, 0)),
      totalCredit: roundAmt(rows.filter(b => b.receipt.paymentMode === 'CREDIT').reduce((s, b) => s + b.receipt.netAmount, 0)),
    }))
  }

  const liteSalesListFn = async ({ dateFrom, dateTo, customerId }) => {
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(new Date(dateTo).getTime() + 86400000) : null
    const list = savedBills
      .filter(b => !from || b.billDate >= from)
      .filter(b => !to || b.billDate <= to)
      .filter(b => !customerId || String(b.receipt.customerId) === String(customerId))
      .map(b => ({
        salesId: b.billNo, billDate: b.billDate, billNoDisplay: b.billNo, billTime: b.billDate,
        paymentMode: b.receipt.paymentMode, customerName: b.receipt.customerName || 'Walk-in',
        amount: b.receipt.netAmount, counterCloseNo: b.counterCloseNo ?? 'PENDING', remarks: b.receipt.remarks,
      }))
      .sort((a, b) => b.billDate - a.billDate)
    return { bills: list }
  }

  const liteBillDetailFn = async (salesId) => {
    const b = savedBills.find(x => x.billNo === salesId)
    if (!b) { const e = new Error('Bill not found'); e.status = 404; throw e }
    const r = b.receipt
    return {
      billNoDisplay: b.billNo, billDate: b.billDate, paymentMode: r.paymentMode,
      customer: { customerName: r.customerName || 'Walk-in' }, staffName: r.cashierName,
      counterNo: r.counterNo, counterCloseNo: b.counterCloseNo ?? 'PENDING', remarks: r.remarks,
      items: r.items, amount: r.netAmount, subTotal: r.subTotal, discountAmt: r.discountAmt,
      taxableAmt: r.taxableAmt, taxAmt: r.taxAmt, roundOff: r.roundOff, paymentSplits: null,
    }
  }

  const liteBillPrintFn = async (salesId) => {
    const b = savedBills.find(x => x.billNo === salesId)
    if (!b) { const e = new Error('Bill not found'); e.status = 404; throw e }
    printReceipt(b.receipt)
  }

  const liteCloseHistoryFn = async ({ dateFrom, dateTo, limit }) => {
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(new Date(dateTo).getTime() + 86400000) : null
    const list = counterCloses
      .filter(c => !from || c.closeDate >= from)
      .filter(c => !to || c.closeDate <= to)
      .sort((a, b) => b.closeDate - a.closeDate)
      .slice(0, limit || 150)
    return { closes: list }
  }

  const liteCloseDetailFn = async (closeId) => {
    const c = counterCloses.find(x => x.closeId === closeId)
    if (!c) { const e = new Error('Close not found'); e.status = 404; throw e }
    return c
  }

  const liteCashInOutReportFn = async ({ dateFrom, dateTo, closeNo, limit }) => {
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(new Date(dateTo).getTime() + 86400000) : null
    const list = cashEntries
      .filter(e => !from || e.createdAt >= from)
      .filter(e => !to || e.createdAt <= to)
      .filter(e => !closeNo || (e.counterCloseNo ?? 'PENDING') === closeNo)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit || 500)
      .map(e => ({
        id: e.id, transactionType: e.type === 'IN' ? 'CASH_IN' : 'CASH_OUT', amount: e.amount,
        remarks: e.remarks, createdAt: e.createdAt, counterNo: '1', counterCloseNo: e.counterCloseNo ?? 'PENDING',
      }))
    const totalCashIn = roundAmt(list.filter(e => e.transactionType === 'CASH_IN').reduce((s, e) => s + e.amount, 0))
    const totalCashOut = roundAmt(list.filter(e => e.transactionType === 'CASH_OUT').reduce((s, e) => s + e.amount, 0))
    return {
      transactions: list,
      summary: {
        totalCashIn, totalCashOut, netCash: roundAmt(totalCashIn - totalCashOut),
        cashInCount: list.filter(e => e.transactionType === 'CASH_IN').length,
        cashOutCount: list.filter(e => e.transactionType === 'CASH_OUT').length,
        entryCount: list.length,
      },
    }
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
        const holdNo = liteHoldSeq++
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
        return
      }
      case 'Recall': {
        setShowRecall(true)
        return
      }
      case 'Reprint': {
        setShowReprint(true)
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
        setLookupGroup(null)
        setShowProductLookup(true)
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
        setShowGroupModal(true)
        return
      }
      case 'Packet Scan': {
        setShowPacketScan(true)
        return
      }
      case 'Price Enquiry': {
        setShowPriceEnquiry(true)
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
        setShowPrivilegeModal(true)
        return
      }
      case 'Report': {
        setShowReportModal(true)
        return
      }
      case 'Cash In/Out': {
        setShowCashInOut(true)
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
        setDeliverySavePending(false)
        setShowDeliveryModal(true)
        return
      }
      case 'Save Delivery': {
        if (!cartItems.length) { posNotifyWarning('Cart is empty', { title: 'Save Delivery' }); return }
        setDeliverySavePending(true)
        setShowDeliveryModal(true)
        return
      }
      case 'Receipt': {
        setShowReceiptModal(true)
        return
      }
      case 'Settlement': {
        setShowSettlementModal(true)
        return
      }
      default:
        posNotifyInfo('Available in the full POS only', { title: label })
    }
  }

  const recallLiteHold = (hold) => {
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

  const cancelLiteHold = (hold) => {
    setHeldBills(prev => prev.filter(h => h.id !== hold.id))
    posNotifySuccess(`Hold HOLD-${hold.holdNo} cancelled`, { title: 'Cancel Hold', duration: 1000 })
  }

  const handleGroupSelect = ({ group, unitPrice, mode }) => {
    if (mode === 'price_entry') {
      usePosStore.getState().addGroupItem(group, unitPrice, 1)
    } else if (mode === 'product_lookup') {
      setLookupGroup({ groupId: group.groupId, groupDescription: group.groupDescription })
      setShowProductLookup(true)
    }
  }

  const handlePrivilegeApply = (customer) => {
    const next = !privilegeActive
    setPrivilegeActive(next)
    usePosStore.getState().setBillDiscount(roundAmt(subTotal * (next ? 5 : 0) / 100))
    posNotifySuccess(
      next ? `Privilege discount applied (+5%) for ${customer.customerName}` : 'Privilege discount removed',
      { title: 'Privilege', duration: 1500 },
    )
  }

  const handleCashInOutSave = async (entry) => {
    setCashEntries(prev => [...prev, {
      id: Date.now(),
      type: entry.transactionType === 'CASH_IN' ? 'IN' : 'OUT',
      amount: roundAmt(entry.amount),
      remarks: entry.remarks || '',
      createdAt: new Date(),
      counterCloseNo: null,
    }])
  }

  const handleDeliveryConfirm = (details) => {
    setDeliveryAddress(details.deliveryAddress)
    setShowDeliveryModal(false)
    if (deliverySavePending) {
      const deliveryNo = liteDeliverySeq++
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

  const handleReprint = (docType, docNo, meta = {}) => {
    const n = parseInt(docNo, 10)
    if (!Number.isFinite(n)) { posNotifyError('Enter a valid number', { title: 'Reprint' }); return false }

    if (docType === 'INVOICE') {
      const match = savedBills.find(b => parseInt(b.billNo.replace(/\D/g, ''), 10) === n)
      if (!match) { posNotifyError(`Bill ${docNo} not found`, { title: 'Reprint' }); return false }
      printReceipt({ ...match.receipt, counterNo: meta.counterNo || match.receipt.counterNo })
      posNotifySuccess(`Reprinting ${match.billNo}`, { title: 'Reprint', duration: 1000 })
      return true
    }

    if (docType === 'HOLD') {
      const match = heldBills.find(h => h.holdNo === n)
      if (!match) { posNotifyError(`Hold ${docNo} not found`, { title: 'Reprint' }); return false }
      printReceipt({
        shopName: 'MOIF POS', shopSubName: 'Lite Mode — Hold Slip',
        billNo: `HOLD-${match.holdNo}`, billDate: match.heldAt,
        cashierName: match.salesMan || 'Lite', counterNo: '1',
        customerName: match.customerName || '',
        items: match.cartItems.map(i => ({
          description: i.description, qty: i.qty, unitPrice: i.unitPrice, vatPer: i.vatPer, lineTotal: i.lineTotal,
        })),
        netAmount: match.amount, paidAmount: 0, balanceAmount: match.amount,
        paymentMode: match.paymentMode, currency: 'AED',
      })
      posNotifySuccess(`Reprinting HOLD-${match.holdNo}`, { title: 'Reprint', duration: 1000 })
      return true
    }

    const match = deliveries.find(d => d.deliveryNo === n)
    if (!match) { posNotifyError(`Delivery ${docNo} not found`, { title: 'Reprint' }); return false }
    printReceipt({
      shopName: 'MOIF POS', shopSubName: 'Lite Mode — Delivery Note',
      billNo: `DEL-${match.deliveryNo}`, billDate: new Date(),
      cashierName: 'Lite', counterNo: '1',
      customerName: match.customerName || '',
      items: match.cartItems.map(i => ({
        description: i.description, qty: i.qty, unitPrice: i.unitPrice, vatPer: i.vatPer, lineTotal: i.lineTotal,
      })),
      netAmount: match.amount, paidAmount: 0, balanceAmount: match.amount,
      paymentMode: 'CASH', currency: 'AED',
    })
    posNotifySuccess(`Reprinting DEL-${match.deliveryNo}`, { title: 'Reprint', duration: 1000 })
    return true
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
        netAmount: total,
        paidAmount: total,
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

      {showReportModal && (
        <ReportsModal
          onClose={() => setShowReportModal(false)}
          onSelect={(_key) => {}}
          counterSummaryFn={liteCounterSummaryFn}
          counterCloseFn={liteCounterCloseFn}
          staffReportFn={liteStaffReportFn}
          salesListFn={liteSalesListFn}
          billDetailFn={liteBillDetailFn}
          billPrintFn={liteBillPrintFn}
          customerSearchFn={liteCustomerSearchFn(200)}
          closeHistoryFn={liteCloseHistoryFn}
          closeDetailFn={liteCloseDetailFn}
          cashInOutReportFn={liteCashInOutReportFn}
        />
      )}

      {showRecall && (
        <LiteRecallModal
          heldBills={heldBills}
          onClose={() => setShowRecall(false)}
          onRecall={recallLiteHold}
          onCancelHold={cancelLiteHold}
        />
      )}

      {showReprint && (
        <LiteReprintModal
          onClose={() => setShowReprint(false)}
          onPrint={handleReprint}
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

      {showProductLookup && (
        <ProductLookupModal
          onClose={() => { setShowProductLookup(false); setLookupGroup(null) }}
          onSelect={addToCart}
          groupId={lookupGroup?.groupId ?? null}
          groupLabel={lookupGroup?.groupDescription ?? ''}
          searchFn={liteProductSearchFn}
        />
      )}

      {showGroupModal && (
        <GroupModal
          onClose={() => setShowGroupModal(false)}
          onSelect={(result) => { setShowGroupModal(false); handleGroupSelect(result) }}
        />
      )}

      {showPriceEnquiry && (
        <PriceEnquiryModal
          onClose={() => setShowPriceEnquiry(false)}
          searchFn={litePriceEnquiryFn}
        />
      )}

      {showPrivilegeModal && (
        <PrivilegeCustomerModal
          onClose={() => setShowPrivilegeModal(false)}
          onApply={handlePrivilegeApply}
          searchFn={liteCustomerSearchFn(100)}
        />
      )}

      {showCashInOut && (
        <CashInOutModal
          onClose={() => setShowCashInOut(false)}
          saveFn={handleCashInOutSave}
        />
      )}

      {showDeliveryModal && (
        <DeliveryCustomerModal
          onClose={() => setShowDeliveryModal(false)}
          onConfirm={handleDeliveryConfirm}
          title={deliverySavePending ? 'Save Delivery' : 'Delivery Details'}
          searchFn={liteCustomerSearchFn(80)}
        />
      )}

      {showReceiptModal && (
        <CreditSettlementModal
          onClose={() => setShowReceiptModal(false)}
          loadCustomersFn={liteCreditCustomersFn}
          loadBillsFn={liteOutstandingBillsFn}
          settleFn={liteSettleFn}
          historyFn={liteHistoryFn}
          receiptFn={liteReceiptFn}
          customerSearchFn={liteCustomerSearchFn(200)}
        />
      )}

      {showSettlementModal && (
        <DeliverySettlementModal
          onClose={() => setShowSettlementModal(false)}
          loadDeliveriesFn={liteLoadDeliveriesFn}
          settleFn={liteDeliverySettleFn}
          recallFn={liteDeliveryRecallFn}
        />
      )}

    </div>
  )
}
