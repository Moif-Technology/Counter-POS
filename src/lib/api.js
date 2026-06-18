const BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get:   (path, token)       => request('GET',   path, null, token),
  post:  (path, body, token) => request('POST',  path, body, token),
  patch: (path, body, token) => request('PATCH', path, body, token),

  // Counter-POS specific endpoints — /api/counter-pos/*
  counterPos: {
    pinLogin:      (body)           => request('POST', '/counter-pos/pin-login',    body),
    enrollDevice:  (body)           => request('POST', '/counter-pos/device/enroll', body),
    productSearch:  (barcode, token)      => request('GET',  `/counter-pos/products/search?barcode=${encodeURIComponent(barcode)}`, null, token),
    productLookup:  (q, maxPrice, token, groupId) => {
      const params = new URLSearchParams()
      params.set('q', q ?? '')
      if (maxPrice) params.set('maxPrice', String(maxPrice))
      if (groupId != null && groupId !== '') params.set('groupId', String(groupId))
      return request('GET', `/counter-pos/products/lookup?${params.toString()}`, null, token)
    },
    customerSearch: (q, limit, token)    => request('GET',  `/counter-pos/customers/search?q=${encodeURIComponent(q ?? '')}&limit=${limit ?? 30}`, null, token),
    nextBillNo:     (token)              => request('GET',   `/counter-pos/sales/next-bill-no`, null, token),
    saveBill:       (body, token)        => request('POST',  `/counter-pos/sales/save`, body, token),
    holdBill:       (body, token)        => request('POST',  `/counter-pos/sales/hold`, body, token),
    saveDelivery:   (body, token)        => request('POST',  `/counter-pos/sales/delivery`, body, token),
    getDeliveryBills: (token)            => request('GET',   `/counter-pos/sales/delivery`, null, token),
    recallDelivery: (salesId, token)     => request('GET',   `/counter-pos/sales/delivery/${salesId}`, null, token),
    cancelDelivery: (salesId, token)     => request('DELETE',`/counter-pos/sales/delivery/${salesId}`, null, token),
    settleDelivery: (salesId, body, token) => request('POST', `/counter-pos/sales/delivery/${salesId}/settle`, body, token),
    settleDeliveryBulk: (body, token) => request('POST', '/counter-pos/sales/delivery/settle-bulk', body, token),
    getHeldBills:   (token)              => request('GET',   `/counter-pos/sales/held`, null, token),
    recallBill:     (salesId, token)     => request('GET',   `/counter-pos/sales/held/${salesId}`, null, token),
    cancelHold:     (salesId, token)     => request('DELETE',`/counter-pos/sales/held/${salesId}`, null, token),
    groupsList:     (token)              => request('GET',   `/counter-pos/groups`, null, token),

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
    staffWiseReport:   (counterNo, token)         => request('GET',  `/counter-pos/sales/staff-wise?counterNo=${counterNo}`, null, token),
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
    gvtax: (token) => request('GET', '/app-parameters/gvtax', null, token),
  },
};
