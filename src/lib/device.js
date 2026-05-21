const KEY = 'moif_pos_device';
const TOKEN_KEY = 'moif_pos_token';
const REFRESH_KEY = 'moif_pos_refresh';

export function getEnrollment() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveEnrollment(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearEnrollment() {
  localStorage.removeItem(KEY);
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) ?? null;
}

export function saveTokens(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) ?? null;
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Generate a stable device token from browser fingerprint. */
export function getOrCreateDeviceToken() {
  const existing = localStorage.getItem('moif_device_token');
  if (existing) return existing;
  const token = `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem('moif_device_token', token);
  return token;
}
