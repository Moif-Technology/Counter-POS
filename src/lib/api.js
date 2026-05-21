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
    customerSearch: (q, limit, token)    => request('GET',  `/counter-pos/customers/search?q=${encodeURIComponent(q ?? '')}&limit=${limit ?? 30}`, null, token),
    nextBillNo:     (token)              => request('GET',   `/counter-pos/sales/next-bill-no`, null, token),
    saveBill:       (body, token)        => request('POST',  `/counter-pos/sales/save`, body, token),
    holdBill:       (body, token)        => request('POST',  `/counter-pos/sales/hold`, body, token),
    getHeldBills:   (token)              => request('GET',   `/counter-pos/sales/held`, null, token),
    recallBill:     (salesId, token)     => request('GET',   `/counter-pos/sales/held/${salesId}`, null, token),
    cancelHold:     (salesId, token)     => request('DELETE',`/counter-pos/sales/held/${salesId}`, null, token),
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
};
