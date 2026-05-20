import { create } from 'zustand'

export const usePosStore = create((set, get) => ({
  // Session
  cashier: null,
  counterNo: '',
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
  customerName: '',
  customerCode: '',
  osAmount: 0,

  // Input state
  inputMode: 'barcode', // 'barcode' | 'qty'
  qtyBuffer: '1',
  barcodeBuffer: '',

  // UI state
  activeFnTab: '0',

  setSession: (cashier, counterNo) => set({ cashier, counterNo }),
  setBillNo: (billNo) => set({ billNo }),
  setActiveFnTab: (tab) => set({ activeFnTab: tab }),

  setQtyBuffer: (val) => set({ qtyBuffer: val }),
  setBarcodeBuffer: (val) => set({ barcodeBuffer: val }),
  setInputMode: (mode) => set({ inputMode: mode }),

  addItem: (item) => {
    const items = get().cartItems
    const existing = items.find(i => i.barcode === item.barcode)
    let newItems
    if (existing) {
      newItems = items.map(i =>
        i.barcode === item.barcode
          ? { ...i, qty: i.qty + item.qty, lineTotal: (i.qty + item.qty) * i.unitPrice }
          : i
      )
    } else {
      const slNo = items.length + 1
      newItems = [...items, { ...item, slNo, lineTotal: item.qty * item.unitPrice }]
    }
    set({ cartItems: newItems, selectedRowKey: item.barcode })
    get().recalc(newItems)
  },

  removeItem: (barcode) => {
    const newItems = get().cartItems
      .filter(i => i.barcode !== barcode)
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
      qtyBuffer: '1', barcodeBuffer: '',
      customerName: '', customerCode: '', osAmount: 0,
    })
  },

  recalc: (items) => {
    const sub = items.reduce((s, i) => s + i.lineTotal, 0)
    const tax = items.reduce((s, i) => s + (i.vatAmt || 0), 0)
    const disc = 0
    const taxable = sub - disc
    const net = taxable + tax
    const round = Math.round(net) - net
    set({
      subTotal: sub,
      discountAmt: disc,
      taxableAmt: taxable,
      taxAmt: tax,
      netAmount: net + round,
      roundOff: round,
    })
  },

  setPayment: (paid) => {
    const net = get().netAmount
    set({ paidAmount: paid, balanceAmount: paid - net })
  },

  setCustomer: (name, code, os) => set({ customerName: name, customerCode: code, osAmount: os }),
  setPaymentMode: (mode) => set({ paymentMode: mode }),
}))
