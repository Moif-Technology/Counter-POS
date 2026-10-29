import {
  setOnline, isOffline, findCachedProduct, lookupCachedProducts, cachedGroups,
} from './offlineCache';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

/** Server unreachable (no network, timeout, gateway down) — callers may fall back to offline mode. */
function offlineError() {
  const err = new Error('Not available offline — no connection to the server');
  err.offline = true;
  return err;
}

/**
 * opts.timeoutMs — abort a hanging request (treated as offline).
 * opts.quiet401  — don't end the session on 401 (background sync shows "re-login" instead).
 */
async function request(method, path, body, token, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const ctrl = opts.timeoutMs ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opts.timeoutMs) : null;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ctrl?.signal,
    });
  } catch {
    setOnline(false);
    throw offlineError();
  } finally {
    if (timer) clearTimeout(timer);
  }
  // Reverse proxy answered but the API behind it is down.
  if (res.status >= 502 && res.status <= 504) {
    setOnline(false);
    throw offlineError();
  }
  setOnline(true);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.code;
    // Signed-in call rejected: session expired or taken over by another terminal.
    if (res.status === 401 && token && !opts.quiet401) {
      window.dispatchEvent(new CustomEvent('pos-session-ended', { detail: err.message }))
    }
    throw err;
  }
  return data;
}

/** Read from the server; when it can't be reached use the offline product cache. */
async function withCache(fetcher, fromCache) {
  if (isOffline()) return fromCache();
  try {
    return await fetcher();
  } catch (err) {
    if (err.offline) return fromCache();
    throw err;
  }
}

export const api = {
  get:   (path, token)       => request('GET',   path, null, token),
  post:  (path, body, token) => request('POST',  path, body, token),
  patch: (path, body, token) => request('PATCH', path, body, token),

  // Counter-POS specific endpoints — /api/counter-pos/*
  counterPos: {
    staffList:     (body)           => request('POST', '/counter-pos/staff-list',   body),
    pinLogin:      (body)           => request('POST', '/counter-pos/pin-login',    body),
    enrollDevice:       (body) => request('POST', '/counter-pos/device/enroll',    body),
    enrollListStations: (body) => request('POST', '/counter-pos/device/stations', body),
    productSearch:  (barcode, token)      => withCache(
      () => request('GET',  `/counter-pos/products/search?barcode=${encodeURIComponent(barcode)}`, null, token, { timeoutMs: 8000 }),
      () => ({ product: findCachedProduct(barcode) }),
    ),
    productLookup:  (q, maxPrice, token, groupId) => {
      const params = new URLSearchParams()
      params.set('q', q ?? '')
      if (maxPrice) params.set('maxPrice', String(maxPrice))
      if (groupId != null && groupId !== '') params.set('groupId', String(groupId))
      return withCache(
        () => request('GET', `/counter-pos/products/lookup?${params.toString()}`, null, token, { timeoutMs: 8000 }),
        () => ({ products: lookupCachedProducts(q, maxPrice, groupId) }),
      )
    },
    productSnapshot: (token)             => request('GET',  `/counter-pos/products/snapshot`, null, token, { timeoutMs: 60000 }),
    ping:           ()                   => request('GET',  `/counter-pos/ping`, null, null, { timeoutMs: 5000 }),
    customerSearch: (q, limit, token)    => request('GET',  `/counter-pos/customers/search?q=${encodeURIComponent(q ?? '')}&limit=${limit ?? 30}`, null, token),
    nextBillNo:     (token)              => request('GET',   `/counter-pos/sales/next-bill-no`, null, token),
    // Hung save → treated as offline and queued; clientUuid makes the later upload idempotent.
    saveBill:       (body, token, opts)  => request('POST',  `/counter-pos/sales/save`, body, token, { timeoutMs: 20000, ...opts }),
    holdBill:       (body, token)        => request('POST',  `/counter-pos/sales/hold`, body, token),
    saveDelivery:   (body, token)        => request('POST',  `/counter-pos/sales/delivery`, body, token),
    getDeliveryBills: (token)            => request('GET',   `/counter-pos/sales/delivery`, null, token, { timeoutMs: 8000 }),
    recallDelivery: (salesId, token)     => request('GET',   `/counter-pos/sales/delivery/${salesId}`, null, token),
    cancelDelivery: (salesId, token)     => request('DELETE',`/counter-pos/sales/delivery/${salesId}`, null, token),
    settleDelivery: (salesId, body, token) => request('POST', `/counter-pos/sales/delivery/${salesId}/settle`, body, token),
    settleDeliveryBulk: (body, token) => request('POST', '/counter-pos/sales/delivery/settle-bulk', body, token),
    getHeldBills:   (token)              => request('GET',   `/counter-pos/sales/held`, null, token, { timeoutMs: 8000 }),
    recallBill:     (salesId, token)     => request('GET',   `/counter-pos/sales/held/${salesId}`, null, token),
    recallHeldBill: (salesId, token)     => request('POST',  `/counter-pos/sales/held/${salesId}/recall`, {}, token),
    cancelHold:     (salesId, token)     => request('DELETE',`/counter-pos/sales/held/${salesId}`, null, token),
    groupsList:     (token)              => withCache(
      () => request('GET',   `/counter-pos/groups`, null, token, { timeoutMs: 8000 }),
      () => ({ groups: cachedGroups() }),
    ),

    // Counter reading — X/Z report
    counterSummary:    (counterNo, token)         => request('GET',  `/counter-pos/counter/summary?counterNo=${counterNo}`, null, token),
    counterClose:      (body, token)              => request('POST', `/counter-pos/counter/close`, body, token),
    addCashInOut:      (body, token)              => request('POST', `/counter-pos/counter/cash-in-out`, body, token),
    getCashInOut:      (counterNo, token)         => request('GET',  `/counter-pos/counter/cash-in-out?counterNo=${counterNo}`, null, token),
    counterHistory:    (params, token) => {
      const q = new URLSearchParams()
      if (params?.counterNo) q.set('counterNo', params.counterNo)
      if (params?.dateFrom)  q.set('dateFrom', params.dateFrom)
      if (params?.dateTo)    q.set('dateTo', params.dateTo)
      if (params?.limit)     q.set('limit', params.limit)
      const qs = q.toString()
      return request('GET', `/counter-pos/counter/history${qs ? `?${qs}` : ''}`, null, token)
    },
    counterCloseDetail:(closeId, token)           => request('GET',  `/counter-pos/counter/history/${closeId}`, null, token),
    cashInOutReport:   (params, token) => {
      const q = new URLSearchParams()
      if (params?.dateFrom)    q.set('dateFrom', params.dateFrom)
      if (params?.dateTo)      q.set('dateTo', params.dateTo)
      if (params?.counterNo)   q.set('counterNo', params.counterNo)
      if (params?.closeNo)     q.set('closeNo', params.closeNo)
      if (params?.limit)       q.set('limit', params.limit)
      const qs = q.toString()
      return request('GET', `/counter-pos/counter/cash-in-out/report${qs ? `?${qs}` : ''}`, null, token)
    },
    groupWiseReport:   (counterNo, token, closeId) => request('GET',  `/counter-pos/sales/group-wise?counterNo=${counterNo}${closeId ? `&closeId=${closeId}` : ''}`, null, token),
    staffWiseReport:   (counterNo, token, closeId) => request('GET',  `/counter-pos/sales/staff-wise?counterNo=${counterNo}${closeId ? `&closeId=${closeId}` : ''}`, null, token),
    salesViewerList:   (params, token) => {
      const q = new URLSearchParams()
      if (params?.counterNo)   q.set('counterNo', params.counterNo)
      if (params?.dateFrom)    q.set('dateFrom', params.dateFrom)
      if (params?.dateTo)      q.set('dateTo', params.dateTo)
      if (params?.customerId)  q.set('customerId', params.customerId)
      if (params?.limit)       q.set('limit', params.limit)
      const qs = q.toString()
      return request('GET', `/counter-pos/sales/viewer${qs ? `?${qs}` : ''}`, null, token)
    },
    salesViewerBill:   (salesId, token)           => request('GET',  `/counter-pos/sales/viewer/${salesId}`, null, token),
    billForReturn:     (billNo, token)            => request('GET',  `/counter-pos/sales/by-bill/${encodeURIComponent(billNo)}`, null, token),
    // Bill cancellation — body { reason, supervisorCode?, supervisorPin? }
    voidBill:          (salesId, body, token)     => request('POST', `/counter-pos/sales/${salesId}/void`, body, token),
    voidBillItem:      (salesId, salesChildId, body, token) => request('POST', `/counter-pos/sales/${salesId}/items/${salesChildId}/void`, body, token),

    // Credit settlement (receipt against outstanding bills)
    creditCustomers:          (q, limit, token) => request('GET',  `/counter-pos/settlement/credit-customers?q=${encodeURIComponent(q ?? '')}&limit=${limit ?? 200}`, null, token),
    customerOutstandingBills: (customerId, token) => request('GET',  `/counter-pos/settlement/customers/${customerId}/bills`, null, token),
    saveCreditSettlement:     (body, token)       => request('POST', `/counter-pos/settlement/save`, body, token),
    settlementHistory:        (params, token)     => {
      const q = new URLSearchParams()
      if (params?.customerId) q.set('customerId', params.customerId)
      if (params?.dateFrom)   q.set('dateFrom', params.dateFrom)
      if (params?.dateTo)     q.set('dateTo', params.dateTo)
      if (params?.limit)      q.set('limit', params.limit)
      const qs = q.toString()
      return request('GET', `/counter-pos/settlement/history${qs ? `?${qs}` : ''}`, null, token)
    },
    settlementReceipt:        (transactionId, token) => request('GET', `/counter-pos/settlement/receipts/${transactionId}`, null, token),
  },

  // Shared backoffice endpoints
  auth: {
    me:      (token)        => request('GET',  '/auth/me',      null,          token),
    refresh: (refreshToken) => request('POST', '/auth/refresh', { refreshToken }),
  },

  staff: {
    list:   (token)                    => request('GET',   '/staff/members',             null,    token),
    setPin: (staffId, pin, token)      => request('PATCH', `/staff/members/${staffId}/pin`, { pin }, token),
  },

  appParameters: {
    gvtax:     (token) => request('GET', '/app-parameters/gvtax', null, token),
    posParams: (token) => request('GET', '/parameters/POS', null, token),
  },
};
