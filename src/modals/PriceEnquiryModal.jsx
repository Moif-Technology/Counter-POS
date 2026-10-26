import { useEffect, useRef, useState } from 'react'
import { ScanBarcode, Search, Loader2, PackageX, Tag, X } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney as fmt } from '../lib/currencyFormat'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'
import './PriceEnquiryModal.css'

/**
 * Price Enquiry — scan or type a barcode, see the price at a glance.
 *   left  — big scan box, then a price tag: item name, price with tax (large),
 *           detail chips (unit price, VAT, pack, stock)
 *   right — keypad with ⌫, Check price / Close
 * Nothing is added to the bill.
 */
export default function PriceEnquiryModal({ onClose, searchFn = null }) {
  const [barcode, setBarcode] = useState('')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const inputRef    = useRef()
  const accessToken = usePosStore(s => s.accessToken)
  const currency    = usePosStore(s => s.currency)

  useEffect(() => { inputRef.current?.focus() }, [])

  const reset = () => { setBarcode(''); setResult(null); setError(null); inputRef.current?.focus() }

  const pressKey = (k) => {
    if (k === 'C') { reset(); return }
    if (k === '⌫') setBarcode(v => v.slice(0, -1))
    else setBarcode(v => v + k)
    inputRef.current?.focus()
  }

  const check = async () => {
    const term = barcode.trim()
    if (!term || loading) return
    setLoading(true)
    setError(null)
    try {
      const doSearch = searchFn ?? ((t) => api.counterPos.productSearch(t, accessToken))
      const { product } = await doSearch(term)
      const unitPrice = Number(product.unitPrice) || 0
      const vatPer    = Number(product.vatPer) || 0
      const vatAmt    = unitPrice * (vatPer / 100)
      setResult({
        barcode:     product.barcode ?? term,
        description: product.description ?? product.productName,
        pack:        product.unitName ?? '—',
        unitPrice, vatPer, vatAmt,
        price:       unitPrice + vatAmt,
        qtyOnHand:   product.qtyOnHand,
      })
      setBarcode('')   // ready for the next scan
    } catch (e) {
      setResult(null)
      setError(e.status === 404 ? `No item found for “${term}”` : e.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const stock = Number(result?.qtyOnHand)
  const hasStock = Number.isFinite(stock)

  return (
    <Modal onClose={onClose} icon={Tag} kicker="Product" title="Price Enquiry" width={760}>
      <div className="pe">
        <div className="pe-left">
          {/* Scan box */}
          <div className="pe-scan">
            <ScanBarcode size={22} />
            <input
              ref={inputRef}
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); check() } }}
              placeholder="Scan or type a barcode"
              aria-label="Barcode"
            />
            {barcode && (
              <button type="button" className="pe-clear" onClick={() => { setBarcode(''); inputRef.current?.focus() }} aria-label="Clear">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Result */}
          {loading ? (
            <div className="pe-state"><Loader2 size={30} className="pe-spin" /><b>Checking…</b></div>
          ) : error ? (
            <div className="pe-state is-error"><PackageX size={34} /><b>{error}</b><span>Check the barcode and try again</span></div>
          ) : result ? (
            <div className="pe-tag">
              <span className="pe-tag-hole" aria-hidden />
              <div className="pe-tag-name">{result.description}</div>
              <div className="pe-tag-code">{result.barcode}</div>
              <div className="pe-tag-price">
                <small>{currency}</small>{fmt(result.price)}
              </div>
              <div className="pe-tag-sub">price incl. {result.vatPer}% VAT</div>
              <div className="pe-chips">
                <span>Unit price <b>{fmt(result.unitPrice)}</b></span>
                <span>VAT <b>{fmt(result.vatAmt)}</b></span>
                <span>Pack <b>{result.pack}</b></span>
                {hasStock && <span className={stock > 0 ? 'is-ok' : 'is-low'}>In stock <b>{stock}</b></span>}
              </div>
            </div>
          ) : (
            <div className="pe-state"><Search size={32} /><b>Check a price</b><span>Scan an item or type its barcode, then press Enter</span></div>
          )}
        </div>

        {/* Keypad */}
        <div className="pe-right">
          <Numpad onKey={pressKey} showDot={false} showClear showBackspace btnHeight={50} fontSize={18} gap={8} />
          <div className="pe-foot">
            <button type="button" className="pe-btn is-primary" onClick={check} disabled={!barcode.trim() || loading}>
              <Search size={17} /> Check price
            </button>
            <button type="button" className="pe-btn is-cancel" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
