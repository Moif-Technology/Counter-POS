import { create } from 'zustand'
import { clearTokens, saveTokens } from '../lib/device'
import {
  fmtMoney,
  getCurrencyPrecision,
  setCurrencyPrecision as applyCurrencyPrecision,
  moneyInputRegex,
  roundMoney,
} from '../lib/currencyFormat'
import { getGvTax, netToGross } from '../lib/gvtax'
import { isAutoRoundOffEnabled } from '../lib/posSettings'
import { calcLineTotals, findCartItemByKey, getCartRowKey, normalizeCartLine, sumBillTotals } from '../lib/cartLine'
import { api } from '../lib/api'
import { PM, normalizePaymentMode, isCashTenderMode, isMultiPaymentMode } from '../lib/paymentModes'
import { parseDeliveryRemarks } from '../lib/deliveryBarcode'
import { recallDeliveryToCounter } from '../lib/recallDeliveryToCounter'

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
  companyPhone: '',
  companyAddress: '',
  companyTrn: '',

  // Bill
  billNo: '',
  billDate: new Date(),
  cartItems: [],
  selectedRowKey: null,

  // Totals
  subTotal: 0,
  /** Sum of line-level discounts from cart rows. */
  lineDiscountAmt: 0,
  /** Extra bill-level discount (main screen Discount button). */
  billDiscountAmt: 0,
  discountAmt: 0,
  taxableAmt: 0,
  taxAmt: 0,
  roundOff: 0,
  netAmount: 0,
  voucherAmt: 0,

  // Payment
  paidAmount: 0,
  balanceAmount: 0,
  paymentMode: PM.CASH,
  /**
   * For MULTIPAYMENT mode: array of { payMode, amount, tip?, refNo? }.
   * Only MULTIPAYMENT bills persist rows to sales_payment_split on the server.
   */
  paymentSplits: null,
  multiPayModalOpen: false,

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

  /** Pending delivery bill recalled for edit */
  recalledDeliverySalesId: null,
  deliveryTime: null,
  deliveryAddress: '',
  deliveryPhone: '',

  /** Bill-level comment from Comments button (persists until Clear All / save). */
  billComment: '',

  /** Barcode scan error banner (cleared on successful scan or Clear All). */
  scanError: null,

  // UI state
  activeFnTab: '0',
  /** Incremented to request barcode field focus (BarcodeInput listens). */
  barcodeFocusTick: 0,

  /** Product groups from biz.group_master (group panel + Group modal). */
  productGroups: [],
  groupsLoading: false,
  groupsError: null,

  /** Focus barcode scan field on the main counter screen. */
  focusBarcodeScan: () => set(s => ({
    barcodeFocusTick: s.barcodeFocusTick + 1,
    inputMode: 'barcode',
  })),

  setSession: (cashier, counterNo, accessToken, refreshToken, companyId, branchId) => {
    saveTokens(accessToken, refreshToken)
    set({ cashier, counterNo, accessToken, refreshToken, companyId, branchId })
    get().fetchProductGroups()
  },

  /** Company receipt header from DB (company_master / branch_master / TRN). */
  setReceiptHeader: (header) => {
    if (!header) return
    set({
      shopName: header.companyName?.trim() || get().shopName,
      shopSubName: header.branchName?.trim() || get().shopSubName,
      companyPhone: header.companyPhone?.trim() || '',
      companyAddress: header.companyAddress?.trim() || '',
      companyTrn: header.taxRegistrationNo?.trim() || '',
    })
  },

  fetchProductGroups: async () => {
    const { accessToken } = get()
    if (!accessToken) return
    set({ groupsLoading: true, groupsError: null })
    try {
      const { groups } = await api.counterPos.groupsList(accessToken)
      set({ productGroups: groups ?? [], groupsLoading: false })
    } catch (e) {
      set({
        groupsLoading: false,
        groupsError: e.message ?? 'Failed to load groups',
        productGroups: [],
      })
    }
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
      subTotal: 0, lineDiscountAmt: 0, billDiscountAmt: 0, discountAmt: 0, taxableAmt: 0,
      taxAmt: 0, roundOff: 0, netAmount: 0,
      paidAmount: 0, balanceAmount: 0,
      paymentSplits: null,
      returnMode: false, qtyBuffer: '1', barcodeBuffer: '',
      customerId: null, customerName: '', customerCode: '',
      customerPaymentMode: 'CASH', osAmount: 0,
      billComment: '',
      scanError: null,
      recalledHoldSalesId: null,
      recalledDeliverySalesId: null,
      deliveryTime: null,
      deliveryAddress: '',
      deliveryPhone: '',
      productGroups: [], groupsLoading: false, groupsError: null,
    })
  },

  setBillComment: (billComment) => set(state => ({
    billComment: typeof billComment === 'function' ? billComment(state.billComment) : billComment,
  })),

  setScanError: (scanError) => set({ scanError: scanError ?? null }),

  setDeliveryInfo: (info) => set({
    customerId: info.customerId ?? null,
    customerName: info.customerName ?? '',
    customerCode: info.customerCode ?? '',
    deliveryPhone: info.deliveryPhone ?? info.mobileNo ?? '',
    deliveryAddress: info.deliveryAddress ?? '',
    deliveryTime: info.deliveryTime ?? null,
  }),

  setBillNo: (billNo) => set({ billNo }),
  setActiveFnTab: (tab) => set({ activeFnTab: tab }),

  setQtyBuffer: (val) => set({ qtyBuffer: val }),
  setBarcodeBuffer: (val) => set(state => ({
    barcodeBuffer: typeof val === 'function' ? val(state.barcodeBuffer) : val,
  })),
  setInputMode: (mode) => set({ inputMode: mode }),

  /** Pure numeric barcode value = cash received (CASH/CREDITCARD). Empty → paid = bill. */
  isCashTenderInput: (raw) => moneyInputRegex().test(String(raw || '').trim()),

  /** Default paid/balance while building a bill (no barcode tender applied yet). */
  resetBillPaymentDefaults: () => {
    const { netAmount, cartItems, paymentMode } = get()
    if (!cartItems.length) return
    if (!isCashTenderMode(paymentMode)) return
    set({ paidAmount: netAmount, balanceAmount: 0 })
  },

  /** First scan of a new bill — drop prior tender (e.g. cash 200 from last customer). */
  resetPaymentForNewBill: () => {
    const { paymentMode, netAmount } = get()
    if (isCashTenderMode(paymentMode)) {
      set({ barcodeBuffer: '', paidAmount: netAmount, balanceAmount: 0 })
    } else {
      set({ barcodeBuffer: '', paidAmount: 0, balanceAmount: 0 })
    }
  },

  /** Apply barcode cash tender and validate only on Save / Bill & Print. */
  applyPaymentForSettlement: () => {
    const { barcodeBuffer, netAmount, cartItems, paymentMode, paymentSplits } = get()
    if (!cartItems.length) return { ok: true }

    if (isMultiPaymentMode(paymentMode)) {
      if (!paymentSplits?.length) {
        return { ok: false, error: 'Add split payment rows first (MULTIPAYMENT).' }
      }
      const billTotal = paymentSplits.reduce((a, s) => a + (Number(s.amount) || 0), 0)
      if (Math.abs(billTotal - netAmount) > 0.02) {
        return { ok: false, error: `Split total must match bill amount (${fmtMoney(netAmount)}).` }
      }
      set({ paidAmount: netAmount, balanceAmount: 0 })
      return { ok: true }
    }

    if (!isCashTenderMode(paymentMode)) return { ok: true }

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
      balanceAmount: roundMoney(paid - netAmount),
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
    const newItems = [...items, normalizeCartLine(lineBase)]
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
    const slNo = items.length + 1
    const safeQty = Number(qty) > 0 ? Number(qty) : 1
    const unitPriceGross = roundMoney(Number(unitPrice) || 0)
    const vatPer = getGvTax()
    const uniqueKey = `GRP_${group.groupId}_${Date.now()}`
    const lineBase = {
      slNo,
      barcode: uniqueKey,
      productId: null,
      productCode: group.groupCode ?? null,
      description: group.groupDescription,
      descriptionArabic: group.groupDescriptionArabic ?? null,
      qty: safeQty,
      unitPriceGross,
      priceIsGross: true,
      discount: 0,
      vatPer,
      groupId: group.groupId,
      groupCode: group.groupCode ?? null,
      _key: uniqueKey,
    }
    const newItem = normalizeCartLine(lineBase)
    const newItems = [...items, newItem]
    set({ cartItems: newItems, selectedRowKey: uniqueKey })
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
      if (merged.priceIsGross || merged.groupId != null) {
        if (patch.unitPriceGross != null) {
          merged.unitPriceGross = roundMoney(Number(patch.unitPriceGross))
        } else if (patch.unitPrice != null && patch.unitPriceGross == null) {
          merged.unitPriceGross = roundMoney(Number(patch.unitPrice))
        }
      } else {
        const vatPer = Number(merged.vatPer) || getGvTax()
        if (patch.unitPriceGross == null && patch.unitPrice != null) {
          merged.unitPriceGross = netToGross(Number(merged.unitPrice) || 0, vatPer)
        } else if (patch.unitPriceGross != null && patch.unitPrice == null) {
          merged.unitPriceGross = Number(patch.unitPriceGross)
        }
      }
      return normalizeCartLine(merged)
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
      subTotal: 0, lineDiscountAmt: 0, billDiscountAmt: 0, discountAmt: 0, taxableAmt: 0,
      taxAmt: 0,
      // netAmount, roundOff, paidAmount, balanceAmount kept until first scan on next bill
      returnMode: false, qtyBuffer: '1', barcodeBuffer: '',
      customerId: null, customerName: '', customerCode: '',
      customerPaymentMode: 'CASH', osAmount: 0,
      paymentMode: PM.CASH,
      paymentSplits: null,
      multiPayModalOpen: false,
      billComment: '',
      scanError: null,
      recalledHoldSalesId: null,
      recalledDeliverySalesId: null,
      deliveryTime: null,
      deliveryAddress: '',
      deliveryPhone: '',
    })
  },

  /** Open split-payment modal only when the cart has lines. */
  openMultiPayModal: () => {
    if (!get().cartItems.length) return false
    set({ multiPayModalOpen: true })
    return true
  },

  recalc: (items) => {
    const source = items ?? get().cartItems
    const normalized = source.map(normalizeCartLine)
    const { subTotal: sub, taxAmt: tax, discountAmt: lineDisc } = sumBillTotals(normalized)

    const billDisc = roundMoney(Number(get().billDiscountAmt) || 0)
    const taxableAfterBillDisc = roundMoney(sub - billDisc)
    const ratio = sub !== 0 ? taxableAfterBillDisc / sub : 1
    const taxAfter = roundMoney(tax * ratio)
    const grossAfterBillDisc = roundMoney(taxableAfterBillDisc + taxAfter)

    let rounded
    let round
    if (isAutoRoundOffEnabled()) {
      // Round to nearest 0.25 — UP for sales, DOWN for returns (refunds)
      const STEP = 0.25
      const grossInt = Math.round(grossAfterBillDisc * 1000)
      const stepInt = Math.round(STEP * 1000)
      const roundedInt = grossInt >= 0
        ? Math.ceil(grossInt / stepInt) * stepInt
        : Math.floor(grossInt / stepInt) * stepInt
      rounded = roundedInt / 1000
      round = roundMoney(rounded - grossAfterBillDisc)
    } else {
      rounded = grossAfterBillDisc
      round = 0
    }

    set({
      cartItems:       normalized,
      subTotal:        sub,
      lineDiscountAmt: lineDisc,
      discountAmt:     roundMoney(lineDisc + billDisc),
      taxableAmt:      taxableAfterBillDisc,
      taxAmt:          taxAfter,
      roundOff:        round,
      netAmount:       rounded,
    })
    get().resetBillPaymentDefaults()
  },

  setBillDiscount: (amount) => {
    const n = roundMoney(Number(amount) || 0)
    set({ billDiscountAmt: n >= 0 ? n : 0 })
    get().recalc(get().cartItems)
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
  setMultiPayModalOpen: (open) => set({ multiPayModalOpen: open }),

  /** Fetch and load a held bill by hold number (barcode scan or recall UI). */
  recallHoldByNo: async (holdNo) => {
    const { accessToken, recallHold } = get()
    const holds = await api.counterPos.getHeldBills(accessToken)
    const list = Array.isArray(holds) ? holds : []
    const hold = list.find(h => String(h.hold_no) === String(holdNo))
    if (!hold) {
      const err = new Error(`Hold ${holdNo} not found`)
      err.status = 404
      throw err
    }
    const items = await api.counterPos.recallBill(hold.sales_id, accessToken)
    recallHold(hold, Array.isArray(items) ? items : [])
    return hold
  },

  /** Load recalled hold items back into cart */
  recallHold: (holdMaster, items) => {
    const cartItems = items.map((it, idx) => {
      const groupId = it.group_id != null && Number(it.group_id) > 0
        ? Number(it.group_id)
        : null
      const productId = it.product_id != null && Number(it.product_id) > 0
        ? Number(it.product_id)
        : null
      const rowKey = groupId && !productId
        ? `GRP_${groupId}_${it.sales_child_id ?? idx}`
        : (productId != null ? `pid_${productId}_${idx}` : `bc_${it.product_code ?? idx}`)
      return {
        slNo:        idx + 1,
        barcode:     groupId && !productId ? rowKey : (it.product_code ?? String(it.product_id)),
        productId,
        productCode: it.product_code,
        description: it.short_description,
        descriptionArabic: it.description_arabic ?? null,
        qty:         Number(it.qty),
        unitPrice:   Number(it.unit_price),
        discount:    Number(it.discount_amount ?? 0),
        vatPer:      Number(it.tax_1_rate ?? 0),
        vatAmt:      Number(it.tax_1_amount ?? 0),
        lineTotal:   Number(it.line_total),
        groupId,
        priceIsGross: !!(groupId && !productId),
        _key: rowKey,
      }
    })

    // Restore customer (matches CustomerSearch.handleSelect shape + resolveMode)
    const hasCustomer = holdMaster.customer_id != null && holdMaster.customer_name
    const custPayMode = String(holdMaster.customer_payment_mode || 'CASH').toUpperCase()
    const billPayMode = String(holdMaster.payment_mode || custPayMode || 'CASH').toUpperCase()
    const resolvePayMode = (m) => normalizePaymentMode(m)

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

  /** Fetch and load a pending delivery onto the counter by delivery number. */
  recallDeliveryByNo: async (deliveryNo) => {
    const state = get()
    return recallDeliveryToCounter(deliveryNo, {
      accessToken: state.accessToken,
      recallDelivery: state.recallDelivery,
    })
  },

  /** Load recalled delivery items back into cart */
  recallDelivery: (deliveryMaster, items) => {
    const cartItems = items.map((it, idx) => {
      const groupId = it.group_id != null && Number(it.group_id) > 0
        ? Number(it.group_id)
        : null
      const productId = it.product_id != null && Number(it.product_id) > 0
        ? Number(it.product_id)
        : null
      const rowKey = groupId && !productId
        ? `GRP_${groupId}_${it.sales_child_id ?? idx}`
        : (productId != null ? `pid_${productId}_${idx}` : `bc_${it.product_code ?? idx}`)
      return {
        slNo:        idx + 1,
        barcode:     groupId && !productId ? rowKey : (it.product_code ?? String(it.product_id)),
        productId,
        productCode: it.product_code,
        description: it.short_description,
        descriptionArabic: it.description_arabic ?? null,
        qty:         Number(it.qty),
        unitPrice:   Number(it.unit_price),
        discount:    Number(it.discount_amount ?? 0),
        vatPer:      Number(it.tax_1_rate ?? 0),
        vatAmt:      Number(it.tax_1_amount ?? 0),
        lineTotal:   Number(it.line_total),
        groupId,
        priceIsGross: !!(groupId && !productId),
        _key: rowKey,
      }
    })

    const parsed = parseDeliveryRemarks(deliveryMaster.remarks)
    const hasCustomer = deliveryMaster.customer_id != null && deliveryMaster.customer_name
    const custPayMode = String(deliveryMaster.customer_payment_mode || 'CASH').toUpperCase()

    set({
      cartItems,
      returnMode: false,
      qtyBuffer: '1',
      selectedRowKey: null,
      recalledHoldSalesId: null,
      recalledDeliverySalesId: deliveryMaster.sales_id,
      customerId:          hasCustomer ? Number(deliveryMaster.customer_id) : null,
      customerName:        hasCustomer ? (deliveryMaster.customer_name ?? '') : '',
      customerCode:        hasCustomer ? (deliveryMaster.customer_code ?? '') : '',
      customerPaymentMode: hasCustomer ? (custPayMode || 'CASH') : 'CASH',
      osAmount:            hasCustomer ? Number(deliveryMaster.credit_balance ?? 0) : 0,
      paymentMode:         PM.CASH,
      paymentSplits:       null,
      billComment:         parsed.billComment,
      deliveryTime:        deliveryMaster.delivery_time ?? null,
      deliveryAddress:     parsed.deliveryAddress,
      deliveryPhone:       parsed.deliveryPhone || deliveryMaster.mobile_no || '',
    })
    get().recalc(cartItems)
  },
}))
