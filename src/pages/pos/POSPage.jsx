import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../../store/posStore'
import { focusBarcodeScan, shouldSkipBarcodeRefocus } from '../../lib/posFocus'
import { posConfirm } from '../../lib/posNotify'
import { usePosSession } from './hooks/usePosSession'
import { useBarcodeEntry } from './hooks/useBarcodeEntry'
import { useSaveBill } from './hooks/useSaveBill'
import { usePosActions } from './hooks/usePosActions'
import PosTopBar from './components/PosTopBar'
import PosSearchBar from './components/PosSearchBar'
import PosItemsTable from './components/PosItemsTable'
import PosQtyBar from './components/PosQtyBar'
import PosPaymentPad from './components/PosPaymentPad'
import PosItemCard from './components/PosItemCard'
import PosFunctionPanel from './components/PosFunctionPanel'
import PosBillingButtons from './components/PosBillingButtons'
import PosTransactionPanel from './components/PosTransactionPanel'
import PosStatusBar from './components/PosStatusBar'
import './pos.css'

export default function POSPage() {
  const navigate   = useNavigate()
  const clearAll   = usePosStore(s => s.clearAll)
  const returnMode = usePosStore(s => s.returnMode)

  const { fetchNextBillNo } = usePosSession()
  const { scanning, sunmiScanOpen, handleEnter, handleSunmiScan } = useBarcodeEntry()
  const { saving, handleSave } = useSaveBill({ fetchNextBillNo })
  const actions = usePosActions({ onSave: handleSave })

  // Lite runs on its own demo catalogue but shares this cart store, so the
  // cart is cleared on the way in to keep real and demo items from mixing.
  const handleOpenLite = useCallback(async () => {
    if (usePosStore.getState().cartItems.length) {
      const ok = await posConfirm({
        title: 'Switch to Lite',
        message: 'Cart has items. Clear the current bill and open Lite mode?',
        confirmLabel: 'Open Lite',
        cancelLabel: 'Cancel',
      })
      if (!ok) return
    }
    clearAll()
    navigate('/lite')
  }, [clearAll, navigate])

  const handleMainScreenPointerDown = useCallback((e) => {
    if (shouldSkipBarcodeRefocus(e.target)) return
    focusBarcodeScan()
  }, [])

  const status = saving ? 'Saving........Please Wait...........'
    : scanning ? 'Searching........'
    : returnMode ? 'Return mode — scanned items are returned'
    : ''

  return (
    <div className="ph-root" onPointerDown={handleMainScreenPointerDown}>
      <PosTopBar onOpenLite={handleOpenLite} />

      <main className="ph-main">
        {/* Left — search, cart lines, qty */}
        <section className="ph-col ph-col-items">
          <PosSearchBar
            onEnter={handleEnter}
            onScan={handleSunmiScan}
            scanning={scanning}
            sunmiScanOpen={sunmiScanOpen}
          />
          <PosItemsTable />
          <PosQtyBar status={status} />
        </section>

        {/* Middle — function keys, selected item, billing */}
        <section className="ph-col ph-col-fn">
          <PosFunctionPanel actions={actions} />
          <PosItemCard />
          <PosBillingButtons saving={saving} onSave={handleSave} />
        </section>

        {/* Right — payment modes, numpad, ENTER */}
        <section className="ph-col ph-col-pad">
          <PosPaymentPad onEnter={handleEnter} />
        </section>
      </main>

      <PosTransactionPanel />
      <PosStatusBar />

      {actions.modals}
    </div>
  )
}
