import { create } from 'zustand'
import { clearTokens, saveTokens } from '../lib/device'

export const usePosStore = create((set, get) => ({
  // Session
  cashier: null,      // { staffId, staffName, staffCode, role, roleName }
  counterNo: '',
  accessToken: null,
  refreshToken: null,
  companyId: null,
  branchId: null,
  currency: 'AED',
  shopName: 'MOIF TECHNOLOGY',
  shopSubName: 'Point of Sale',

  // Bill
  billNo: '',
  billDate: new Date(),
  cartItems: [],
  selectedRowKey: null,

  // Totals
  subTotal: 0,
  discountAmt: 0,
  taxableAmt: 0,
  taxAmt: 0,
  roundOff: 0,
  netAmount: 0,
  voucherAmt: 0,

  // Payment
  paidAmount: 0,
  balanceAmount: 0,
  paymentMode: 'CASH',

  // Customer
  customerId:          null,
  customerName:        '',
  customerCode:        '',
  customerPaymentMode: 'CASH',
  osAmount:            0,

  // Input state
  inputMode: 'barcode', // 'barcode' | 'qty'
  qtyBuffer: '0',
  barcodeBuffer: '',

  // Hold
  recalledHoldSalesId: null,

  // UI state
  activeFnTab: '0',

  setSession: (cashier, counterNo, accessToken, refreshToken, companyId, branchId) => {
    saveTokens(accessToken, refreshToken)
    set({ cashier, counterNo, accessToken, refreshToken, companyId, branchId })
  },

  logout: () => {
    clearTokens()
    set({
      cashier: null, counterNo: '', accessToken: null, refreshToken: null,
      companyId: null, branchId: null,
      cartItems: [], selectedRowKey: null,
      subTotal: 0, discountAmt: 0, taxableAmt: 0,
      taxAmt: 0, roundOff: 0, netAmount: 0,
      paidAmount: 0, balanceAmount: 0,
      qtyBuffer: '1', barcodeBuffer: '',
      customerId: null, customerName: '', customerCode: '',
      customerPaymentMode: 'CASH', osAmount: 0,
    })
  },

  setBillNo: (billNo) => set({ billNo }),
  setActiveFnTab: (tab) => set({ activeFnTab: tab }),

  setQtyBuffer: (val) => set({ qtyBuffer: val }),
  setBarcodeBuffer: (val) => set({ barcodeBuffer: val }),
  setInputMode: (mode) => set({ inputMode: mode }),

  toggleReturn: () => {
    const curr = parseFloat(get().qtyBuffer)
    const base = (!curr || isNaN(curr)) ? 1 : Math.abs(curr)
    const isReturn = curr < 0
    set({ qtyBuffer: isReturn ? String(base) : String(-base) })
  },

  addItem: (item) => {
    const items = get().cartItems
    const slNo = items.length + 1
    const uniqueKey = `pid_${item.productId}_${Date.now()}`
    const newItems = [...items, { ...item, slNo, lineTotal: item.qty * item.unitPrice, _key: uniqueKey }]
    set({ cartItems: newItems, selectedRowKey: uniqueKey })
    get().recalc(newItems)
  },

  addGroupItem: (group, unitPrice, qty) => {
    const items = get().cartItems
    const slNo  = items.length + 1
    const safeQty   = Number(qty) > 0 ? Number(qty) : 1
    const safePrice = Number(unitPrice) || 0
    const vatPer    = 0
    const lineTotal = safeQty * safePrice
    const uniqueKey = `GRP_${group.groupId}_${Date.now()}`
    const newItem = {
      slNo,
      barcode:     uniqueKey,
      productId:   null,
      productCode: null,
      description: group.groupDescription,
      qty:         safeQty,
      unitPrice:   safePrice,
      discount:    0,
      vatPer,
      vatAmt:      0,
      lineTotal,
      groupId:     group.groupId,
    }
    const newItems = [...items, newItem]
    set({ cartItems: newItems, selectedRowKey: `bc_${uniqueKey}` })
    get().recalc(newItems)
  },

  pressSubTotal: () => {
    set({ barcodeBuffer: '', qtyBuffer: '1', inputMode: 'barcode' })
  },

  repeatLastItem: () => {
    const items = get().cartItems
    if (!items.length) return
    const last = items[items.length - 1]
    const uniqueKey = `pid_${last.productId ?? 'grp'}_${Date.now()}`
    const newItem = { ...last, slNo: items.length + 1, _key: uniqueKey }
    const newItems = [...items, newItem]
    set({ cartItems: newItems, selectedRowKey: uniqueKey })
    get().recalc(newItems)
  },

  removeItem: (key) => {
    const newItems = get().cartItems
      .filter(i => (i._key ?? (i.productId != null ? `pid_${i.productId}` : `bc_${i.barcode}`)) !== key)
      .map((i, idx) => ({ ...i, slNo: idx + 1 }))
    set({ cartItems: newItems, selectedRowKey: null })
    get().recalc(newItems)
  },

  clearAll: () => {
    set({
      cartItems: [], selectedRowKey: null,
      subTotal: 0, discountAmt: 0, taxableAmt: 0,
      taxAmt: 0, roundOff: 0, netAmount: 0,
      paidAmount: 0, balanceAmount: 0,
      qtyBuffer: '0', barcodeBuffer: '',
      customerName: '', customerCode: '', osAmount: 0,
    })
  },

  recalc: (items) => {
    const sub     = items.reduce((s, i) => s + i.lineTotal, 0)
    const tax     = items.reduce((s, i) => s + (i.vatAmt || 0), 0)
    const disc    = 0
    const taxable = sub - disc
    const gross   = taxable + tax

    // Round UP to nearest 0.25 — matches VB RoundFig = 0.25
    // Use integer math to avoid floating-point drift (work in 0.001 units)
    const STEP       = 0.25
    const grossInt   = Math.round(gross * 1000)
    const stepInt    = Math.round(STEP  * 1000)   // 250
    const roundedInt = Math.ceil(grossInt / stepInt) * stepInt
    const rounded    = roundedInt / 1000
    const round      = parseFloat((rounded - gross).toFixed(3))   // always >= 0

    set({
      subTotal:    sub,
      discountAmt: disc,
      taxableAmt:  taxable,
      taxAmt:      tax,
      roundOff:    round,
      netAmount:   rounded,
    })
  },

  setPayment: (paid) => {
    const net = get().netAmount
    set({ paidAmount: paid, balanceAmount: paid - net })
  },

  setCustomer: (id, name, code, paymentMode, os) => set({
    customerId: id, customerName: name, customerCode: code,
    customerPaymentMode: paymentMode ?? 'CASH', osAmount: os ?? 0,
  }),
  clearCustomer: () => set({
    customerId: null, customerName: '', customerCode: '',
    customerPaymentMode: 'CASH', osAmount: 0,
  }),
  setPaymentMode: (mode) => set({ paymentMode: mode }),

  /** Load recalled hold items back into cart */
  recallHold: (holdMaster, items) => {
    const cartItems = items.map((it, idx) => ({
      slNo:        idx + 1,
      barcode:     it.product_code ?? String(it.product_id),
      productId:   it.product_id,
      productCode: it.product_code,
      description: it.short_description,
      qty:         Number(it.qty),
      unitPrice:   Number(it.unit_price),
      discount:    Number(it.discount_amount ?? 0),
      vatPer:      Number(it.tax_1_rate ?? 0),
      vatAmt:      Number(it.tax_1_amount ?? 0),
      lineTotal:   Number(it.line_total),
    }))
    set({
      cartItems,
      selectedRowKey: null,
      recalledHoldSalesId: holdMaster.sales_id,
      customerId: holdMaster.customer_id ?? null,
    })
    get().recalc(cartItems)
  },
}))
