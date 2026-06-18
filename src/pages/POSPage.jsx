import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Monitor, Calendar, Clock, ShoppingCart, ChevronRight, ChevronDown,
  Search, Maximize2, Bell, User, Save, Printer,
} from 'lucide-react'
import { usePosStore } from '../store/posStore'
import { api } from '../lib/api'
import { isMultiPaymentMode } from '../lib/paymentModes'
import ItemsGrid from '../components/pos/ItemsGrid'
import BarcodeInput from '../components/pos/BarcodeInput'
import NumPad from '../components/pos/NumPad'
import BillSummary from '../components/pos/BillSummary'
import ItemPreview from '../components/pos/ItemPreview'
import { SideNav, FeatureGrid } from '../components/pos/FunctionButtons'
import CustomerSearch from '../components/pos/CustomerSearch'
import { enrichCartItemsForSave } from '../lib/cartLine'
import { focusBarcodeScan, shouldSkipBarcodeRefocus } from '../lib/posFocus'
import { setGvTax } from '../lib/gvtax'
import { setAutoRoundOff } from '../lib/posSettings'
import { posConfirm, posNotifyError, posNotifySuccess, posNotifyWarning } from '../lib/posNotify'
import { printBillReceipts } from '../lib/printBillReceipt'
import {
  parseLegacyDeliveryScan,
  parseLegacyHoldScan,
  parseDocNumber,
  resolveNumericDocumentScan,
  DOC_TYPE,
  formatDocNumberDisplay,
} from '../lib/documentScan'

/* ── Tiny header chip ─────────────────────────────────────────── */
function HeaderChip({ icon: Icon, label, dropdown }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 7, padding: '5px 10px', cursor: dropdown ? 'pointer' : 'default',
    }}>
      <Icon size={11} color="rgba(255,255,255,0.65)" />
      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.2 }}>
        {label}
      </span>
      {dropdown && <ChevronDown size={10} color="rgba(255,255,255,0.5)" />}
    </div>
  )
}

/* ── Header icon button ───────────────────────────────────────── */
function HeaderIconBtn({ icon: Icon, badge }) {
  return (
    <button style={{
      position: 'relative',
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.75)', transition: 'all 0.13s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
    >
      <Icon size={14} />
      {badge != null && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          background: '#ef4444', color: '#fff',
          fontSize: 9, fontWeight: 800, minWidth: 16, height: 16,
          borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px', border: '1.5px solid var(--brand)',
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}

export default function POSPage() {
  const navigate         = useNavigate()
  const cashier          = usePosStore(s => s.cashier)
  const counterNo        = usePosStore(s => s.counterNo)
  const billNo           = usePosStore(s => s.billNo)
  const shopName         = usePosStore(s => s.shopName)
  const addItem          = usePosStore(s => s.addItem)
  const setBarcodeBuffer = usePosStore(s => s.setBarcodeBuffer)
  const setQtyBuffer     = usePosStore(s => s.setQtyBuffer)
  const setBillNo        = usePosStore(s => s.setBillNo)
  const clearAll         = usePosStore(s => s.clearAll)
  const [now, setNow]           = useState(new Date())
  const [scanning, setScanning]   = useState(false)
  const [saving, setSaving]       = useState(false)

  const fetchNextBillNo = useCallback(async () => {
    const { accessToken } = usePosStore.getState()
    try {
      const { billNo } = await api.counterPos.nextBillNo(accessToken)
      setBillNo(String(billNo ?? ''))
    } catch {
      // ignore: bill number is best-effort (POS can still operate)
    }
  }, [setBillNo])

  useEffect(() => {
    if (!cashier) { navigate('/'); return }
    const t = setInterval(() => setNow(new Date()), 1000)
    fetchNextBillNo()
    ;(async () => {
      try {
        const { accessToken } = usePosStore.getState()
        const data = await api.appParameters.gvtax(accessToken)
        setGvTax(data?.gvtax ?? 5)
        usePosStore.getState().setCurrencyPrecision(data?.currencyPrecision ?? 2)
        setAutoRoundOff(data?.autoRoundOff ?? 0)
        if (data?.receiptHeader) usePosStore.getState().setReceiptHeader(data.receiptHeader)
        usePosStore.getState().recalc()
      } catch {
        setGvTax(5)
      }
    })()
    return () => clearInterval(t)
  }, [cashier, navigate, fetchNextBillNo])

  const handleEnter = useCallback(async () => {
    const state = usePosStore.getState()
    const { barcodeBuffer, qtyBuffer, accessToken } = state
    const term = barcodeBuffer.trim()
    if (!term || scanning) return

    const holdNo = parseLegacyHoldScan(term)
    if (holdNo != null) {
      if (state.cartItems.length > 0) {
        const ok = await posConfirm({
          title: 'Recall Hold',
          message: `Cart has items. Recall hold ${holdNo} and replace the current bill?`,
          confirmLabel: 'Recall Hold',
          cancelLabel: 'Cancel',
        })
        if (!ok) {
          state.setBarcodeBuffer('')
          focusBarcodeScan(30)
          return
        }
      }
      setScanning(true)
      try {
        await usePosStore.getState().recallHoldByNo(holdNo)
        state.resetAfterLineScan()
        posNotifySuccess(`Hold ${holdNo} recalled`, { title: 'Hold Recall', duration: 1200 })
        focusBarcodeScan(30)
      } catch (err) {
        posNotifyError(err.message ?? 'Hold not found', {
          title: 'Hold Recall',
          onClose: () => {
            usePosStore.getState().setBarcodeBuffer('')
            focusBarcodeScan(30)
          },
        })
      } finally {
        setScanning(false)
      }
      return
    }

    const deliveryNo = parseLegacyDeliveryScan(term)
    if (deliveryNo != null) {
      if (state.cartItems.length > 0) {
        const ok = await posConfirm({
          title: 'Recall Delivery',
          message: `Cart has items. Recall delivery ${deliveryNo} to counter and replace the current bill?`,
          confirmLabel: 'Recall Delivery',
          cancelLabel: 'Cancel',
        })
        if (!ok) {
          state.setBarcodeBuffer('')
          focusBarcodeScan(30)
          return
        }
      }
      setScanning(true)
      try {
        await usePosStore.getState().recallDeliveryByNo(deliveryNo)
        state.resetAfterLineScan()
        posNotifySuccess(`Delivery ${deliveryNo} recalled to counter`, {
          title: 'Delivery Recall',
          duration: 1200,
        })
        focusBarcodeScan(30)
      } catch (err) {
        posNotifyError(err.message ?? 'Delivery not found', {
          title: 'Delivery Recall',
          onClose: () => {
            usePosStore.getState().setBarcodeBuffer('')
            focusBarcodeScan(30)
          },
        })
      } finally {
        setScanning(false)
      }
      return
    }

    const docNo = parseDocNumber(term)
    if (docNo != null) {
      const resolved = await resolveNumericDocumentScan(docNo, accessToken, api)
      if (resolved) {
        const isHold = resolved.type === DOC_TYPE.HOLD
        const label = isHold ? `hold ${resolved.number}` : `delivery ${resolved.number}`
        if (state.cartItems.length > 0) {
          const ok = await posConfirm({
            title: isHold ? 'Recall Hold' : 'Recall Delivery',
            message: `Cart has items. Recall ${label} and replace the current bill?`,
            confirmLabel: isHold ? 'Recall Hold' : 'Recall Delivery',
            cancelLabel: 'Cancel',
          })
          if (!ok) {
            state.setBarcodeBuffer('')
            focusBarcodeScan(30)
            return
          }
        }
        setScanning(true)
        try {
          if (isHold) {
            await usePosStore.getState().recallHoldByNo(resolved.number)
          } else {
            await usePosStore.getState().recallDeliveryByNo(resolved.number)
          }
          state.resetAfterLineScan()
          posNotifySuccess(`${isHold ? 'Hold' : 'Delivery'} ${resolved.number} recalled`, {
            title: isHold ? 'Hold Recall' : 'Delivery Recall',
            duration: 1200,
          })
          focusBarcodeScan(30)
        } catch (err) {
          posNotifyError(err.message ?? 'Document not found', {
            title: isHold ? 'Hold Recall' : 'Delivery Recall',
            onClose: () => {
              usePosStore.getState().setBarcodeBuffer('')
              focusBarcodeScan(30)
            },
          })
        } finally {
          setScanning(false)
        }
        return
      }
    }

    setScanning(true)
    let added = false
    try {
      const { product } = await api.counterPos.productSearch(term, accessToken)
      const { parseScanQty, resetAfterLineScan } = usePosStore.getState()
      const qty = parseScanQty(qtyBuffer)
      addItem({
        productId:   product.productId,
        barcode:     product.barcode,
        productCode: product.productCode,
        description: product.description ?? product.productName,
        qty,
        unitPrice: product.unitPrice,
        discount:  0,
        vatPer:    product.vatPer ?? 0,
      })
      resetAfterLineScan()
      added = true
    } catch (err) {
      posNotifyError(err.message ?? 'Product not found', {
        title: 'Scan',
        onClose: () => {
          usePosStore.getState().setBarcodeBuffer('')
          focusBarcodeScan(30)
        },
      })
    } finally {
      setScanning(false)
      if (added) focusBarcodeScan(30)
    }
  }, [addItem, scanning])

  const handleSave = useCallback(async (andPrint = false) => {
    const state = usePosStore.getState()
    if (!state.cartItems.length) {
      posNotifyWarning('Cart is empty', { title: 'Save Bill' })
      return
    }

    const payResult = state.applyPaymentForSettlement()
    if (!payResult.ok) {
      posNotifyError(payResult.error, { title: 'Payment' })
      focusBarcodeScan(30)
      return
    }

    setSaving(true)
    try {
      const fresh = usePosStore.getState()
      const cartItems = enrichCartItemsForSave(fresh.cartItems)
      const hasSale   = cartItems.some(i => Number(i.qty) > 0)
      const hasReturn = cartItems.some(i => Number(i.qty) < 0)
      const isReturn = fresh.returnMode && !hasSale && hasReturn
      const result = await api.counterPos.saveBill({
        cartItems,
        paymentMode:  fresh.paymentMode,
        paymentSplits: isMultiPaymentMode(fresh.paymentMode) ? (fresh.paymentSplits ?? []) : undefined,
        counterNo:    fresh.counterNo,
        subTotal:     fresh.subTotal,
        discountAmt:  fresh.discountAmt,
        taxableAmt:   fresh.taxableAmt,
        taxAmt:       fresh.taxAmt,
        roundOff:     fresh.roundOff,
        netAmount:    fresh.netAmount,
        paidAmount:   fresh.paidAmount,
        balanceAmount: fresh.balanceAmount,
        customerId:   fresh.customerId ?? null,
        remarks:      fresh.billComment?.trim() || null,
        isReturn,
        recalledHoldSalesId: fresh.recalledHoldSalesId ?? null,
        recalledDeliverySalesId: fresh.recalledDeliverySalesId ?? null,
      }, fresh.accessToken)

      if (result?.isMixed) {
        posNotifySuccess(
          `Saved: ${formatDocNumberDisplay(result.sale?.billNoDisplay ?? result.sale?.billNo)} (Sale) + ${formatDocNumberDisplay(result.return?.billNoDisplay ?? result.return?.billNo)} (Return)`,
          { title: 'Bill Saved', duration: 1200 },
        )
      } else {
        const savedLabel = formatDocNumberDisplay(result.billNoDisplay ?? result.billNo ?? result.salesId)
        posNotifySuccess(
          result?.isReturn ? `Return ${savedLabel} saved!` : `Bill ${savedLabel} saved!`,
          { title: 'Bill Saved', duration: 1200 },
        )
      }
      usePosStore.setState({ recalledHoldSalesId: null })
      const { accessToken, counterNo, shopName } = usePosStore.getState()
      clearAll()
      await fetchNextBillNo()

      if (andPrint) {
        const printMeta = { companyName: shopName, counterNo }
        const ids = result?.isMixed
          ? [result.sale?.salesId, result.return?.salesId]
          : [result.salesId]
        try {
          await printBillReceipts(ids, accessToken, printMeta)
        } catch (printErr) {
          posNotifyError(printErr.message ?? 'Print failed', { title: 'Print' })
        }
      }
    } catch (err) {
      posNotifyError(err.message ?? 'Save failed', { title: 'Save Bill' })
    } finally {
      setSaving(false)
      focusBarcodeScan(80)
    }
  }, [clearAll, fetchNextBillNo])

  const handleMainScreenPointerDown = useCallback((e) => {
    if (shouldSkipBarcodeRefocus(e.target)) return
    focusBarcodeScan()
  }, [])

  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="pos-root" onPointerDown={handleMainScreenPointerDown}>

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="pos-header">

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShoppingCart size={16} color="#fff" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            {shopName || 'Counter POS'}
          </span>
          <ChevronRight size={13} color="rgba(255,255,255,0.35)" />
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 7, padding: '5px 10px',
            color: '#fff', fontSize: 11, fontWeight: 700,
            transition: 'background 0.13s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.26)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
          >
            <User size={11} /> Cashier
          </button>
        </div>

        {/* Center — counter / date / time */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0 }}>
          <HeaderChip icon={Monitor}  label={`Counter ${counterNo}`} dropdown />
          <span className="header-hide-sm"><HeaderChip icon={Calendar} label={dateStr} /></span>
          <HeaderChip icon={Clock}    label={timeStr} />
        </div>

        {/* Right — bill / actions / user */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 7, padding: '5px 11px', flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.4 }}>BILL </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
              {billNo}
            </span>
          </div>

          <div className="header-hide-md" style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)' }} />
          <span className="header-hide-md"><HeaderIconBtn icon={Search} /></span>
          <span className="header-hide-md"><HeaderIconBtn icon={Maximize2} /></span>
          <HeaderIconBtn icon={Bell} badge={3} />

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="header-hide-sm" style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 90, textOverflow: 'ellipsis' }}>
              {cashier?.name}
            </span>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.38)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
              {cashier?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────── */}
      <div className="pos-body">

        {/* LEFT — narrow icon sidebar */}
        <div className="pos-sidebar">
          <SideNav />
        </div>

        {/* CENTER */}
        <div className="pos-center">

          {/* Customer + Barcode entry — top */}
          <div className="pos-topbar">
            <CustomerSearch />

            <div style={{ flex: 1, minWidth: 0, opacity: scanning ? 0.72 : 1 }}>
              <BarcodeInput onEnter={handleEnter} />
            </div>
          </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 8px 10px', flexShrink: 0 }}>
            <button
              disabled={saving}
              onClick={() => handleSave(false)}
              style={{
                padding: '12px 0', borderRadius: 'var(--r-md)',
                border: '2px solid var(--brand-border)',
                background: 'var(--brand-bg)', color: 'var(--brand)',
                fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.12s', letterSpacing: 0.3, opacity: saving ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--brand)' } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.borderColor = 'var(--brand-border)' }}
              onMouseDown={e => { if (!saving) e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <Save size={18} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              disabled={saving}
              onClick={() => handleSave(true)}
              style={{
                padding: '12px 0', borderRadius: 'var(--r-md)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
                color: '#fff',
                fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(107,0,0,0.25)',
                transition: 'all 0.12s', letterSpacing: 0.3, opacity: saving ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!saving) { e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,0,0,0.38)'; e.currentTarget.style.opacity = '0.93' } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(107,0,0,0.25)'; e.currentTarget.style.opacity = saving ? '0.6' : '1' }}
              onMouseDown={e => { if (!saving) e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <Printer size={18} /> Bill &amp; Print
            </button>
          </div>
        </div>

      </div>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="pos-footer">
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>
          Moif Technology — POS v2.0
        </span>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
            Currency: <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>AED</span>
          </span>
          <span style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />
            Ready
          </span>
        </div>
      </footer>

    </div>
  )
}
