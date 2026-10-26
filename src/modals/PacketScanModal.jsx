import { useEffect, useRef, useState } from 'react'
import { Package, ScanBarcode, X, Loader2, Trash2, PackageSearch } from 'lucide-react'
import Numpad from '../components/common/Numpad'
import Modal from '../components/common/Modal'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import './PacketScanModal.css'

/**
 * Packet Scan — scan packets one after another and see what each one is.
 *   left  — big scan box, then the scanned packets as cards (newest on top):
 *           name, barcode · pack, price; unknown codes are flagged
 *   right — keypad with ⌫, Add / Close
 * Nothing is added to the bill.
 */
export default function PacketScanModal({ onClose, searchFn = null }) {
  const [barcode, setBarcode] = useState('')
  const [items,   setItems]   = useState([])   // newest first
  const inputRef    = useRef()
  const seq         = useRef(0)
  const accessToken = usePosStore(s => s.accessToken)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleKey = (k) => {
    if (k === '⌫') setBarcode(v => v.slice(0, -1))
    else setBarcode(v => v + k)
    inputRef.current?.focus()
  }

  const add = async () => {
    const code = barcode.trim()
    if (!code) return
    const id = ++seq.current
    setItems(prev => [{ id, barcode: code, loading: true }, ...prev])
    setBarcode('')
    inputRef.current?.focus()
    try {
      const doSearch = searchFn ?? ((t) => api.counterPos.productSearch(t, accessToken))
      const { product } = await doSearch(code)
      const unit = Number(product.unitPrice) || 0
      const price = unit * (1 + (Number(product.vatPer) || 0) / 100)
      setItems(prev => prev.map(it => it.id === id ? {
        ...it, loading: false,
        description: product.description ?? product.productName,
        pack: product.unitName, price,
      } : it))
    } catch (e) {
      setItems(prev => prev.map(it => it.id === id ? { ...it, loading: false, error: e.status === 404 ? 'Not found' : (e.message || 'Lookup failed') } : it))
    }
  }

  const remove = (id) => setItems(prev => prev.filter(it => it.id !== id))
  const count = items.length

  return (
    <Modal onClose={onClose} icon={Package} kicker="Scanner" title="Packet Scan" width={800}>
      <div className="pks">
        <div className="pks-left">
          <div className="pks-scan">
            <ScanBarcode size={22} />
            <input
              ref={inputRef}
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder="Scan a packet barcode"
              aria-label="Packet barcode"
            />
            {barcode && (
              <button type="button" className="pks-clear" onClick={() => { setBarcode(''); inputRef.current?.focus() }} aria-label="Clear">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="pks-list">
            {count === 0 ? (
              <div className="pks-empty">
                <PackageSearch size={36} />
                <b>No packets yet</b>
                <span>Scan packets one after another — each one shows here</span>
              </div>
            ) : items.map((it, i) => (
              <div key={it.id} className={`pks-item${it.error ? ' is-error' : ''}${i === 0 ? ' is-new' : ''}`}>
                <span className="pks-no">{count - i}</span>
                <div className="pks-main">
                  {it.loading
                    ? <b className="pks-name is-muted"><Loader2 size={13} className="pks-spin" /> Looking up…</b>
                    : <b className="pks-name">{it.error ? it.error : it.description}</b>}
                  <span className="pks-meta">{it.barcode}{it.pack ? ` · ${it.pack}` : ''}</span>
                </div>
                {it.price != null && <span className="pks-price">{fmtMoney(it.price)}</span>}
                <button type="button" className="pks-del" onClick={() => remove(it.id)} aria-label={`Remove ${it.barcode}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pks-right">
          <div className="pks-count"><b>{count}</b> packet{count !== 1 ? 's' : ''} scanned</div>
          <Numpad onKey={handleKey} showDot={false} showClear={false} showBackspace btnHeight={50} fontSize={18} gap={8} />
          <div className="pks-foot">
            <button type="button" className="pks-btn is-primary" onClick={add} disabled={!barcode.trim()}>Add</button>
            <button type="button" className="pks-btn is-cancel" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
