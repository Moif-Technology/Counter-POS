import { useEffect, useRef, useState } from 'react'
import { Package, ScanBarcode, X, Loader2, Trash2 } from 'lucide-react'
import Numpad from '../components/common/Numpad'
import Modal from '../components/common/Modal'
import Table from '../components/common/Table'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import './PacketScanModal.css'

/**
 * Packet Scan — scan packets one after another and see what each one is.
 *   left  — big scan box, then a table of scanned packets (newest on top, highlighted):
 *           Sl# · Barcode · Description · Pack · Price; unknown codes are flagged
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
    <Modal onClose={onClose} icon={Package} kicker="Scanner" title="Packet Scan" width={920}>
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

          <div className="pks-table">
            <Table
              columns={[
                { key: 'sl', label: 'Sl#', width: 40, align: 'center', render: (_, it, i) => <span className="pks-no">{count - i}</span> },
                { key: 'barcode', label: 'Barcode', width: 84, mono: true },
                {
                  key: 'description', label: 'Description',
                  render: (v, it) => it.loading
                    ? <span className="pks-muted"><Loader2 size={13} className="pks-spin" /> Looking up…</span>
                    : it.error ? <b className="pks-err">{it.error}</b> : v,
                },
                { key: 'pack', label: 'Pack', width: 58, render: v => v || '—' },
                { key: 'price', label: 'Price', width: 70, align: 'right', mono: true, render: v => (v == null ? '—' : <b className="pks-price">{fmtMoney(v)}</b>) },
                {
                  key: 'del', label: '', width: 34, align: 'center',
                  render: (_, it) => (
                    <button type="button" className="pks-del" onClick={() => remove(it.id)} aria-label={`Remove ${it.barcode}`}>
                      <Trash2 size={15} />
                    </button>
                  ),
                },
              ]}
              rows={items}
              rowKey="id"
              selected={items[0]?.id}
              emptyText="No packets yet — scan packets one after another"
            />
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
