import { useEffect, useState } from 'react'
import {
  Trash2, Hash, Monitor, Undo2, Search, Pause, FileText, Printer, RotateCw, Tag,
  Package, ScanBarcode, BarChart2, Wallet, Receipt,
  MessageSquare, Truck, Save, CircleDollarSign, Lock, Ban, User, TrendingUp,
  LogOut, Power, FilePlus,
} from 'lucide-react'
import { usePosStore } from '../../../store/posStore'

/*
 * Tab → buttons, shown as equal boxes (3 across).
 * `accent` buttons use the brand colour (destructive / session keys).
 */
const TABS = [
  {
    key: 'Page 1',
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
      { label: 'Price Change',   icon: Tag },
      { label: 'Qty Change',     icon: Tag, text: 'Qty Chan' },
    ],
  },
  {
    key: 'Page 2',
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
  { key: 'Groups' },   // product group buttons
  {
    key: 'Log Out',
    buttons: [
      { label: 'Log Out', icon: LogOut, accent: true },
      { label: 'Exit',    icon: Power,  accent: true },
      { label: 'Add New', icon: FilePlus },
    ],
  },
  {
    key: 'Delivery',
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
      className={`ph-fn${btn.accent ? ' is-accent' : ''}${active ? ' is-active' : ''}`}
      onClick={() => actions.run(btn.label)}
      disabled={busy}
    >
      <Icon size={24} strokeWidth={1.8} />
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
  const tab = TABS.find(t => t.key === tabKey)

  return (
    <div className="ph-card ph-fnpanel">
      <div className="ph-tabs">
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

      <div className={`ph-fn-grid${tabKey === 'Groups' ? ' is-groups' : ''}`}>
        {tabKey === 'Groups'
          ? <GroupsPage actions={actions} />
          : tab.buttons.filter(btn => !btn.onlyIf || flags[btn.onlyIf]).map(btn => <ActionButton key={btn.label} btn={btn} actions={actions} />)}
      </div>
    </div>
  )
}
