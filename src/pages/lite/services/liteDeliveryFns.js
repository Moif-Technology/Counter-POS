// Delivery Settlement ("Settlement" — post invoice after payment) for the shared
// DeliverySettlementModal, backed by the Lite ledger's deliveries.
import { buildLiteReceiptItems, notFound, roundAmt } from '../liteHelpers'

/**
 * Props for <DeliverySettlementModal> (everything except onClose).
 * @param ledger   useLiteLedger()
 * @param salesMan current sales man name, printed as cashier on settled invoices
 * @param onRecall (delivery) => void — load a recalled delivery back into the bill
 */
export function liteDeliverySettlementFns(ledger, { salesMan, onRecall }) {
  const { deliveries, setDeliveries, setSavedBills } = ledger

  const loadDeliveriesFn = async () => deliveries.map(d => ({
    sales_id: d.id, hold_no: d.deliveryNo,
    customer_name: d.customerName || null, customer_code: '',
    delivery_time: null, remarks: d.address, amount: d.amount,
  }))

  const settleFn = async ({ items }) => {
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

  const recallFn = async (deliveryNo) => {
    const d = deliveries.find(x => String(x.deliveryNo) === String(deliveryNo))
    if (!d) throw notFound(`Delivery ${deliveryNo} not found`)
    onRecall(d)
    setDeliveries(prev => prev.filter(x => x.id !== d.id))
  }

  return { loadDeliveriesFn, settleFn, recallFn }
}
