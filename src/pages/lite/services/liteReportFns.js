// Reports & Operations for the shared ReportsModal. Counter Reading / Staff Wise /
// Group Wise / Sales Viewer / Counter Close Viewer / Cash In-Out Viewer are all
// backed by the Lite ledger's savedBills / cashEntries / counterCloses instead
// of the server.
import { printReceipt } from '../../../lib/printReceipt'
import { nextSeq, notFound, roundAmt } from '../liteHelpers'
import { liteCustomerSearchFn } from './liteCustomerFns'

const DAY_MS = 86400000

/** Props for <ReportsModal> (everything except onClose / onSelect). */
export function liteReportFns(ledger) {
  const {
    savedBills, setSavedBills, cashEntries, setCashEntries,
    counterCloses, setCounterCloses, settlementHistory,
  } = ledger

  const pendingBills = () => savedBills.filter(b => b.counterCloseNo == null)
  const pendingCash = () => cashEntries.filter(e => e.counterCloseNo == null)

  const buildCounterSummary = () => {
    const bills = pendingBills()
    const cash = pendingCash()
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

  const counterSummaryFn = async () => buildCounterSummary()

  const counterCloseFn = async ({ counterNo, reportType, collectedCash }) => {
    const summary = buildCounterSummary()
    const cashDifference = roundAmt(collectedCash - summary.cashToBeCollected)

    if (reportType !== 'Z') {
      return { closeId: null, closeNo: null, billsClosed: summary.billCount, ...summary, collectedCash, cashDifference }
    }

    const closeId = nextSeq('close')
    const closeNo = `LITE-Z-${String(closeId).padStart(3, '0')}`
    const closeDate = new Date()
    setSavedBills(prev => prev.map(b => b.counterCloseNo == null ? { ...b, counterCloseNo: closeNo } : b))
    setCashEntries(prev => prev.map(e => e.counterCloseNo == null ? { ...e, counterCloseNo: closeNo } : e))
    setCounterCloses(prev => [...prev, {
      closeId, closeNo, closeDate, reportType: 'Z', counterNo, collectedCash, cashDifference, ...summary,
    }])
    return { closeId, closeNo, billsClosed: summary.billCount, ...summary, collectedCash, cashDifference }
  }

  const staffReportFn = async () => {
    const bills = pendingBills()
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

  const groupReportFn = async () => {
    const bills = pendingBills()
    const byGroup = new Map()

    for (const b of bills) {
      for (const item of b.receipt.items ?? []) {
        const groupName = item.groupName ?? item.categoryName ?? 'Unassigned'
        const key = item.groupId ?? groupName
        const row = byGroup.get(key) ?? {
          groupId: key,
          groupName,
          qtySold: 0,
          grossAmount: 0,
          totalDiscount: 0,
          netAmount: 0,
        }
        row.qtySold += Number(item.qty) || 0
        row.grossAmount += Number(item.subTotal ?? item.lineTotal) || 0
        row.totalDiscount += Number(item.discount) || 0
        row.netAmount += Number(item.lineTotal) || 0
        byGroup.set(key, row)
      }
    }

    return Array.from(byGroup.values()).map(r => ({
      ...r,
      grossAmount: roundAmt(r.grossAmount),
      totalDiscount: roundAmt(r.totalDiscount),
      netAmount: roundAmt(r.netAmount),
    }))
  }

  const salesListFn = async ({ dateFrom, dateTo, customerId }) => {
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(new Date(dateTo).getTime() + DAY_MS) : null
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

  const billDetailFn = async (salesId) => {
    const b = savedBills.find(x => x.billNo === salesId)
    if (!b) throw notFound('Bill not found')
    const r = b.receipt
    return {
      billNoDisplay: b.billNo, billDate: b.billDate, paymentMode: r.paymentMode,
      customer: { customerName: r.customerName || 'Walk-in' }, staffName: r.cashierName,
      counterNo: r.counterNo, counterCloseNo: b.counterCloseNo ?? 'PENDING', remarks: r.remarks,
      items: r.items, amount: r.netAmount, subTotal: r.subTotal, discountAmt: r.discountAmt,
      taxableAmt: r.taxableAmt, taxAmt: r.taxAmt, roundOff: r.roundOff, paymentSplits: null,
    }
  }

  const billPrintFn = async (salesId) => {
    const b = savedBills.find(x => x.billNo === salesId)
    if (!b) throw notFound('Bill not found')
    printReceipt(b.receipt)
  }

  const closeHistoryFn = async ({ dateFrom, dateTo, limit }) => {
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(new Date(dateTo).getTime() + DAY_MS) : null
    const list = counterCloses
      .filter(c => !from || c.closeDate >= from)
      .filter(c => !to || c.closeDate <= to)
      .sort((a, b) => b.closeDate - a.closeDate)
      .slice(0, limit || 150)
    return { closes: list }
  }

  const closeDetailFn = async (closeId) => {
    const c = counterCloses.find(x => x.closeId === closeId)
    if (!c) throw notFound('Close not found')
    return c
  }

  const cashInOutReportFn = async ({ dateFrom, dateTo, closeNo, limit }) => {
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(new Date(dateTo).getTime() + DAY_MS) : null
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

  return {
    counterSummaryFn, counterCloseFn, staffReportFn, groupReportFn,
    salesListFn, billDetailFn, billPrintFn,
    customerSearchFn: liteCustomerSearchFn(ledger)(200),
    closeHistoryFn, closeDetailFn, cashInOutReportFn,
  }
}
