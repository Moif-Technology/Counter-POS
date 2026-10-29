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
      const req = indexedDB.open(DB_NAME, 1)
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

export async function refreshQueueState() {
  const [rows, synced] = await Promise.all([listQueue(), idb('kv', 'readonly', s => s.get('synced'))])
  useOfflineStore.setState({
    pending: rows.filter(r => r.status !== 'failed'),
    failed: rows.filter(r => r.status === 'failed'),
    synced: synced ?? [],
  })
}
