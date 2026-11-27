/* global __APP_VERSION__ */
/**
 * Installed-app update check (Windows exe / Android APK). The server side is two static files in
 * api/updates/counter-pos/ (installer + manifest.json), see components/common/UpdateNotice.jsx.
 */
import { Capacitor } from '@capacitor/core'

/** package.json "version", baked in by vite.config.js. Bump it every release. */
export const APP_VERSION = __APP_VERSION__

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
export const UPDATES_DIR = `${API_BASE.replace(/\/api\/?$/, '')}/updates/counter-pos/`

/** 'windows' | 'android' | null (web till: always current, never checks). */
export function updatePlatform() {
  if (window.posDesktop?.isDesktop) return 'windows'
  if (Capacitor.isNativePlatform()) return 'android'
  return null
}

/** -1 / 0 / 1 for dotted numeric versions ("1.2.10" > "1.2.9"). */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d) return d > 0 ? 1 : -1
  }
  return 0
}

let onFound = null
/** UpdateNotice registers here so a check from anywhere (e.g. Reports) opens its card. */
export function onUpdateFound(fn) {
  onFound = fn
  return () => { if (onFound === fn) onFound = null }
}

/**
 * Read the manifest. Newer build → tells UpdateNotice (manual = show even if "Later" was pressed).
 * @returns {Promise<{status: 'update'|'latest'|'unsupported', version?: string}>} throws when unreachable
 */
export async function checkForUpdate({ manual = false } = {}) {
  const platform = updatePlatform()
  if (!platform) return { status: 'unsupported' }
  const res = await fetch(`${UPDATES_DIR}manifest.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Update server returned ${res.status}`)
  const rel = (await res.json())?.[platform]
  if (rel?.latestVersion && compareVersions(rel.latestVersion, APP_VERSION) > 0) {
    onFound?.(rel, manual)
    return { status: 'update', version: rel.latestVersion }
  }
  return { status: 'latest', version: APP_VERSION }
}
