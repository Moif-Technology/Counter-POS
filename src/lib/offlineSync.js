import { api } from './api'
import { usePosStore } from '../store/posStore'
import { notifyStockChanged } from './stockCheck'
import { PM, normalizePaymentMode } from './paymentModes'
import { fmtMoney } from './currencyFormat'
import {
  useOfflineStore, setOnline, markSynced,
  loadProductCache, saveProductSnapshot, deductCachedStock,
  newClientUuid, nextOfflineBillNo, listQueue, putQueued, removeQueued, addSynced, refreshQueueState,
  loadCustomerCache, saveCustomerSnapshot, findCachedCustomer,
  loadSalesLog, logDeviceSale, relabelDeviceSale, deviceNetSoldQty, SALES_LOG_DAYS,
} from './offlineCache'

const SYNC_INTERVAL_MS = 30000

/** Network failure (not a server answer) — the bill can be queued. */
export const isNetworkError = (err) => !!err?.offline

export { newClientUuid }

const money = fmtMoney

function billCreditAmount(payload) {
  const mode = normalizePaymentMode(payload.paymentMode)
  if (mode === PM.CREDIT) return Number(payload.netAmount) || 0
  if (mode !== PM.MULTIPAYMENT) return 0
  return (payload.paymentSplits ?? [])
    .filter(s => normalizePaymentMode(s.payMode) === PM.CREDIT)
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
}

/** Credit already given offline to this customer by bills still waiting to upload. */
function offlineCreditUsed(customerId) {
  const { pending, failed } = useOfflineStore.getState()
  return [...pending, ...failed]
    .filter(r => Number(r.payload?.customerId) === Number(customerId))
    .reduce((sum, r) => sum + billCreditAmount(r.payload), 0)
}

/**
 * Why this bill can't be saved offline, or null when it can.
 * Cash / card / multi-payment: always. Credit: cached customer with a credit limit that
 * still covers outstanding + offline credit + this bill. Returns: only products sold from
 * this terminal in the last SALES_LOG_DAYS days. Delivery recall needs the server.
 * ponytail: outstanding comes from the last customer download, so online credit bills
 * made since then are not counted; the server stays the final word after sync.
 */
export function offlineBlockReason(payload) {
  const mode = normalizePaymentMode(payload.paymentMode)
  if (![PM.CASH, PM.CREDITCARD, PM.CREDIT, PM.MULTIPAYMENT].includes(mode)) return `${mode} payment is not available offline`
  if (payload.recalledDeliverySalesId) return 'Recalled delivery bills are not available offline'

  const lines = payload.cartItems ?? []
  const returnLines = lines.filter(i => Number(i.qty) < 0)
  const credit = billCreditAmount(payload)

  if (credit > 0.005) {
    if (returnLines.length && lines.some(i => Number(i.qty) > 0)) return 'Cannot mix Return + Sale in CREDIT mode'
    if (!payload.customerId) return 'Credit bill needs a customer'
    const c = findCachedCustomer(payload.customerId)
    if (!c) return 'Customer is not in the offline list (refresh data when back online)'
    const limit = Number(c.creditLimit) || 0
    if (!(limit > 0)) return `${c.customerName} has no credit limit set — offline credit needs one (set it in the backoffice)`
    const os = Number(c.osAmount) || 0
    const used = offlineCreditUsed(c.customerId)
    if (os + used + credit > limit + 0.005) {
      return `Credit limit reached offline for ${c.customerName}: limit ${money(limit)}, outstanding ${money(os)}, offline credit ${money(used)}`
    }
  }

  const need = new Map()
  for (const i of returnLines) {
    const pid = Number(i.productId)
    if (!(pid > 0)) return 'Group-item returns are not available offline'
    need.set(pid, { qty: (need.get(pid)?.qty ?? 0) + Math.abs(Number(i.qty) || 0), name: i.description ?? i.productCode })
  }
  for (const [pid, { qty, name }] of need) {
    const sold = deviceNetSoldQty(pid)
    if (sold + 0.0001 < qty) {
      return `Return of ${name}: only ${Math.max(0, sold)} sold from this terminal in the last ${SALES_LOG_DAYS} days`
    }
  }
  return null
}

/** Log a bill this terminal made so it can be returned offline later. */
export function logSaleOnDevice({ billNo, offlineBillNo = null, payload }) {
  const { companyId, customerName } = usePosStore.getState()
  return logDeviceSale(companyId, {
    billNo, offlineBillNo, at: new Date().toISOString(),
    customerId: payload.customerId ?? null, customerName: payload.customerId ? customerName : '',
    items: (payload.cartItems ?? []).map(i => ({
      productId: i.productId, productCode: i.productCode, description: i.description,
      qty: Number(i.qty) || 0, unitPrice: i.unitPrice, vatPer: i.vatPer, discount: i.discountAmt ?? i.discount ?? 0,
      groupId: i.groupId,
    })),
  }).catch(() => {})
}

/** Lightweight reachability probe (navigator.onLine can lie on Android). */
export async function pingServer() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { setOnline(false); return false }
  try {
    await api.counterPos.ping()
    return true
  } catch (err) {
    return !err.offline
  }
}

/** Download the full product + customer lists for this station into the offline cache. */
export async function refreshProducts() {
  const { accessToken, companyId, stationId } = usePosStore.getState()
  if (!accessToken) return false
  try {
    const snap = await api.counterPos.productSnapshot(accessToken)
    const pending = (await listQueue()).filter(r => r.status !== 'failed')
    await saveProductSnapshot(companyId, stationId, snap, pending)
  } catch (err) {
    // Shown in the sync panel: an empty product cache means no offline billing.
    console.warn('[offline] product download failed', err)
    useOfflineStore.setState({ lastError: `Product download failed: ${err.message}` })
    throw err
  }
  notifyStockChanged()
  // Customers are best-effort: no customer permission (or an older API) must not fail products.
  try {
    const res = await api.counterPos.customerSnapshot(accessToken)
      .catch(err => (err.status === 404 ? api.counterPos.customerSearch('', 200, accessToken) : Promise.reject(err)))
    await saveCustomerSnapshot(companyId, res?.customers ?? [])
  } catch { /* keep the previous customer cache */ }
  return true
}

/** Queue a bill the server could not take; returns the queued record (with offline bill no). */
export async function queueOfflineBill(payload, clientUuid) {
  const { cashier, companyId, stationId, branchId } = usePosStore.getState()
  const rec = {
    clientUuid,
    offlineBillNo: nextOfflineBillNo(stationId ?? branchId),
    createdAt: new Date().toISOString(),
    status: 'pending',
    companyId,
    staffId: cashier?.staffId ?? null,
    staffName: cashier?.staffName ?? '',
    netAmount: payload.netAmount,
    payload,
  }
  await putQueued(rec)
  await logSaleOnDevice({ billNo: rec.offlineBillNo, offlineBillNo: rec.offlineBillNo, payload })
  await deductCachedStock(payload.cartItems)
  await refreshQueueState()
  return rec
}

/** Receipt data (printBillFromData shape) for a bill saved offline. */
export function offlineReceiptBill(rec) {
  const s = usePosStore.getState()
  const p = rec.payload
  return {
    billNo: rec.offlineBillNo,
    billDate: rec.createdAt,
    billTime: rec.createdAt,
    transactionType: 'SALE',
    counterNo: p.counterNo,
    staffName: rec.staffName,
    paymentMode: p.paymentMode,
    amount: p.netAmount,
    paidAmount: p.paidAmount,
    balanceAmount: p.balanceAmount,
    taxableAmt: p.taxableAmt,
    taxAmt: p.taxAmt,
    discountAmt: p.discountAmt,
    roundOff: p.roundOff,
    remarks: [p.remarks, 'OFFLINE BILL — pending sync'].filter(Boolean).join(' · '),
    items: p.cartItems,
    customer: p.customerId ? { customerId: p.customerId, customerName: s.customerName } : null,
    company: {
      companyName: s.shopName, branchName: s.shopSubName, companyAddress: s.companyAddress,
      companyPhone: s.companyPhone, taxRegistrationNo: s.companyTrn,
    },
  }
}

let running = null

/** Upload queued bills in order. Resolves with the number uploaded. */
export function syncNow() {
  if (!running) running = doSync().finally(() => { running = null })
  return running
}

async function doSync() {
  const { accessToken, companyId } = usePosStore.getState()
  const pending = (await listQueue())
    .filter(r => r.status !== 'failed' && Number(r.companyId) === Number(companyId))
  if (!pending.length) { await refreshQueueState(); return 0 }
  if (!accessToken) { useOfflineStore.setState({ needsLogin: true }); return 0 }

  useOfflineStore.setState({ syncing: true, lastError: null })
  let uploaded = 0
  try {
    for (const rec of pending) {
      try {
        const result = await api.counterPos.saveBill({
          ...rec.payload,
          clientUuid: rec.clientUuid,
          offlineBillNo: rec.offlineBillNo,
          offlineCreatedAt: rec.createdAt,
          offlineStaffId: rec.staffId,
        }, accessToken, { quiet401: true })
        await removeQueued(rec.clientUuid)
        const billNoDisplay = result?.billNoDisplay ?? result?.sale?.billNoDisplay ?? `B-${result?.billNo ?? ''}`
        await addSynced(rec.offlineBillNo, billNoDisplay)
        await relabelDeviceSale(companyId, rec.offlineBillNo, billNoDisplay).catch(() => {})
        uploaded += 1
      } catch (err) {
        if (err.offline) break
        if (err.status === 401) { useOfflineStore.setState({ needsLogin: true }); break }
        if (err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429) {
          // Rejected by the server: park it with the reason, carry on with the rest.
          await putQueued({ ...rec, status: 'failed', error: err.message, failedAt: new Date().toISOString() })
          continue
        }
        // Server error / throttled: keep order, retry next round.
        useOfflineStore.setState({ lastError: err.message })
        break
      }
    }
  } finally {
    if (uploaded) {
      markSynced()
      useOfflineStore.setState({ needsLogin: false })
    }
    useOfflineStore.setState({ syncing: false })
    await refreshQueueState()
  }
  if (uploaded) refreshProducts().catch(() => {})
  return uploaded
}

/** Put a failed bill back in the upload queue. */
export async function retryFailedBill(clientUuid) {
  const rec = (await listQueue()).find(r => r.clientUuid === clientUuid)
  if (!rec) return
  await putQueued({ ...rec, status: 'pending', error: null })
  await refreshQueueState()
  return syncNow()
}

/**
 * Start autosync for the logged-in session: load cache, sync on start / 'online' /
 * every 30s while bills are waiting or the server is unreachable. Returns a stop fn.
 */
export function startOfflineSync() {
  const tick = async () => {
    const { pending, online, productCount } = useOfflineStore.getState()
    if (!pending.length && online && productCount) return
    if (!(await pingServer())) return
    await syncNow()
    // No product list on this till yet (first download failed): keep trying while online.
    if (!useOfflineStore.getState().productCount) await refreshProducts().catch(() => {})
  }
  const onOnline = () => { tick() }
  const onOffline = () => setOnline(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  // Any request getting through again (not just the ping) kicks a sync.
  const unsub = useOfflineStore.subscribe((s, prev) => { if (s.online && !prev.online) syncNow() })
  const timer = setInterval(tick, SYNC_INTERVAL_MS)

  useOfflineStore.setState({ needsLogin: false })
  ;(async () => {
    const { companyId, stationId } = usePosStore.getState()
    await loadProductCache(companyId, stationId).catch(() => {})
    await loadCustomerCache(companyId).catch(() => {})
    await loadSalesLog(companyId).catch(() => {})
    await refreshQueueState().catch(() => {})
    const uploaded = await syncNow().catch(() => 0)
    if (!uploaded) refreshProducts().catch(() => {})
  })()

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    unsub()
    clearInterval(timer)
  }
}
