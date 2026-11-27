// In-app update download for the Windows build. The app fetches the installer itself instead of
// sending the cashier to the browser: no "not safe to download" browser block, and a file written
// by Node carries no Mark-of-the-Web, so SmartScreen does not stop it either.
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

// Only our own update folder: a compromised page must not get the app to run some other exe.
const UPDATE_BASE = 'https://api.moifone.com/updates/counter-pos/'

/** Download the installer, check its sha256 from manifest.json, return the local file path. */
async function downloadInstaller(url, sha256, dir) {
  const u = String(url || '')
  const want = String(sha256 || '').toLowerCase()
  if (!u.startsWith(UPDATE_BASE) || !/^[\w.-]+\.exe$/.test(u.slice(UPDATE_BASE.length))) throw new Error('Bad update URL')
  if (!/^[0-9a-f]{64}$/.test(want)) throw new Error('Update has no sha256 in manifest')
  const res = await fetch(u, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  const got = crypto.createHash('sha256').update(buf).digest('hex')
  if (got !== want) throw new Error('Downloaded file is corrupt (checksum mismatch)')
  const file = path.join(dir, path.basename(new URL(u).pathname))
  fs.writeFileSync(file, buf)
  return file
}

module.exports = { downloadInstaller, UPDATE_BASE }
