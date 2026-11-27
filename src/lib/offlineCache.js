import { create } from 'zustand'

/**
 * Offline cache for the counter: product snapshot + queue of bills saved while the
 * server was unreachable. Native IndexedDB, two stores:
 *   kv    — product snapshot per company/station, synced-bill map
 *   queue — offline bills keyed by clientUuid ({ status: 'pending' | 'failed', ... })
 * No api import here (api.js imports this file for its fallbacks).
 */

const DB_NAME = 'moif_pos_offline'
const SEQ_KEY = 'moif_pos_offline_seq'
const LAST_SYNC_KEY = 'moif_pos_last_sync'

let dbPromise = null
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      // v2: re-run the upgrade so a v1 DB opened elsewhere without stores gets them (data kept).
      const req = indexedDB.open(DB_NAME, 2)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
        if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'clientUuid' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => { dbPromise = null; reject(req.error) }
    })
  }
  return dbPromise
}

/** Run one request in a transaction; resolves with its result once committed. */
async function idb(storeName, mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode)
    const req = fn(t.objectStore(storeName))
    t.oncomplete = () => resolve(req ? req.result : undefined)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

/* ── Connectivity / sync state (header button reads this) ───────────── */

function readLastSync() {
  try { return localStorage.getItem(LAST_SYNC_KEY) } catch { return null }
}

export const useOfflineStore = create(() => ({
  /** Last known reachability: navigator.onLine AND the last request / ping got through. */
  online: typeof navigator === 'undefined' || navigator.onLine !== false,
  pending: [],
  failed: [],
  synced: [],
  syncing: false,
  lastSyncAt: readLastSync(),
  productsAt: null,
  productCount: 0,
  needsLogin: false,
  lastError: null,
}))

export function setOnline(online) {
  if (useOfflineStore.getState().online !== online) useOfflineStore.setState({ online })
}

export function isOffline() {
  return !useOfflineStore.getState().online
}

export function markSynced() {
  const at = new Date().toISOString()
  try { localStorage.setItem(LAST_SYNC_KEY, at) } catch { /* storage blocked */ }
  useOfflineStore.setState({ lastSyncAt: at })
}

/* ── Product cache ──────────────────────────────────────────────────── */

let mem = { key: null, products: [], groups: [], byBarcode: new Map(), byCode: new Map() }

const cacheKey = (companyId, stationId) => `products:${companyId ?? ''}:${stationId ?? ''}`

function indexSnapshot(key, snap) {
  const products = snap?.products ?? []
  const byBarcode = new Map()
  const byCode = new Map()
  for (const p of products) {
    if (p.barcode) byBarcode.set(String(p.barcode).trim().toLowerCase(), p)
    if (p.productCode) byCode.set(String(p.productCode).trim().toLowerCase(), p)
  }
  mem = { key, products, groups: snap?.groups ?? [], byBarcode, byCode }
  useOfflineStore.setState({ productsAt: snap?.generatedAt ?? null, productCount: products.length })
}

export async function loadProductCache(companyId, stationId) {
  const key = cacheKey(companyId, stationId)
  if (mem.key === key && mem.products.length) return
  indexSnapshot(key, await idb('kv', 'readonly', s => s.get(key)))
}

/** Store a fresh server snapshot, minus stock still held by bills waiting to sync. */
export async function saveProductSnapshot(companyId, stationId, snap, pendingBills = []) {
  const key = cacheKey(companyId, stationId)
  indexSnapshot(key, snap)
  for (const b of pendingBills) applyStockDeduction(b.payload?.cartItems)
  await idb('kv', 'readwrite', s => { s.put({ ...snap, products: mem.products, groups: mem.groups }, key) })
}

function applyStockDeduction(cartItems) {
  for (const line of cartItems ?? []) {
    const id = Number(line.productId)
    if (!(id > 0)) continue
    const p = mem.products.find(x => Number(x.productId) === id)
    if (p && p.trackStock !== false) p.qtyOnHand = Number(p.qtyOnHand || 0) - Number(line.qty || 0)
  }
}

/** Offline sale: take sold qty off the cached stock so the low-stock check stays honest. */
export async function deductCachedStock(cartItems) {
  if (!mem.key) return
  applyStockDeduction(cartItems)
  const key = mem.key
  const snap = await idb('kv', 'readonly', s => s.get(key))
  await idb('kv', 'readwrite', s => { s.put({ ...(snap ?? {}), products: mem.products, groups: mem.groups }, key) })
}

/** Same match as GET /products/search: master barcode, else product code (case-insensitive). */
export function findCachedProduct(term) {
  const t = String(term ?? '').trim().toLowerCase()
  const p = mem.byBarcode.get(t) ?? mem.byCode.get(t)
  if (!p) {
    const err = new Error(`Product not found: ${term} (offline cache${mem.products.length ? '' : ' empty'})`)
    err.status = 404
    throw err
  }
  return { ...p }
}

/** Same filters as GET /products/lookup (name / short name / code / barcode contains). */
export function lookupCachedProducts(q, maxPrice, groupId) {
  const term = String(q ?? '').trim().toLowerCase()
  const max = maxPrice ? Number(maxPrice) : null
  const gid = groupId != null && groupId !== '' ? Number(groupId) : null
  return mem.products.filter(p => {
    if (term) {
      const hit = String(p.description ?? '').toLowerCase().includes(term)
        || String(p.shortName ?? '').toLowerCase().includes(term)
        || String(p.productCode ?? '').toLowerCase().includes(term)
        || String(p.barcode ?? '').toLowerCase().includes(term)
      if (!hit) return false
    }
    if (max != null && Number.isFinite(max) && Number(p.unitPrice) > max) return false
    if (gid != null && Number(p.groupId) !== gid) return false
    return true
  }).slice(0, 100).map(p => ({ ...p }))
}

export function cachedGroups() {
  return mem.groups
}

/* ── Offline bill queue ─────────────────────────────────────────────── */

export function newClientUuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Station-prefixed offline number, sequence kept per device: S3-OFF-12. */
export function nextOfflineBillNo(stationId) {
  let seq = 0
  try { seq = Number(localStorage.getItem(SEQ_KEY)) || 0 } catch { /* storage blocked */ }
  seq += 1
  try { localStorage.setItem(SEQ_KEY, String(seq)) } catch { /* storage blocked */ }
  return `S${stationId ?? 0}-OFF-${seq}`
}

export async function listQueue() {
  const rows = await idb('queue', 'readonly', s => s.getAll())
  return (rows ?? []).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

export const putQueued = (rec) => idb('queue', 'readwrite', s => { s.put(rec) })
export const removeQueued = (clientUuid) => idb('queue', 'readwrite', s => { s.delete(clientUuid) })

/** Remember offline no → server bill no (last 50) for the sync panel. */
export async function addSynced(offlineBillNo, billNoDisplay) {
  const list = (await idb('kv', 'readonly', s => s.get('synced'))) ?? []
  const next = [{ offlineBillNo, billNoDisplay, at: new Date().toISOString() }, ...list].slice(0, 50)
  await idb('kv', 'readwrite', s => { s.put(next, 'synced') })
}

const seqOf = (no) => Number(String(no ?? '').match(/-OFF-(\d+)$/)?.[1]) || 0

export async function refreshQueueState() {
  const [rows, synced] = await Promise.all([listQueue(), idb('kv', 'readonly', s => s.get('synced'))])
  // localStorage wiped but the queue survived: never print an offline number twice.
  const maxSeq = Math.max(0, ...rows.map(r => seqOf(r.offlineBillNo)), ...(synced ?? []).map(x => seqOf(x.offlineBillNo)))
  try {
    if ((Number(localStorage.getItem(SEQ_KEY)) || 0) < maxSeq) localStorage.setItem(SEQ_KEY, String(maxSeq))
  } catch { /* storage blocked */ }
  useOfflineStore.setState({
    pending: rows.filter(r => r.status !== 'failed'),
    failed: rows.filter(r => r.status === 'failed'),
    synced: synced ?? [],
  })
}

/* ── Customers (credit / delivery / privilege pickers work offline) ─── */

let custMem = { key: null, list: [] }
const custKey = (companyId) => `customers:${companyId ?? ''}`

export async function saveCustomerSnapshot(companyId, customers) {
  custMem = { key: custKey(companyId), list: customers ?? [] }
  await idb('kv', 'readwrite', s => { s.put(custMem.list, custMem.key) })
}

export async function loadCustomerCache(companyId) {
  const key = custKey(companyId)
  if (custMem.key === key && custMem.list.length) return
  custMem = { key, list: (await idb('kv', 'readonly', s => s.get(key))) ?? [] }
}

/** Same match as GET /customers/search (code / name / mobile / telephone contains). */
export function lookupCachedCustomers(q, limit = 30) {
  const t = String(q ?? '').trim().toLowerCase()
  const hit = (v) => String(v ?? '').toLowerCase().includes(t)
  return custMem.list
    .filter(c => !t || hit(c.customerCode) || hit(c.customerName) || hit(c.mobileNo) || hit(c.telephone))
    .slice(0, Number(limit) || 30)
    .map(c => ({ ...c }))
}

export function findCachedCustomer(customerId) {
  return custMem.list.find(c => Number(c.customerId) === Number(customerId)) ?? null
}

/* ── Sales log: bills made on this device (offline returns) ──────────── */

export const SALES_LOG_DAYS = 7
let logMem = { key: null, list: [] }
const logKey = (companyId) => `salesLog:${companyId ?? ''}`

export async function loadSalesLog(companyId) {
  const key = logKey(companyId)
  if (logMem.key === key) return
  logMem = { key, list: (await idb('kv', 'readonly', s => s.get(key))) ?? [] }
}

/** Remember a bill this device made (online or offline); keeps the last SALES_LOG_DAYS. */
export async function logDeviceSale(companyId, bill) {
  await loadSalesLog(companyId)
  const cutoff = Date.now() - SALES_LOG_DAYS * 86400000
  logMem.list = [bill, ...logMem.list.filter(b => new Date(b.at).getTime() >= cutoff)]
  await idb('kv', 'readwrite', s => { s.put(logMem.list, logMem.key) })
}

/** Offline bill reached the server: it can now also be found by its server number. */
export async function relabelDeviceSale(companyId, offlineBillNo, billNo) {
  await loadSalesLog(companyId)
  const b = logMem.list.find(x => x.offlineBillNo === offlineBillNo)
  if (!b) return
  b.billNo = billNo
  await idb('kv', 'readwrite', s => { s.put(logMem.list, logMem.key) })
}

const billKey = (no) => String(no ?? '').trim().toUpperCase().replace(/^[BR]-/, '')

/** Bill made on this device, by printed number (B-123, 123 or S3-OFF-12). */
export function findDeviceBill(billNo) {
  const k = billKey(billNo)
  return logMem.list.find(b => billKey(b.billNo) === k || (b.offlineBillNo && billKey(b.offlineBillNo) === k)) ?? null
}

/** Net qty of a product sold from this device in the log window (returns already subtracted). */
export function deviceNetSoldQty(productId) {
  let n = 0
  for (const b of logMem.list) {
    for (const i of b.items ?? []) if (Number(i.productId) === Number(productId)) n += Number(i.qty) || 0
  }
  return n
}

/* ── Holds parked on this device while offline ──────────────────────── */

const holdsKey = (companyId, stationId) => `holds:${companyId ?? ''}:${stationId ?? ''}`
export const isLocalHoldId = (id) => String(id ?? '').startsWith('L-')

export async function listLocalHolds(companyId, stationId) {
  return (await idb('kv', 'readonly', s => s.get(holdsKey(companyId, stationId)))) ?? []
}

export async function saveLocalHolds(companyId, stationId, holds) {
  await idb('kv', 'readwrite', s => { s.put(holds, holdsKey(companyId, stationId)) })
}

/* ── Who / where is billing (set at login; api.js reads it for offline fallbacks) ── */

let scope = {}
export const setOfflineScope = (s) => { scope = s ?? {} }
export const offlineScope = () => scope
