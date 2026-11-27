/**
 * UpdateNotice — tells an installed till (Windows exe / Android APK) that a newer build is out.
 *
 * The installed app carries its own copy of dist/, so a code change only reaches a till after a
 * new build is installed there. To announce one: upload the build to api/updates/counter-pos/ on
 * the server and bump the matching block in manifest.json there (no app or API code change):
 *
 *   {
 *     "windows": { "latestVersion": "1.0.2", "minSupportedVersion": "1.0.0", "isRequired": false,
 *                  "releaseNotes": "- Fix A\n- Fix B", "file": "Counter-POS-Setup-1.0.2.exe" },
 *     "android": { ...same, "file": "counter-pos-1.0.2.apk" }
 *   }
 *
 * The running version is package.json "version" (baked in by vite.config.js) — bump it every release.
 * The web till (vendo.moifone.com) is always current, so it never checks.
 * Same mechanism as Deyno_Pro/src/components/common/UpdateNotice.tsx. Reports → "Check for updates"
 * runs the same check by hand (lib/appUpdate.js).
 */
import { useEffect, useState } from 'react'
import { Download, Sparkles, X } from 'lucide-react'
import { APP_VERSION, UPDATES_DIR, checkForUpdate, compareVersions, onUpdateFound, updatePlatform } from '../../lib/appUpdate'
import { posNotifyError } from '../../lib/posNotify'
import './UpdateNotice.css'

// ponytail: poll every 10 min (tiny manifest GET) so an all-day till hears about a release quickly.
// Baked into the build: changing it only reaches tills with the next installed version.
const CHECK_EVERY_MS = 10 * 60 * 1000

export default function UpdateNotice() {
  const [release, setRelease] = useState(null)
  const [dismissed, setDismissed] = useState('')
  const [busy, setBusy] = useState(false)
  const platform = updatePlatform()
  // The customer-facing second screen runs the same app: never show it there.
  const enabled = !!platform && !window.location.pathname.startsWith('/customer-display')

  useEffect(() => {
    if (!enabled) return undefined
    const off = onUpdateFound((rel, manual) => {
      setRelease(rel)
      if (manual) setDismissed('') // asked by hand: show it again even after "Later"
    })
    const check = () => checkForUpdate().catch(() => {}) // offline or no manifest yet: stay quiet
    check()
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => { off(); clearInterval(timer) }
  }, [enabled])

  if (!enabled || !release || dismissed === release.latestVersion) return null

  const required = !!release.isRequired
    || (!!release.minSupportedVersion && compareVersions(APP_VERSION, release.minSupportedVersion) < 0)
  const notes = String(release.releaseNotes || '')
    .split('\n')
    .map(line => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean)

  const install = async () => {
    if (!release.file || busy) return
    const url = new URL(UPDATES_DIR + release.file, window.location.href).href
    // Android: an off-app URL goes to the system (APK installer).
    if (platform === 'android') { window.location.href = url; return }
    // Windows 1.0.5+: the app downloads, checks sha256, quits and upgrades in place (main.cjs).
    if (window.posDesktop?.installUpdate && release.sha256) {
      setBusy(true)
      try {
        await window.posDesktop.installUpdate(url, release.sha256)
        return // app is closing; installer reopens it
      } catch (e) {
        setBusy(false)
        if (/cancelled/i.test(e?.message ?? '')) return
        posNotifyError(`${e?.message ?? 'Update failed'} — opening browser download`, { title: 'Update' })
      }
    }
    // Fallback: main.cjs sends window.open(https) to the default browser, which downloads the exe.
    window.open(url, '_blank')
  }

  return (
    <div className="upd-overlay" role="presentation">
      <div className="upd-box" role="dialog" aria-modal="true" aria-labelledby="upd-title">
        {!required && (
          <button type="button" className="upd-x" onClick={() => setDismissed(release.latestVersion)} aria-label="Close">
            <X size={16} />
          </button>
        )}
        <div className="upd-head">
          <span className="upd-icon" aria-hidden="true"><Sparkles size={22} /></span>
          <div>
            <h2 id="upd-title" className="upd-title">{required ? 'Update required' : 'New update available'}</h2>
            <p className="upd-ver">Version {release.latestVersion} · you have {APP_VERSION}</p>
          </div>
        </div>
        {notes.length > 0 && (
          <>
            <p className="upd-kicker">What&rsquo;s new</p>
            <ul className="upd-notes">
              {notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </>
        )}
        <div className="upd-actions">
          {!required && (
            <button type="button" className="upd-btn" onClick={() => setDismissed(release.latestVersion)}>Later</button>
          )}
          {release.file && (
            <button type="button" className="upd-btn is-primary" autoFocus onClick={install} disabled={busy}>
              <Download size={16} /> {busy ? 'Downloading… (POS restarts after)' : 'Download & install'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
