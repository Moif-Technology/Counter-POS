import { useEffect, useRef, useState } from 'react'
import {
  Trash2, Hash, Monitor, Undo2, Search, Pause, FileText, Printer, RotateCw, Tag,
  ChevronLeft, ChevronRight, Package, Percent, ScanBarcode, DollarSign, User, Crown,
  BarChart2, Wallet, Receipt, MessageSquare, Calculator, Scale, Truck, Save, Tv,
} from 'lucide-react'
import { usePosStore } from '../../../store/posStore'

/*
 * Tabs → button pages. `span` is out of 2 columns (Price/Qty Chan share a row).
 * `accent` buttons use the brand colour for icon + label (destructive / mode keys).
 */
const PAGES = {
  'Page 1': [
    { label: 'Clear All',      icon: Trash2,     accent: true },
    { label: 'Clear Line',     icon: Trash2,     accent: true },
    { label: 'Qty',            icon: Hash,       text: '#Qty' },
    { label: 'Groups',         icon: Monitor },
    { label: 'Return',         icon: Undo2,      accent: true, toggle: true },
    { label: 'Product Lookup', icon: Search },
    { label: 'Hold',           icon: Pause },
    { label: 'Recall Hold',    icon: FileText },
    { label: 'Bill Print',     icon: Printer },
    { label: 'Bill Reprint',   icon: Printer },
    { label: 'Repeat',         icon: RotateCw },
    { label: 'Price Change',   icon: Tag, text: 'Price Chan', half: true },
    { label: 'Qty Change',     icon: Tag, text: 'Qty Chan',   half: true, accent: true },
  ],
  'Page 2': [
    { label: 'Sub Total',      icon: Calculator },
    { label: 'Discount',       icon: Percent },
    { label: 'Packet Scan',    icon: Package },
    { label: 'Price Enquiry',  icon: ScanBarcode },
    { label: 'Currency',       icon: DollarSign },
    { label: 'Sales Man',      icon: User },
    { label: 'Privilege',      icon: Crown },
    { label: 'Report',         icon: BarChart2 },
    { label: 'Cash In/Out',    icon: Wallet },
    { label: 'Receipt',        icon: Receipt },
    { label: 'Comments',       icon: MessageSquare },
    { label: 'NP Scale',       icon: Scale },
    { label: 'Cust Display',   icon: Tv, toggle: true },
  ],
  'Delivery': [
    { label: 'Delivery',       icon: Truck },
    { label: 'Save Delivery',  icon: Save },
    { label: 'Settlement',     icon: Receipt },
  ],
}

// Tab strip order (matches the counter layout); "Log Out" acts immediately.
const TABS = ['Page 1', 'Page 2', 'Groups', 'Log Out', 'Delivery']

function ActionButton({ btn, actions }) {
  const Icon = btn.icon
  const active = btn.toggle && actions.isActive(btn.label)
  const busy = btn.label === 'Hold' && actions.holdLoading
  return (
    <button
      className={`ph-fn${btn.accent ? ' is-accent' : ''}${btn.half ? ' is-half' : ''}${active ? ' is-active' : ''}`}
      onClick={() => actions.run(btn.label)}
      disabled={busy}
    >
      <Icon size={btn.half ? 16 : 20} />
      <span>{busy ? 'Holding…' : (btn.text ?? btn.label)}</span>
    </button>
  )
}

function GroupsPage({ actions }) {
  const productGroups      = usePosStore(s => s.productGroups)
  const groupsLoading      = usePosStore(s => s.groupsLoading)
  const accessToken        = usePosStore(s => s.accessToken)
  const fetchProductGroups = usePosStore(s => s.fetchProductGroups)

  useEffect(() => {
    if (accessToken && !productGroups.length) fetchProductGroups()
  }, [accessToken, productGroups.length, fetchProductGroups])

  if (groupsLoading && !productGroups.length) return <div className="ph-fn-empty">Loading groups…</div>
  if (!productGroups.length) return <div className="ph-fn-empty">No product groups</div>

  return productGroups.map(g => (
    <button key={g.groupId} className="ph-fn ph-fn-group" onClick={() => actions.openGroup(g)}>
      <span className="ph-ellipsis">{g.groupDescription}</span>
    </button>
  ))
}

/** Right-hand tabbed function keys (Page 1 / Page 2 / Groups / Log Out / Delivery). */
export default function PosFunctionPanel({ actions }) {
  const [tab, setTab] = useState('Page 1')
  const stripRef = useRef(null)

  const scrollTabs = (dir) => stripRef.current?.scrollBy({ left: dir * 120, behavior: 'smooth' })

  return (
    <div className="ph-card ph-fnpanel">
      <div className="ph-tabs">
        <div className="ph-tabs-strip" ref={stripRef}>
          {TABS.map(t => (
            <button
              key={t}
              className={`ph-tab${tab === t ? ' is-active' : ''}`}
              onClick={() => (t === 'Log Out' ? actions.run('Log Out') : setTab(t))}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="ph-tabs-arrows">
          <button onClick={() => scrollTabs(-1)} aria-label="Previous tabs"><ChevronLeft size={12} /></button>
          <button onClick={() => scrollTabs(1)} aria-label="More tabs"><ChevronRight size={12} /></button>
        </div>
      </div>

      <div className="ph-fn-grid">
        {tab === 'Groups'
          ? <GroupsPage actions={actions} />
          : PAGES[tab].map(btn => <ActionButton key={btn.label} btn={btn} actions={actions} />)}
      </div>
    </div>
  )
}
