import {
  offlineScope, newClientUuid, findCachedCustomer, listLocalHolds, saveLocalHolds, isLocalHoldId,
} from './offlineCache'

/**
 * Holds parked while the server is unreachable. Kept on this device in the same row /
 * item shape as GET /sales/held so the recall / clear / print screens need no changes.
 * ponytail: they never upload — a local hold is a parked cart, recalled on this till only.
 */

const HOLD_SEQ_KEY = 'moif_pos_local_hold_seq'

const list = () => { const { companyId, stationId } = offlineScope(); return listLocalHolds(companyId, stationId) }
const save = (holds) => { const { companyId, stationId } = offlineScope(); return saveLocalHolds(companyId, stationId, holds) }

function nextHoldNo() {
  let n = 0
  try { n = Number(localStorage.getItem(HOLD_SEQ_KEY)) || 0 } catch { /* storage blocked */ }
  n += 1
  try { localStorage.setItem(HOLD_SEQ_KEY, String(n)) } catch { /* storage blocked */ }
  return `OFF${n}`
}

/** POST /sales/hold equivalent. */
export async function holdLocally(body) {
  const { staffId, staffName } = offlineScope()
  const c = body.customerId ? findCachedCustomer(body.customerId) : null
  const holdNo = nextHoldNo()
  const row = {
    sales_id: `L-${newClientUuid()}`,
    hold_no: holdNo,
    bill_date: new Date().toISOString(),
    customer_id: body.customerId ?? null,
    amount: body.netAmount,
    payment_mode: body.paymentMode,
    staff_id: staffId ?? null,
    remarks: body.remarks ?? null,
    customer_code: c?.customerCode ?? null,
    customer_name: c?.customerName ?? null,
    customer_payment_mode: c?.paymentMode ?? null,
    credit_balance: c?.osAmount ?? 0,
    staff_name: staffName ?? '',
    item_count: (body.cartItems ?? []).length,
    local: true,
    items: (body.cartItems ?? []).map((it, idx) => ({
      sales_child_id: idx + 1,
      product_id: it.productId,
      product_code: it.productCode,
      group_id: it.groupId,
      short_description: it.description,
      qty: it.qty,
      unit_price: it.unitPrice,
      discount_amount: it.discountAmt ?? it.discount ?? 0,
      tax_1_rate: it.vatPer ?? 0,
      tax_1_amount: it.vatAmt ?? 0,
      line_total: it.lineTotal,
    })),
  }
  const holds = (await list()).filter(h => h.sales_id !== body.recalledHoldSalesId)
  await save([...holds, row])
  return { salesId: row.sales_id, holdNo, message: `No connection — bill held on this terminal as ${holdNo}` }
}

/** Server holds + this device's holds, server first (same order as GET /sales/held). */
export async function withLocalHolds(serverHolds) {
  const local = (await list().catch(() => [])).map(({ items: _items, ...row }) => row)
  return [...(Array.isArray(serverHolds) ? serverHolds : []), ...local]
}

export async function localHoldItems(salesId) {
  const h = (await list()).find(x => x.sales_id === salesId)
  if (!h) { const e = new Error('Hold bill not found'); e.status = 404; throw e }
  return h.items
}

export async function removeLocalHold(salesId) {
  if (!isLocalHoldId(salesId)) return
  await save((await list()).filter(h => h.sales_id !== salesId))
}
