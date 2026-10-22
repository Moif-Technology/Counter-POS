import { useEffect, useRef, useState } from 'react'
import {
  Trash2, Hash, Monitor, Undo2, Search, Pause, FileText, Printer, RotateCw, Tag,
  ChevronLeft, ChevronRight, Package, ScanBarcode, BarChart2, Wallet, Receipt,
  MessageSquare, Truck, Save, CircleDollarSign, Lock, Ban, User, TrendingUp,
  LogOut, Power, FilePlus,
} from 'lucide-react'
import { usePosStore } from '../../../store/posStore'

/*
 * Tab → buttons. `cols` is the grid width for that tab; `half` buttons take
 * one cell of a 2-up row (Page 1: Price Chan / Qty Chan share a row).
 * `accent` buttons use the brand colour (destructive / session keys).
 */
const TABS = [
  {
    key: 'Page 1', cols: 2,
    buttons: [
      { label: 'Clear All',      icon: Trash2,  accent: true },
      { label: 'Clear Line',     icon: Trash2,  accent: true },
      { label: 'Qty',            icon: Hash,    text: 'Qty' },
      { label: 'Groups',         icon: Monitor },
      { label: 'Return',         icon: Undo2,   accent: true, toggle: true },
      { label: 'Product Lookup', icon: Search },
      { label: 'Hold',           icon: Pause },
      { label: 'Recall Hold',    icon: FileText },
      { label: 'Bill Print',     icon: Printer },
      { label: 'Bill Reprint',   icon: Printer },
      { label: 'Repeat',         icon: RotateCw },
      { label: 'Price Change',   icon: Tag, text: 'Price Chan', half: true },
      { label: 'Qty Change',     icon: Tag, text: 'Qty Chan',   half: true, accent: true },
    ],
  },
  {
    key: 'Page 2', cols: 3,
    buttons: [
      { label: 'Privilege',     icon: User,         text: 'Privilege Customer' },
      { label: 'Price Enquiry', icon: Search },
      { label: 'Packet Scan',   icon: ScanBarcode },
      { label: 'Cash In/Out',   icon: Wallet,       text: 'CashIn / CashOut' },
      { label: 'Comments',      icon: MessageSquare },
      { label: 'Currency',      icon: CircleDollarSign },
      { label: 'Sub Total',     icon: Hash,         text: 'SubTotal' },
      { label: 'Report',        icon: BarChart2 },
      { label: 'Discount',      icon: Tag,          text: 'Disc' },
      { label: 'Lock',          icon: Lock },
      { label: 'Receipt',       icon: Receipt },
      { label: 'No Sale',       icon: Ban },
      { label: 'Sales Man',     icon: User },
      { label: 'Top Move',      icon: TrendingUp },
      // Shown only when the customer display feature is enabled (as before)
      { label: 'Cust Display',  icon: Monitor,      toggle: true, onlyIf: 'customerDisplayEnabled' },
    ],
  },
  { key: 'Groups', cols: 3 },   // product group buttons
  {
    key: 'Log Out', cols: 2,
    buttons: [
      { label: 'Log Out', icon: LogOut, accent: true },
      { label: 'Exit',    icon: Power,  accent: true },
      { label: 'Add New', icon: FilePlus },
    ],
  },
  {
    key: 'Delivery', cols: 3,
    buttons: [
      { label: 'Delivery',      icon: Truck },
      { label: 'Save Delivery', icon: Save },
      { label: 'Settlement',    icon: Package, text: 'Delivery Settlement' },
    ],
  },
]

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
      <span>{g.groupDescription}</span>
    </button>
  ))
}

/** Tabbed function keys: Page 1 / Page 2 / Groups / Log Out / Delivery. */
export default function PosFunctionPanel({ actions }) {
  const [tabKey, setTabKey] = useState('Page 1')
  const customerDisplayEnabled = usePosStore(s => s.customerDisplayEnabled)
  const flags = { customerDisplayEnabled }
  const stripRef = useRef(null)
  const tab = TABS.find(t => t.key === tabKey)

  const scrollTabs = (dir) => stripRef.current?.scrollBy({ left: dir * 120, behavior: 'smooth' })

  return (
    <div className="ph-card ph-fnpanel">
      <div className="ph-tabs">
        <div className="ph-tabs-strip" ref={stripRef}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`ph-tab${tabKey === t.key ? ' is-active' : ''}`}
              onClick={() => setTabKey(t.key)}
            >
              {t.key}
            </button>
          ))}
        </div>
        <div className="ph-tabs-arrows">
          <button onClick={() => scrollTabs(-1)} aria-label="Previous tabs"><ChevronLeft size={12} /></button>
          <button onClick={() => scrollTabs(1)} aria-label="More tabs"><ChevronRight size={12} /></button>
        </div>
      </div>

      <div className={`ph-fn-grid cols-${tab.cols}${tabKey === 'Groups' ? ' is-groups' : ''}`} style={{ '--cols': tab.cols }}>
        {tabKey === 'Groups'
          ? <GroupsPage actions={actions} />
          : tab.buttons.filter(btn => !btn.onlyIf || flags[btn.onlyIf]).map(btn => <ActionButton key={btn.label} btn={btn} actions={actions} />)}
      </div>
    </div>
  )
}
