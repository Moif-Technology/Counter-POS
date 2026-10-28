import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Truck, Search, Phone, MapPin, UserRound, Check } from 'lucide-react'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney } from '../lib/currencyFormat'
import Modal from '../components/common/Modal'
import Table from '../components/common/Table'
import DateTimePicker from '../components/common/DateTimePicker'
import './DeliveryCustomerModal.css'

/*
 * Delivery — find the customer on the left (search by name / code / area /
 * telephone / mobile), fill the delivery phone, time and address on the right,
 * then Confirm Delivery. onConfirm receives the same payload as before.
 */
function defaultDeliveryTime() {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 60)
  d.setSeconds(0, 0)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const areaOf = c => c?.area ?? c?.areaName ?? ''
const SEARCH_BY = [
  { key: 'name',      label: 'Name',      server: true,  get: c => c.customerName },
  { key: 'code',      label: 'Code',      server: true,  get: c => c.customerCode },
  { key: 'area',      label: 'Area',      server: false, get: areaOf },
  { key: 'telephone', label: 'Telephone', server: false, get: c => c.telephone },
  { key: 'mobile',    label: 'Mobile',    server: true,  get: c => c.mobileNo },
]
const COLUMNS = [
  { key: 'customerCode', label: 'Code',          width: 72, mono: true },
  { key: 'customerName', label: 'Customer Name', render: v => <b>{v}</b> },
  { key: 'area',         label: 'Area',          width: 88, render: (_, c) => areaOf(c) || '—' },
  { key: 'telephone',    label: 'Telephone',     width: 92, mono: true, render: v => v || '—' },
  { key: 'mobileNo',     label: 'Mobile',        width: 100, mono: true, render: v => v || '—' },
]

export default function DeliveryCustomerModal({ onClose, onConfirm, title = 'Delivery Details', searchFn = null }) {
  const accessToken          = usePosStore(s => s.accessToken)
  const storeCustomerId      = usePosStore(s => s.customerId)
  const storeCustomerName    = usePosStore(s => s.customerName)
  const storeCustomerCode    = usePosStore(s => s.customerCode)
  const storeDeliveryPhone   = usePosStore(s => s.deliveryPhone)
  const storeDeliveryAddress = usePosStore(s => s.deliveryAddress)
  const storeDeliveryTime    = usePosStore(s => s.deliveryTime)

  const [by, setBy]               = useState('name')
  const [query, setQuery]         = useState('')
  const [customers, setCustomers] = useState([])
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [phone, setPhone]         = useState(storeDeliveryPhone || '')
  const [address, setAddress]     = useState(storeDeliveryAddress || '')
  const [deliveryTime, setDeliveryTime] = useState(storeDeliveryTime || defaultDeliveryTime())
  const debounceRef = useRef()

  const field = SEARCH_BY.find(s => s.key === by)

  const doSearch = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const run = searchFn ?? ((qq) => api.counterPos.customerSearch(qq, 300, accessToken))
      const { customers: list } = await run(q)
      setCustomers(list ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, searchFn])

  useEffect(() => { doSearch('') }, [doSearch])

  // Name / code / mobile search on the server; area and telephone filter the loaded list.
  const onQuery = (q, f = field) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(f.server ? q : ''), 280)
  }
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return customers
    return customers.filter(c => String(field.get(c) ?? '').toLowerCase().includes(term))
  }, [customers, query, field])

  // Pre-select the customer already on the bill
  useEffect(() => {
    if (!storeCustomerId || selected) return
    const match = customers.find(c => Number(c.customerId) === Number(storeCustomerId))
    if (match) pick(match, false)
    else if (storeCustomerName) setSelected({ customerId: storeCustomerId, customerCode: storeCustomerCode, customerName: storeCustomerName, mobileNo: storeDeliveryPhone || '' })
  }, [customers]) // eslint-disable-line react-hooks/exhaustive-deps

  function pick(c, fill = true) {
    setSelected(c)
    setError(null)
    if (fill || !phone) setPhone(c.mobileNo || c.telephone || phone)
    if ((fill || !address) && c.address) setAddress(c.address)
  }

  const handleConfirm = () => {
    if (!selected?.customerId) { setError('Select a customer for delivery'); return }
    if (!deliveryTime) { setError('Delivery time is required'); return }
    if (!String(address).trim()) { setError('Delivery address is required'); return }
    onConfirm?.({
      customerId: selected.customerId,
      customerName: selected.customerName,
      customerCode: selected.customerCode ?? '',
      mobileNo: selected.mobileNo ?? phone,
      telephone: selected.telephone ?? null,
      taxRegNo: selected.taxRegNo ?? null,
      customerAddress: selected.address ?? null,
      deliveryPhone: phone.trim(),
      deliveryAddress: address.trim(),
      deliveryTime: new Date(deliveryTime).toISOString(),
    })
  }

  const os = Number(selected?.osAmount)

  return (
    <Modal onClose={onClose} icon={Truck} kicker="Delivery" title={title} width={1040} maxHeight="94vh">
      <div className="dlv">
        {/* Find customer */}
        <section className="dlv-find">
          <div className="dlv-by">
            <span>Search by</span>
            {SEARCH_BY.map(s => (
              <button key={s.key} type="button" className={by === s.key ? 'is-on' : ''} onClick={() => { setBy(s.key); onQuery(query, s) }}>{s.label}</button>
            ))}
          </div>
          <label className="dlv-search">
            <Search size={16} />
            <input data-system-keyboard value={query} onChange={e => onQuery(e.target.value)} placeholder={`Search by ${field.label.toLowerCase()}…`} autoFocus />
          </label>
          <div className="dlv-table">
            <Table
              columns={COLUMNS}
              rows={shown}
              rowKey="customerId"
              selected={selected?.customerId}
              onRowClick={c => pick(c)}
              onRowDoubleClick={c => { pick(c) }}
              loading={loading && !customers.length}
              emptyText={query ? 'No customer matches' : 'No customers'}
            />
          </div>
        </section>

        {/* Delivery details */}
        <section className="dlv-details">
          {selected ? (
            <div className="dlv-cust">
              <span className="dlv-avatar"><UserRound size={20} /></span>
              <div className="dlv-cust-text">
                <b>{selected.customerName}</b>
                <small>
                  {selected.customerCode}
                  {areaOf(selected) && <> · <MapPin size={11} /> {areaOf(selected)}</>}
                  {selected.taxRegNo && <> · TRN {selected.taxRegNo}</>}
                </small>
              </div>
              {Number.isFinite(os) && os !== 0 && <span className={`dlv-os${os > 0 ? ' is-due' : ''}`}>Balance {fmtMoney(os)}</span>}
            </div>
          ) : (
            <div className="dlv-cust is-empty"><span className="dlv-avatar"><UserRound size={20} /></span><span>Pick a customer from the list</span></div>
          )}

          <label className="dlv-field">
            <span>Phone</span>
            <div className="dlv-input"><Phone size={15} /><input data-system-keyboard value={phone} onChange={e => { setPhone(e.target.value); setError(null) }} placeholder="Delivery phone" /></div>
          </label>

          <div className="dlv-field">
            <DateTimePicker label="Delivery Time" value={deliveryTime} onChange={v => { setDeliveryTime(v); setError(null) }} />
          </div>

          <label className="dlv-field is-grow">
            <span>Delivery Address</span>
            <textarea data-system-keyboard value={address} onChange={e => { setAddress(e.target.value); setError(null) }} placeholder="Building, street, area…" />
          </label>

          {error && <div className="dlv-error">{error}</div>}
        </section>
      </div>

      <div className="dlv-foot">
        <button type="button" className="dlv-cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="dlv-ok" onClick={handleConfirm} disabled={!selected}><Check size={17} /> Confirm Delivery</button>
      </div>
    </Modal>
  )
}
