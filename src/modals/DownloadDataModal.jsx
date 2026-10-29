import { Download, Settings, Layers, Package, Users, Receipt, Hash } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { setGvTax } from '../lib/gvtax'
import { setAutoRoundOff } from '../lib/posSettings'
import SyncStepsModal from './SyncStepsModal'

/*
 * Download Data — refresh this counter from the server, one step at a time.
 * Settings, groups and the next bill no are reloaded into the POS; products,
 * customers and today's transactions are fetched to confirm they are reachable
 * (the POS always reads those live). Each step shows its own result.
 */
const listOf = (r, key) => (Array.isArray(r) ? r : Array.isArray(r?.[key]) ? r[key] : Array.isArray(r?.data) ? r.data : [])

const STEPS = [
  {
    key: 'settings', label: 'Settings & Tax', icon: Settings,
    run: async (token) => {
      const [tax, pos] = await Promise.all([
        api.appParameters.gvtax(token),
        api.appParameters.posParams(token).catch(() => null),
      ])
      const s = usePosStore.getState()
      setGvTax(tax?.gvtax ?? 5)
      s.setCurrencyPrecision(tax?.currencyPrecision ?? 2)
      setAutoRoundOff(tax?.autoRoundOff ?? 0)
      if (tax?.receiptHeader) s.setReceiptHeader(tax.receiptHeader)
      const p = pos?.parameters ?? pos?.data?.parameters ?? {}
      s.setCustomerDisplayEnabled(Number(p.customer_display_enabled) === 1)
      s.recalc()
      return `VAT ${tax?.gvtax ?? 5}%`
    },
  },
  {
    key: 'groups', label: 'Product Groups', icon: Layers,
    run: async () => {
      await usePosStore.getState().fetchProductGroups()
      const { groupsError, productGroups } = usePosStore.getState()
      if (groupsError) throw new Error(groupsError)
      return `${productGroups.length} groups`
    },
  },
  {
    key: 'products', label: 'Product Details', icon: Package,
    run: async (token) => `${listOf(await api.counterPos.productLookup('', null, token), 'products').length} products`,
  },
  {
    key: 'customers', label: 'Customer Details', icon: Users,
    run: async (token) => `${listOf(await api.counterPos.customerSearch('', 500, token), 'customers').length} customers`,
  },
  {
    key: 'counter', label: 'Daily Counter Transactions', icon: Receipt,
    run: async (token) => {
      const sum = await api.counterPos.counterSummary(usePosStore.getState().counterNo, token)
      return `${Number(sum?.billCount) || 0} bills today`
    },
  },
  {
    key: 'billno', label: 'Next Bill No', icon: Hash,
    run: async (token) => {
      const { billNo } = await api.counterPos.nextBillNo(token)
      usePosStore.getState().setBillNo(String(billNo ?? ''))
      return `Bill ${billNo ?? '—'}`
    },
  },
]

export default function DownloadDataModal({ onClose }) {
  return (
    <SyncStepsModal
      onClose={onClose}
      title="Download from Server"
      icon={Download}
      verb="Downloading"
      doneText="All data is up to date"
      startLabel="Start Download"
      steps={STEPS}
    />
  )
}
