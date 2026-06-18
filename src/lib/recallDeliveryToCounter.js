import { api } from './api'

/**
 * Load a pending delivery onto the counter cart by delivery number.
 * @param {number|string} deliveryNo
 * @param {{ accessToken: string, recallDelivery: Function }} store
 */
export async function recallDeliveryToCounter(deliveryNo, { accessToken, recallDelivery }) {
  const list = await api.counterPos.getDeliveryBills(accessToken)
  const deliveries = Array.isArray(list) ? list : []
  const delivery = deliveries.find(d => String(d.hold_no) === String(deliveryNo))
  if (!delivery) {
    const err = new Error(`Delivery ${deliveryNo} not found`)
    err.status = 404
    throw err
  }
  const items = await api.counterPos.recallDelivery(delivery.sales_id, accessToken)
  recallDelivery(delivery, Array.isArray(items) ? items : [])
  return delivery
}
