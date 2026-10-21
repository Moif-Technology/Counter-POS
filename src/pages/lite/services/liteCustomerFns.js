// Customer search + Credit Settlement ("Receipt") for the shared modals, backed
// by the Lite ledger's customersList/osAmount instead of the server.
import { PM, normalizePaymentMode } from '../../../lib/paymentModes'
import { nextSeq, notFound, roundAmt } from '../liteHelpers'

/** liteCustomerSearchFn(ledger)(limit) → (q) => { customers } */
export const liteCustomerSearchFn = ({ customersList }) => (limit) => async (q) => {
  const term = String(q || '').trim().toLowerCase()
  const list = customersList.filter(c => !term
    || c.customerName.toLowerCase().includes(term)
    || c.customerCode.toLowerCase().includes(term)
    || (c.mobileNo || '').includes(term))
  return { customers: list.slice(0, limit) }
}

/** Props for <CreditSettlementModal> (everything except onClose). */
export function liteCreditSettlementFns(ledger) {
  const { customersList, setCustomersList, settlementHistory, setSettlementHistory } = ledger

  const loadCustomersFn = async (q) => {
    const term = String(q || '').trim().toLowerCase()
    const list = customersList.filter(c => normalizePaymentMode(c.paymentMode) === PM.CREDIT
      && (!term || c.customerName.toLowerCase().includes(term) || c.customerCode.toLowerCase().includes(term)))
    return { customers: list }
  }

  const loadBillsFn = async (customerId) => {
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

  const settleFn = async ({ customerId, amount, paymentMode, counterNo }) => {
    const c = customersList.find(x => x.customerId === customerId)
    const osBefore = roundAmt(c?.osAmount ?? 0)
    const osAfter = roundAmt(osBefore - amount)
    setCustomersList(prev => prev.map(x => x.customerId === customerId ? { ...x, osAmount: osAfter } : x))

    const transactionNo = nextSeq('settlement')
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

  const historyFn = async ({ customerId, dateFrom, dateTo, limit }) => {
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

  const receiptFn = async (transactionId) => {
    const h = settlementHistory.find(x => x.transactionId === transactionId)
    if (!h) throw notFound('Receipt not found')
    return h
  }

  return {
    loadCustomersFn, loadBillsFn, settleFn, historyFn, receiptFn,
    customerSearchFn: liteCustomerSearchFn(ledger)(200),
  }
}
