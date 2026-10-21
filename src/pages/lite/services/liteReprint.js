// Reprint for LiteReprintModal — looks up invoices / holds / delivery notes in
// the Lite ledger and prints them.
import { printReceipt } from '../../../lib/printReceipt'
import { posNotifyError, posNotifySuccess } from '../../../lib/posNotify'
import { buildSlipItems } from '../liteHelpers'

/** Returns true when something was printed (the modal closes), false otherwise. */
export function liteReprint({ savedBills, heldBills, deliveries }, docType, docNo, meta = {}) {
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
      items: buildSlipItems(match.cartItems),
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
    items: buildSlipItems(match.cartItems),
    netAmount: match.amount, paidAmount: 0, balanceAmount: match.amount,
    paymentMode: 'CASH', currency: 'AED',
  })
  posNotifySuccess(`Reprinting DEL-${match.deliveryNo}`, { title: 'Reprint', duration: 1000 })
  return true
}
