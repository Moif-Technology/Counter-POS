import { useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck, Search, Save, Loader2, Tag, Crown, ScanBarcode, PackageSearch, Repeat, Percent,
  PauseCircle, RotateCcw, Undo2, Ban, Printer, BarChart2, Receipt, UserRound, FileText, Trash2, ArrowLeftRight,
} from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { posNotifySuccess } from '../lib/posNotify'
import Modal from '../components/common/Modal'
import './PrivilegeSettingsModal.css'

/*
 * Privilege Settings — pick a staff member, then switch each feature on or off
 * for the Counter Page and the Main Page. Search, per-page "Allow all / Block all".
 *
 *   loadFn()          → { [staffId]: { counter: { key: bool }, main: { key: bool } } }
 *   saveFn(staffId, privileges) → saves one staff member
 * Without them the settings are kept on this counter (localStorage).
 */
const FEATURES = [
  { key: 'priceChange',       label: 'Price Change',       icon: Tag },
  { key: 'privilegeCustomer', label: 'Privilege Customer', icon: Crown },
  { key: 'packetScan',        label: 'Packet Scan',        icon: ScanBarcode },
  { key: 'productLookup',     label: 'Product Lookup',     icon: PackageSearch },
  { key: 'repeat',            label: 'Repeat',             icon: Repeat },
  { key: 'discount',          label: 'Discount',           icon: Percent },
  { key: 'hold',              label: 'Hold',               icon: PauseCircle },
  { key: 'holdRecall',        label: 'Hold Recall',        icon: RotateCcw },
  { key: 'return',            label: 'Return',             icon: Undo2 },
  { key: 'noSale',            label: 'No Sale',            icon: Ban },
  { key: 'billReprint',       label: 'Bill Reprint',       icon: Printer },
  { key: 'report',            label: 'Report',             icon: BarChart2 },
  { key: 'receipt',           label: 'Receipt',            icon: Receipt },
  { key: 'salesMan',          label: 'Sales Man',          icon: UserRound },
  { key: 'billPrint',         label: 'Bill Print',         icon: FileText },
  { key: 'clearAll',          label: 'Clear All',          icon: Trash2 },
  { key: 'cashInOut',         label: 'Cash In / Cash Out', icon: ArrowLeftRight, pages: ['counter'] },
]
const PAGES = [
  { key: 'counter', label: 'Counter Page' },
  { key: 'main',    label: 'Main Page' },
]
const onPage = (f, page) => !f.pages || f.pages.includes(page)
const TOTAL = FEATURES.reduce((n, f) => n + PAGES.filter(p => onPage(f, p.key)).length, 0)

const LS_KEY = 'pos.privileges'
const localLoad = async () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } }
const localSave = async (staffId, priv) => {
  const all = await localLoad()
  localStorage.setItem(LS_KEY, JSON.stringify({ ...all, [staffId]: priv }))
}

const staffOf = r => (Array.isArray(r) ? r : r?.members ?? r?.staff ?? r?.data ?? [])
  .map(s => ({ id: String(s.staffId ?? s.id ?? s.staff_id), name: s.staffName ?? s.name ?? s.staff_name ?? '—', role: s.roleName ?? s.role_name ?? s.role ?? '' }))
  .filter(s => s.id !== 'undefined')
const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const emptyPriv = () => ({ counter: {}, main: {} })

export default function PrivilegeSettingsModal({ onClose, loadFn = null, saveFn = null }) {
  const accessToken = usePosStore(s => s.accessToken)
  const cashier     = usePosStore(s => s.cashier)
  const [staff, setStaff]     = useState(null)        // null = loading
  const [all, setAll]         = useState({})          // saved privileges by staffId
  const [userId, setUserId]   = useState(null)
  const [draft, setDraft]     = useState(emptyPriv)
  const [query, setQuery]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let alive = true
    const self = cashier ? [{ id: String(cashier.staffId), name: cashier.staffName ?? 'Cashier', role: cashier.roleName ?? '' }] : []
    Promise.all([
      api.staff.list(accessToken).then(staffOf).catch(() => []),
      (loadFn ?? localLoad)().catch(e => { setError(e.message); return {} }),
    ]).then(([list, saved]) => {
      if (!alive) return
      const people = list.length ? list : self
      setStaff(people)
      setAll(saved ?? {})
      const first = people[0]?.id ?? null
      setUserId(first)
      setDraft(first && saved?.[first] ? saved[first] : emptyPriv())
    })
    return () => { alive = false }
  }, [accessToken, cashier, loadFn])

  const pickUser = id => { setUserId(id); setDraft(all[id] ?? emptyPriv()) }
  const isOn = (page, key) => !!draft[page]?.[key]
  const toggle = (page, key) => setDraft(d => ({ ...d, [page]: { ...d[page], [key]: !d[page]?.[key] } }))
  const setPage = (page, value) => setDraft(d => ({
    ...d, [page]: Object.fromEntries(FEATURES.filter(f => onPage(f, page)).map(f => [f.key, value])),
  }))

  const allowed = PAGES.reduce((n, p) => n + FEATURES.filter(f => onPage(f, p.key) && isOn(p.key, f.key)).length, 0)
  const dirty = JSON.stringify(draft) !== JSON.stringify(all[userId] ?? emptyPriv())
  const shown = useMemo(() => FEATURES.filter(f => f.label.toLowerCase().includes(query.trim().toLowerCase())), [query])
  const user = staff?.find(s => s.id === userId)

  async function handleSave() {
    if (!userId || saving) return
    setSaving(true)
    setError(null)
    try {
      await (saveFn ?? localSave)(userId, draft)
      setAll(a => ({ ...a, [userId]: draft }))
      posNotifySuccess(`Privileges saved for ${user?.name ?? 'staff'}`, { title: 'Privilege Settings' })
    } catch (e) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} icon={ShieldCheck} kicker="Settings" title="Privilege Settings" width={980} maxHeight="94vh" zIndex={1100}>
      {error && <div className="pv-error">{error}</div>}

      <div className="pv">
        {/* Staff */}
        <aside className="pv-staff">
          <h4>Staff</h4>
          {staff === null && <div className="pv-empty"><Loader2 size={18} className="pv-spin" /> Loading…</div>}
          {staff?.length === 0 && <div className="pv-empty">No staff found</div>}
          {staff?.map(s => {
            const saved = all[s.id]
            const count = saved ? PAGES.reduce((n, p) => n + Object.values(saved[p.key] ?? {}).filter(Boolean).length, 0) : 0
            return (
              <button key={s.id} type="button" className={`pv-user${s.id === userId ? ' is-on' : ''}`} onClick={() => pickUser(s.id)}>
                <span className="pv-avatar">{initials(s.name)}</span>
                <span className="pv-user-text">
                  <b>{s.name}</b>
                  <small>{s.role || 'Staff'} · {count}/{TOTAL} allowed</small>
                </span>
              </button>
            )
          })}
        </aside>

        {/* Features */}
        <section className="pv-main">
          <div className="pv-top">
            <div className="pv-who">
              <b>{user?.name ?? '—'}</b>
              <span className="pv-count"><i style={{ width: `${(allowed / TOTAL) * 100}%` }} />{allowed} of {TOTAL} allowed</span>
            </div>
            <label className="pv-search">
              <Search size={15} />
              <input data-system-keyboard value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a feature" />
            </label>
          </div>

          <div className="pv-table">
            <div className="pv-head">
              <span>Feature</span>
              {PAGES.map(p => (
                <span key={p.key} className="pv-col">
                  {p.label}
                  <span className="pv-bulk">
                    <button type="button" onClick={() => setPage(p.key, true)}>All</button>
                    <button type="button" onClick={() => setPage(p.key, false)}>None</button>
                  </span>
                </span>
              ))}
            </div>
            <div className="pv-rows">
              {shown.map(f => {
                const Icon = f.icon
                return (
                  <div key={f.key} className="pv-row">
                    <span className="pv-feat"><span className="pv-ico"><Icon size={16} /></span>{f.label}</span>
                    {PAGES.map(p => (
                      <span key={p.key} className="pv-col">
                        {onPage(f, p.key) ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isOn(p.key, f.key)}
                            aria-label={`${f.label} — ${p.label}`}
                            className={`pv-switch${isOn(p.key, f.key) ? ' is-on' : ''}`}
                            onClick={() => toggle(p.key, f.key)}
                          ><i /></button>
                        ) : <span className="pv-na">—</span>}
                      </span>
                    ))}
                  </div>
                )
              })}
              {shown.length === 0 && <div className="pv-empty">No feature matches “{query}”</div>}
            </div>
          </div>
        </section>
      </div>

      <div className="pv-foot">
        {dirty && <span className="pv-dirty">Unsaved changes</span>}
        <button type="button" className="pv-close" onClick={onClose}>Close</button>
        <button type="button" className="pv-save" onClick={handleSave} disabled={!userId || saving || !dirty}>
          {saving ? <Loader2 size={16} className="pv-spin" /> : <Save size={16} />} {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}
