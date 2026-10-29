import { Upload, Wifi, Receipt, PauseCircle, Truck, ArrowLeftRight, Lock } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import SyncStepsModal from './SyncStepsModal'

/*
 * Upload To Server — this counter saves every bill, hold, delivery, cash in/out
 * and counter close to the server as it happens, so there is no local queue to
 * send. Each step checks the server for this counter's data and shows what is
 * there, so the cashier can see everything has reached the server.
 */
const listOf = (r, key) => (Array.isArray(r) ? r : Array.isArray(r?.[key]) ? r[key] : Array.isArray(r?.data) ? r.data : [])
const counterNo = () => usePosStore.getState().counterNo

const STEPS = [
  {
    key: 'connection', label: 'Server Connection', icon: Wifi,
    run: async (token) => { await api.counterPos.nextBillNo(token); return 'Connected' },
  },
  {
    key: 'sales', label: 'Sales Details', icon: Receipt,
    run: async (token) => {
      const sum = await api.counterPos.counterSummary(counterNo(), token)
      return `${Number(sum?.billCount) || 0} bills · ${fmtMoney(sum?.grossAmount ?? 0)}`
    },
  },
  {
    key: 'held', label: 'Held Bills (Pending)', icon: PauseCircle,
    run: async (token) => `${listOf(await api.counterPos.getHeldBills(token), 'bills').length} held`,
  },
  {
    key: 'delivery', label: 'Delivery Bills', icon: Truck,
    run: async (token) => `${listOf(await api.counterPos.getDeliveryBills(token), 'bills').length} open`,
  },
  {
    key: 'cash', label: 'Cash In / Out', icon: ArrowLeftRight,
    run: async (token) => `${listOf(await api.counterPos.getCashInOut(counterNo(), token), 'entries').length} entries`,
  },
  {
    key: 'close', label: 'Counter Close Details', icon: Lock,
    run: async (token) => {
      const last = listOf(await api.counterPos.counterHistory({ counterNo: counterNo(), limit: 1 }, token), 'closes')[0]
      return last ? `Last close ${last.closeNo ?? `#${last.closeId}`}` : 'No closes yet'
    },
  },
]

export default function UploadDataModal({ onClose }) {
  return (
    <SyncStepsModal
      onClose={onClose}
      title="Upload to Server"
      icon={Upload}
      verb="Checking"
      doneText="Everything is on the server"
      startLabel="Start Upload"
      steps={STEPS}
    />
  )
}
