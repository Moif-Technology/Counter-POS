import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosStore } from '../../store/posStore'
import { closeAndFocusBarcode, focusBarcodeScan, shouldSkipBarcodeRefocus } from '../../lib/posFocus'
import { posConfirm, posNotifyWarning } from '../../lib/posNotify'
import { isMultiPaymentMode } from '../../lib/paymentModes'
import { getDiscountPromptAmount } from '../../lib/posSettings'
import { fmtMoney } from '../../lib/currencyFormat'
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
import { BillDetailModal } from '../../modals/SalesViewerModal'
import './pos.css'

export default function POSPage() {
  const navigate   = useNavigate()
  const clearAll   = usePosStore(s => s.clearAll)
  const returnMode = usePosStore(s => s.returnMode)
  const accessToken = usePosStore(s => s.accessToken)

  const { fetchNextBillNo } = usePosSession()
  const { scanning, sunmiScanOpen, handleEnter, handleSunmiScan, scannedBillId, closeScannedBill } = useBarcodeEntry()
  const { saving, handleSave } = useSaveBill({ fetchNextBillNo })
  const actions = usePosActions({ onSave: billWithDiscountOffer })

  /**
   * BILLING (both buttons + Bill Print key): bill at/over the ERP "ask for discount" amount and no
   * bill discount yet → Yes opens the Discount screen (same admin/supervisor PIN rule), No bills as usual.
   */
  async function billWithDiscountOffer(andPrint) {
    // Multi Pay already asked at its tile, before any money was taken.
    if (!isMultiPaymentMode(usePosStore.getState().paymentMode) && await offerDiscount()) { actions.run('Discount'); return }
    return handleSave(andPrint)
  }

  /** Multi Pay tile: ask before the split is entered, so the split is taken on the discounted net. */
  async function multiPayWithDiscountOffer() {
    if (!usePosStore.getState().cartItems.length) { posNotifyWarning('Add items to the cart first', { title: 'Multi Payment' }); return }
    if (await offerDiscount()) { actions.run('Discount Then Multi Pay'); return }
    usePosStore.getState().openMultiPayModal()
  }

  /** True when the bill crossed the ERP amount, has no bill discount yet, and the cashier says Yes. */
  async function offerDiscount() {
    const { cartItems, netAmount, billDiscountAmt } = usePosStore.getState()
    const limit = getDiscountPromptAmount()
    if (!(cartItems.length && limit > 0 && Number(netAmount) >= limit && !(Number(billDiscountAmt) > 0))) return false
    return posConfirm({
      title: 'Give a discount?',
      message: `Bill amount ${fmtMoney(netAmount)} crossed ${fmtMoney(limit)}. Give a discount to this customer?`,
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      locked: true, // a stray tap outside must not count as No and save the bill
    })
  }

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
      <PosTopBar onOpenLite={handleOpenLite} onAction={actions.run} />

      {/*
        Left: the cart (search · lines · selected line).
        Right: bill summary → numpad | function keys → BILLING.
      */}
      <main className="ph-main">
        <section className="ph-col ph-col-items">
          <PosSearchBar
            onEnter={handleEnter}
            onScan={handleSunmiScan}
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

        <PosBillingButtons saving={saving} onSave={billWithDiscountOffer} onMultiPay={multiPayWithDiscountOffer} />
      </main>

      <PosStatusBar />

      {actions.modals}

      {scannedBillId != null && (
        <BillDetailModal
          salesId={scannedBillId}
          accessToken={accessToken}
          onClose={closeAndFocusBarcode(closeScannedBill)}
        />
      )}
    </div>
  )
}
