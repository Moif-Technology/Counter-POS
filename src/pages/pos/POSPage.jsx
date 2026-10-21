import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../../store/posStore'
import { focusBarcodeScan, shouldSkipBarcodeRefocus } from '../../lib/posFocus'
import { posConfirm } from '../../lib/posNotify'
import { usePosSession } from './hooks/usePosSession'
import { useBarcodeEntry } from './hooks/useBarcodeEntry'
import { useSaveBill } from './hooks/useSaveBill'
import PosHeader from './components/PosHeader'
import PosScanBar from './components/PosScanBar'
import PosSaveButtons from './components/PosSaveButtons'
import PosFooter from './components/PosFooter'
import ItemsGrid from './components/ItemsGrid'
import NumPad from './components/NumPad'
import BillSummary from './components/BillSummary'
import ItemPreview from './components/ItemPreview'
import { SideNav, FeatureGrid } from './components/FunctionButtons'

export default function POSPage() {
  const navigate = useNavigate()
  const clearAll = usePosStore(s => s.clearAll)

  const { fetchNextBillNo } = usePosSession()
  const { scanning, sunmiScanOpen, handleEnter, handleSunmiScan } = useBarcodeEntry()
  const { saving, handleSave } = useSaveBill({ fetchNextBillNo })

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

  return (
    <div className="pos-root" onPointerDown={handleMainScreenPointerDown}>

      <PosHeader onOpenLite={handleOpenLite} />

      {/* ── BODY ───────────────────────────────────── */}
      <div className="pos-body">

        {/* LEFT — narrow icon sidebar */}
        <div className="pos-sidebar">
          <SideNav />
        </div>

        {/* CENTER */}
        <div className="pos-center">
          <PosScanBar
            scanning={scanning}
            sunmiScanOpen={sunmiScanOpen}
            onEnter={handleEnter}
            onSunmiScan={handleSunmiScan}
          />

          {/* Item preview strip */}
          <div className="pos-preview">
            <ItemPreview />
          </div>

          {/* Items table */}
          <div className="pos-grid">
            <ItemsGrid />
          </div>

          {/* Feature buttons row */}
          <div className="pos-fn-grid">
            <FeatureGrid />
          </div>
        </div>

        {/* RIGHT — payment mode + bill summary + numpad + actions */}
        <div className="pos-right">
          <div className="pos-bill-zone"><BillSummary /></div>
          <div className="pos-numpad-zone"><NumPad onEnter={handleEnter} /></div>
          <PosSaveButtons saving={saving} onSave={handleSave} />
        </div>

      </div>

      <PosFooter />
    </div>
  )
}
