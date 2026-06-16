import { create } from 'zustand'
import { clearTokens, saveTokens } from '../lib/device'
import {
  fmtMoney,
  getCurrencyPrecision,
  setCurrencyPrecision as applyCurrencyPrecision,
  moneyInputRegex,
} from '../lib/currencyFormat'
import { getGvTax, netToGross } from '../lib/gvtax'
import { calcLineTotals, findCartItemByKey, getCartRowKey, sumBillTotals } from '../lib/cartLine'

export const usePosStore = create((set, get) => ({
  // Session
  cashier: null,      // { staffId, staffName, staffCode, role, roleName }
  counterNo: '',
  accessToken: null,
  refreshToken: null,
  companyId: null,
  branchId: null,
  currency: 'AED',
  /** Display decimals for amounts (default 2; future: load from parameter table). */
  currencyPrecision: 2,
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
  /**
   * For MULTI mode: array of { payMode: 'CASH'|'CARD'|'CREDIT', amount: number }.
   * For single modes it's null (API will auto-create a single split line).
   */
  paymentSplits: null,

  // Customer
  customerId:          null,
  customerName:        '',
  customerCode:        '',
  customerPaymentMode: 'CASH',
  osAmount:            0,

  // Input state
  inputMode: 'barcode', // 'barcode' | 'qty'
  returnMode: false,
  qtyBuffer: '1',
  barcodeBuffer: '',

  // Hold
  recalledHoldSalesId: null,

  /** Bill-level comment from Comments button (persists until Clear All / save). */
  billComment: '',

  // UI state
  activeFnTab: '0',
  /** Incremented to request barcode field focus (BarcodeInput listens). */
  barcodeFocusTick: 0,

  /** Focus barcode scan field on the main counter screen. */
  focusBarcodeScan: () => set(s => ({
    barcodeFocusTick: s.barcodeFocusTick + 1,
    inputMode: 'barcode',
  })),

  setSession: (cashier, counterNo, accessToken, refreshToken, companyId, branchId) => {
    saveTokens(accessToken, refreshToken)
    set({ cashier, counterNo, accessToken, refreshToken, companyId, branchId })
  },

  /** Apply currency_precision from parameter table when API provides it. */
  setCurrencyPrecision: (value) => {
    applyCurrencyPrecision(value)
    set({ currencyPrecision: getCurrencyPrecision() })
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
      paymentSplits: null,
      returnMode: false, qtyBuffer: '1', barcodeBuffer: '',
      customerId: null, customerName: '', customerCode: '',
      customerPaymentMode: 'CASH', osAmount: 0,
      billComment: '',
    })
  },

  setBillComment: (billComment) => set(state => ({
    billComment: typeof billComment === 'function' ? billComment(state.billComment) : billComment,
  })),

  setBillNo: (billNo) => set({ billNo }),
  setActiveFnTab: (tab) => set({ activeFnTab: tab }),

  setQtyBuffer: (val) => set({ qtyBuffer: val }),
  setBarcodeBuffer: (val) => set(state => ({
    barcodeBuffer: typeof val === 'function' ? val(state.barcodeBuffer) : val,
  })),
  setInputMode: (mode) => set({ inputMode: mode }),

  /** Pure numeric barcode value = cash received (CASH/CARD). Empty → paid = bill. */
  isCashTenderInput: (raw) => moneyInputRegex().test(String(raw || '').trim()),

  /** Default paid/balance while building a bill (no barcode tender applied yet). */
  resetBillPaymentDefaults: () => {
    const { netAmount, cartItems, paymentMode } = get()
    if (!cartItems.length) return
    if (paymentMode !== 'CASH' && paymentMode !== 'CARD') return
    set({ paidAmount: netAmount, balanceAmount: 0 })
  },

  /** First scan of a new bill — drop prior tender (e.g. cash 200 from last customer). */
  resetPaymentForNewBill: () => {
    const { paymentMode, netAmount } = get()
    if (paymentMode === 'CASH' || paymentMode === 'CARD') {
      set({ barcodeBuffer: '', paidAmount: netAmount, balanceAmount: 0 })
    } else {
      set({ barcodeBuffer: '', paidAmount: 0, balanceAmount: 0 })
    }
  },

  /** Apply barcode cash tender and validate only on Save / Bill & Print. */
  applyPaymentForSettlement: () => {
    const { barcodeBuffer, netAmount, cartItems, paymentMode } = get()
    if (!cartItems.length) return { ok: true }
    if (paymentMode !== 'CASH' && paymentMode !== 'CARD') return { ok: true }

    const trimmed = String(barcodeBuffer || '').trim()
    if (!trimmed) {
      set({ paidAmount: netAmount, balanceAmount: 0 })
      return { ok: true }
    }
    if (!get().isCashTenderInput(trimmed)) {
      set({ paidAmount: netAmount, balanceAmount: 0 })
      return { ok: true }
    }

    const paid = parseFloat(trimmed)
    if (!Number.isFinite(paid) || paid <= 0) {
      return { ok: false, error: 'Invalid paid amount' }
    }
    if (paid < netAmount) {
      return { ok: false, error: `Paid amount must be at least ${fmtMoney(netAmount)}` }
    }

    set({
      paidAmount: paid,
      balanceAmount: parseFloat((paid - netAmount).toFixed(3)),
    })
    return { ok: true }
  },

  /** Return context is only the Return toggle (allows mixed carts). */
  isReturnContext: () => get().returnMode,

  defaultQtyBuffer: () => {
    const { qtyBuffer } = get()
    if (!get().isReturnContext()) return '1'
    const q = parseFloat(qtyBuffer)
    if (Number.isFinite(q) && q < 0) return String(q)
    return '-1'
  },

  /** Clear barcode after a line scan; keep signed qty in return mode. */
  resetAfterLineScan: () => {
    set({
      barcodeBuffer: '',
      qtyBuffer: get().defaultQtyBuffer(),
      returnMode: get().returnMode,
    })
  },

  toggleReturn: () => {
    const returnMode = !get().returnMode
    const base = Math.abs(parseFloat(get().qtyBuffer) || 1)
    set({
      returnMode,
      qtyBuffer: returnMode ? String(-base) : String(base),
    })
  },

  /** Parse qty buffer; honour returnMode sign. */
  parseScanQty: (buf) => {
    const isReturn = get().isReturnContext()
    let q = parseFloat(buf)
    if (!Number.isFinite(q) || q === 0) q = isReturn ? -1 : 1
    if (isReturn && q > 0) q = -Math.abs(q)
    if (!isReturn && q < 0) q = Math.abs(q)
    return q
  },

  addItem: (item) => {
    const isNewBill = get().cartItems.length === 0
    const isReturn = get().isReturnContext()
    let qty = Number(item.qty)
    if (!Number.isFinite(qty) || qty === 0) qty = isReturn ? -1 : 1
    if (isReturn && qty > 0) qty = -Math.abs(qty)
    if (!isReturn && qty < 0) qty = Math.abs(qty)

    const unitPrice = Number(item.unitPrice) || 0
    const vatPer = Number(item.vatPer) || getGvTax()
    const unitPriceGross = Number(item.unitPriceGross) > 0
      ? Number(item.unitPriceGross)
      : netToGross(unitPrice, vatPer)

    const items = get().cartItems
    const slNo = items.length + 1
    const uniqueKey = `pid_${item.productId}_${Date.now()}`
    const lineBase = { ...item, qty, unitPrice, vatPer, unitPriceGross, slNo, _key: uniqueKey }
    const totals = calcLineTotals(lineBase)
    const newItems = [...items, { ...lineBase, ...totals }]
    set({
      cartItems: newItems,
      selectedRowKey: uniqueKey,
      returnMode: qty < 0 ? true : get().returnMode,
    })
    get().recalc(newItems)
    if (isNewBill) get().resetPaymentForNewBill()
  },

  addGroupItem: (group, unitPrice, qty) => {
    const isNewBill = get().cartItems.length === 0
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
    if (isNewBill) get().resetPaymentForNewBill()
  },

  pressSubTotal: () => {
    set({
      barcodeBuffer: '',
      qtyBuffer: get().defaultQtyBuffer(),
      inputMode: 'barcode',
    })
    get().focusBarcodeScan()
  },

  repeatLastItem: () => {
    const items = get().cartItems
    if (!items.length) return
    const last = items[items.length - 1]
    get().addItem(last)
  },

  /** Update one cart line by row key and recalc bill totals. */
  updateLine: (rowKey, patch) => {
    if (!rowKey) return
    const newItems = get().cartItems.map(i => {
      if (getCartRowKey(i) !== rowKey) return i
      const merged = { ...i, ...patch }
      const vatPer = Number(merged.vatPer) || getGvTax()
      if (patch.unitPriceGross == null && patch.unitPrice != null) {
        merged.unitPriceGross = netToGross(Number(merged.unitPrice) || 0, vatPer)
      } else if (patch.unitPriceGross != null && patch.unitPrice == null) {
        merged.unitPriceGross = Number(patch.unitPriceGross)
      }
      return { ...merged, ...calcLineTotals({ ...merged, vatPer }) }
    })
    set({ cartItems: newItems })
    get().recalc(newItems)
  },

  /** +/- qty on selected row — same line math as Qty Change modal. */
  adjustLineQty: (rowKey, delta) => {
    if (!rowKey) return
    const item = findCartItemByKey(get().cartItems, rowKey)
    if (!item) return
    const newQty = +(Number(item.qty) + delta).toFixed(3)
    const isReturnLine = Number(item.qty) < 0
    if (isReturnLine ? newQty >= 0 : newQty <= 0) {
      get().removeItem(rowKey)
      return
    }
    get().updateLine(rowKey, { qty: newQty })
  },

  findSelectedItem: () => findCartItemByKey(get().cartItems, get().selectedRowKey),

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
      // paidAmount / balanceAmount kept until next item scan (settlement display)
      returnMode: false, qtyBuffer: '1', barcodeBuffer: '',
      customerId: null, customerName: '', customerCode: '',
      customerPaymentMode: 'CASH', osAmount: 0,
      paymentMode: 'CASH',
      paymentSplits: null,
      billComment: '',
    })
  },

  recalc: (items) => {
    const { subTotal: sub, taxAmt: tax, discountAmt: disc, taxableAmt: taxable, gross } =
      sumBillTotals(items)

    // Round to nearest 0.25 — UP for sales, DOWN for returns (refunds)
    const STEP       = 0.25
    const grossInt   = Math.round(gross * 1000)
    const stepInt    = Math.round(STEP  * 1000)   // 250
    const roundedInt = grossInt >= 0
      ? Math.ceil(grossInt / stepInt) * stepInt
      : Math.floor(grossInt / stepInt) * stepInt
    const rounded    = roundedInt / 1000
    const round      = parseFloat((rounded - gross).toFixed(3))

    set({
      subTotal:    sub,
      discountAmt: disc,
      taxableAmt:  taxable,
      taxAmt:      tax,
      roundOff:    round,
      netAmount:   rounded,
    })
    get().resetBillPaymentDefaults()
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
  setPaymentSplits: (splits) => set({ paymentSplits: splits }),

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

    // Restore customer (matches CustomerSearch.handleSelect shape + resolveMode)
    const hasCustomer = holdMaster.customer_id != null && holdMaster.customer_name
    const custPayMode = String(holdMaster.customer_payment_mode || 'CASH').toUpperCase()
    const billPayMode = String(holdMaster.payment_mode || custPayMode || 'CASH').toUpperCase()
    const resolvePayMode = (m) => {
      const v = String(m || '').toUpperCase()
      if (v === 'CREDITCARD' || v === 'CARD') return 'CARD'
      if (v === 'CREDIT')                     return 'CREDIT'
      return 'CASH'
    }

    const hasReturnLines = cartItems.some(it => Number(it.qty) < 0)

    set({
      cartItems,
      returnMode: hasReturnLines,
      qtyBuffer: hasReturnLines ? '-1' : '1',
      selectedRowKey: null,
      recalledHoldSalesId: holdMaster.sales_id,
      customerId:          hasCustomer ? Number(holdMaster.customer_id)         : null,
      customerName:        hasCustomer ? (holdMaster.customer_name   ?? '')     : '',
      customerCode:        hasCustomer ? (holdMaster.customer_code   ?? '')     : '',
      customerPaymentMode: hasCustomer ? (custPayMode || 'CASH')                : 'CASH',
      osAmount:            hasCustomer ? Number(holdMaster.credit_balance ?? 0) : 0,
      paymentMode:         resolvePayMode(billPayMode),
      paymentSplits:       null,
      billComment:         String(holdMaster.remarks ?? '').trim(),
    })
    get().recalc(cartItems)
  },
}))
