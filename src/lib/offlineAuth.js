/**
 * Offline PIN login. After every online login the staff's PIN is kept as a salted
 * PBKDF2 verifier with the session it opened; with no server, the same PIN on the same
 * device reopens that session for OFFLINE_LOGIN_DAYS after the last online login.
 * The session's server tokens are AES-GCM encrypted with a second key from the same
 * PBKDF2 run, so the stored cache is useless without the PIN. Wrong PINs back off.
 * ponytail: a 4–6 digit PIN can still be brute-forced offline by someone who copies the
 * storage; the 2-day expiry + 8h token bound the damage. Upgrade path: DPAPI / Keystore key.
 */

const KEY = 'moif_pos_offline_logins'
const LOCK_KEY = 'moif_pos_offline_login_lock'
export const OFFLINE_LOGIN_DAYS = 2
const MAX_AGE_MS = OFFLINE_LOGIN_DAYS * 24 * 60 * 60 * 1000
const ITERATIONS = 150000
const FREE_ATTEMPTS = 5

const toHex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map(h => parseInt(h, 16)))

/** 512 PBKDF2 bits: first half = stored verifier, second half = token key (never stored). */
async function derive(pin, saltHex) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: ITERATIONS }, base, 512,
  ))
  const key = await crypto.subtle.importKey('raw', bits.slice(32), 'AES-GCM', false, ['encrypt', 'decrypt'])
  return { verifier: toHex(bits.slice(0, 32)), key }
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage blocked */ }
}

/** Online login succeeded: remember PIN verifier + encrypted session for offline use. */
export async function rememberLogin(pin, { accessToken, refreshToken, ...entry }) {
  if (!globalThis.crypto?.subtle) return
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const { verifier, key } = await derive(pin, salt)
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ accessToken, refreshToken })),
  )
  const all = read(KEY, {})
  all[`${entry.companyId}:${entry.cashier.staffId}`] = {
    ...entry, salt, verifier, iv: toHex(iv), tokens: toHex(sealed), verifiedAt: new Date().toISOString(),
  }
  write(KEY, all)
  write(LOCK_KEY, { fails: 0, until: 0 })
}

/**
 * Server unreachable: match the PIN against cached logins for this company.
 * Returns the session (tokens decrypted), or throws with a reason the cashier can act on.
 */
export async function offlineLogin(pin, companyId) {
  if (!globalThis.crypto?.subtle) throw new Error('Offline login is not supported on this device')
  const lock = read(LOCK_KEY, { fails: 0, until: 0 })
  if (Date.now() < lock.until) {
    throw new Error(`Too many wrong PINs — try again in ${Math.ceil((lock.until - Date.now()) / 1000)}s`)
  }
  const now = Date.now()
  for (const e of Object.values(read(KEY, {}))) {
    if (Number(e.companyId) !== Number(companyId) || !e.verifier) continue
    const { verifier, key } = await derive(pin, e.salt)
    if (verifier !== e.verifier) continue
    write(LOCK_KEY, { fails: 0, until: 0 })
    if (now - new Date(e.verifiedAt).getTime() > MAX_AGE_MS) {
      throw new Error(`Offline login expired — ${e.cashier.staffName} must log in once with internet (allowed ${OFFLINE_LOGIN_DAYS} days offline)`)
    }
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromHex(e.iv) }, key, fromHex(e.tokens))
    const session = { ...e }
    for (const k of ['tokens', 'iv', 'verifier', 'salt']) delete session[k]
    return { ...session, ...JSON.parse(new TextDecoder().decode(plain)) }
  }
  // Wrong PIN: after FREE_ATTEMPTS, wait 30s, 60s, 120s … (max 15 min) between tries.
  const fails = lock.fails + 1
  const wait = fails > FREE_ATTEMPTS ? Math.min(30000 * 2 ** (fails - FREE_ATTEMPTS - 1), 900000) : 0
  write(LOCK_KEY, { fails, until: now + wait })
  throw new Error('No connection — offline login works only for staff who signed in on this terminal with internet in the last 2 days')
}
