import { useState } from 'react'
import { RefreshCw, CloudOff, Cloud, Package, X } from 'lucide-react'
import { useOfflineStore } from '../../lib/offlineCache'
import { syncNow, refreshProducts, retryFailedBill, pingServer } from '../../lib/offlineSync'
import { fmtMoney } from '../../lib/currencyFormat'
import { posNotifyError, posNotifySuccess, posNotifyWarning } from '../../lib/posNotify'

const fmtTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
const fmtDateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const panelBtn = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '9px 0', borderRadius: 8, border: '1.5px solid var(--brand-border)',
  background: 'var(--brand-bg)', color: 'var(--brand)', fontSize: 12, fontWeight: 800, cursor: 'pointer',
}
const sectionTitle = { fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.6, margin: '12px 0 6px' }
const rowStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
  padding: '6px 8px', borderRadius: 6, background: 'var(--surface-2)', marginBottom: 4, fontSize: 11.5,
}

/** Header button: Online/Offline dot + pending bills + last sync; click opens the sync panel. */
export default function SyncStatusButton() {
  const online      = useOfflineStore(s => s.online)
  const pending     = useOfflineStore(s => s.pending)
  const failed      = useOfflineStore(s => s.failed)
  const synced      = useOfflineStore(s => s.synced)
  const syncing     = useOfflineStore(s => s.syncing)
  const lastSyncAt  = useOfflineStore(s => s.lastSyncAt)
  const productsAt  = useOfflineStore(s => s.productsAt)
  const productCount = useOfflineStore(s => s.productCount)
  const needsLogin  = useOfflineStore(s => s.needsLogin)
  const lastError   = useOfflineStore(s => s.lastError)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null) // 'sync' | 'products' | null

  const waiting = pending.length + failed.length
  const dot = !online ? '#ef4444' : (waiting ? '#f59e0b' : '#22c55e')

  const doSync = async () => {
    setBusy('sync')
    try {
      if (!(await pingServer())) { posNotifyWarning('Server not reachable — bills stay queued', { title: 'Sync' }); return }
      const n = await syncNow()
      if (n) posNotifySuccess(`${n} offline bill${n > 1 ? 's' : ''} uploaded`, { title: 'Sync', duration: 1200 })
    } catch (err) {
      posNotifyError(err.message ?? 'Sync failed', { title: 'Sync' })
    } finally {
      setBusy(null)
    }
  }

  const doProducts = async () => {
    setBusy('products')
    try {
      await refreshProducts()
      posNotifySuccess(`Product list updated (${useOfflineStore.getState().productCount})`, { title: 'Products', duration: 1200 })
    } catch (err) {
      posNotifyError(err.message ?? 'Product refresh failed', { title: 'Products' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ position: 'relative' }} data-pos-overlay>
      <button
        onClick={() => setOpen(o => !o)}
        title={`${online ? 'Online' : 'Offline'} · ${pending.length} pending · last sync ${fmtTime(lastSyncAt)}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, height: 32,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 7, padding: '0 10px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 0 2px ${dot}44` }} />
        {online ? 'Online' : 'Offline'}
        {waiting > 0 && (
          <span style={{
            background: failed.length ? '#ef4444' : '#f59e0b', color: '#fff', borderRadius: 99,
            fontSize: 9.5, fontWeight: 800, minWidth: 16, height: 16, padding: '0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{waiting}</span>
        )}
        <span className="header-hide-md" style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
          {syncing ? 'Syncing…' : fmtTime(lastSyncAt)}
        </span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 900 }} />
          <div style={{
            position: 'absolute', top: 38, right: 0, zIndex: 901, width: 340, maxHeight: '70vh', overflowY: 'auto',
            background: 'var(--surface, #fff)', color: 'var(--text-1)', borderRadius: 12,
            border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.22)', padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {online ? <Cloud size={16} color="#16a34a" /> : <CloudOff size={16} color="#dc2626" />}
              <span style={{ fontSize: 14, fontWeight: 800, flex: 1 }}>{online ? 'Online' : 'Offline — saving bills locally'}</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.6 }}>
              Last sync: <b>{fmtDateTime(lastSyncAt)}</b><br />
              Products cached: <b>{productCount}</b> ({fmtDateTime(productsAt)})
            </div>
            {needsLogin && (
              <div style={{ marginTop: 8, padding: '7px 9px', borderRadius: 7, background: '#fef2f2', color: '#b91c1c', fontSize: 11.5, fontWeight: 700 }}>
                Session expired — log out and log in again to upload queued bills. Offline billing still works.
              </div>
            )}
            {lastError && !needsLogin && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#b45309' }}>Last sync error: {lastError}</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={panelBtn} disabled={!!busy} onClick={doSync}>
                <RefreshCw size={13} /> {busy === 'sync' ? 'Syncing…' : 'Sync now'}
              </button>
              <button style={panelBtn} disabled={!!busy} onClick={doProducts}>
                <Package size={13} /> {busy === 'products' ? 'Loading…' : 'Refresh products'}
              </button>
            </div>

            <div style={sectionTitle}>PENDING ({pending.length})</div>
            {!pending.length && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>No bills waiting.</div>}
            {pending.map(b => (
              <div key={b.clientUuid} style={rowStyle}>
                <span style={{ fontWeight: 800 }}>{b.offlineBillNo}</span>
                <span style={{ color: 'var(--text-3)' }}>{fmtTime(b.createdAt)} · {b.staffName}</span>
                <span style={{ fontWeight: 700 }}>{fmtMoney(b.netAmount)}</span>
              </div>
            ))}

            {failed.length > 0 && (
              <>
                <div style={{ ...sectionTitle, color: '#b91c1c' }}>FAILED ({failed.length})</div>
                {failed.map(b => (
                  <div key={b.clientUuid} style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch', background: '#fef2f2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800 }}>{b.offlineBillNo} · {fmtMoney(b.netAmount)}</span>
                      <button
                        onClick={() => retryFailedBill(b.clientUuid).catch(e => posNotifyError(e.message, { title: 'Sync' }))}
                        style={{ border: 'none', background: 'none', color: 'var(--brand)', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
                      >Retry</button>
                    </div>
                    <span style={{ color: '#b91c1c', fontSize: 11 }}>{b.error}</span>
                  </div>
                ))}
              </>
            )}

            {synced.length > 0 && (
              <>
                <div style={sectionTitle}>RECENTLY SYNCED</div>
                {synced.slice(0, 8).map(s => (
                  <div key={`${s.offlineBillNo}-${s.at}`} style={rowStyle}>
                    <span>{s.offlineBillNo}</span>
                    <span style={{ fontWeight: 800 }}>→ {s.billNoDisplay}</span>
                    <span style={{ color: 'var(--text-3)' }}>{fmtTime(s.at)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
