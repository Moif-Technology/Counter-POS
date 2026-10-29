import { api } from './api'
import { usePosStore } from '../store/posStore'
import { notifyStockChanged } from './stockCheck'
import { PM, normalizePaymentMode } from './paymentModes'
import {
  useOfflineStore, setOnline, markSynced,
  loadProductCache, saveProductSnapshot, deductCachedStock,
  newClientUuid, nextOfflineBillNo, listQueue, putQueued, removeQueued, addSynced, refreshQueueState,
} from './offlineCache'

const SYNC_INTERVAL_MS = 30000

/** Network failure (not a server answer) — the bill can be queued. */
export const isNetworkError = (err) => !!err?.offline

export { newClientUuid }

/**
 * Why this bill can't be saved offline, or null when it can.
 * Offline = plain cash / card sales; anything needing the server is refused.
 */
export function offlineBlockReason(payload) {
  const mode = normalizePaymentMode(payload.paymentMode)
  if (mode !== PM.CASH && mode !== PM.CREDITCARD) return `${mode} payment is not available offline (cash or card only)`
  if (payload.isReturn || (payload.cartItems ?? []).some(i => Number(i.qty) < 0)) return 'Returns are not available offline'
  if (payload.recalledHoldSalesId || payload.recalledDeliverySalesId) return 'Recalled hold / delivery bills are not available offline'
  return null
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

/** Download the full product list for this station into the offline cache. */
export async function refreshProducts() {
  const { accessToken, companyId, stationId } = usePosStore.getState()
  if (!accessToken) return false
  const snap = await api.counterPos.productSnapshot(accessToken)
  const pending = (await listQueue()).filter(r => r.status !== 'failed')
  await saveProductSnapshot(companyId, stationId, snap, pending)
  notifyStockChanged()
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
        await addSynced(rec.offlineBillNo, result?.billNoDisplay ?? `B-${result?.billNo ?? ''}`)
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
    const { pending, online } = useOfflineStore.getState()
    if (!pending.length && online) return
    if (await pingServer()) await syncNow()
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
