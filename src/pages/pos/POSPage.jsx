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

  // Shown inside the search box, so it never moves the cart or the other panels.
  const status = saving ? 'Saving… please wait'
    : scanning ? 'Searching…'
    : returnMode ? 'Return mode'
    : ''

  return (
    <div className="ph-root" onPointerDown={handleMainScreenPointerDown}>
      <PosTopBar onOpenLite={handleOpenLite} onLogout={() => actions.run('Log Out')} />

      {/*
        Left: the cart (search · lines · selected line).
        Right: bill summary → numpad | function keys → BILLING.
      */}
      <main className="ph-main">
        <section className="ph-col ph-col-items">
          <PosSearchBar
            onEnter={handleEnter}
            onScan={handleSunmiScan}
            onAction={actions.run}
            status={status}
            scanning={scanning}
            sunmiScanOpen={sunmiScanOpen}
          />
          <PosItemsTable />
          <PosItemCard />
        </section>

        <PosTransactionPanel />

        <section className="ph-col ph-col-pad">
          <PosPaymentPad onEnter={handleEnter} />
        </section>

        <section className="ph-col ph-col-fn">
          <PosFunctionPanel actions={actions} />
        </section>

        <PosBillingButtons saving={saving} onSave={handleSave} />
      </main>

      <PosStatusBar />

      {actions.modals}
    </div>
  )
}
