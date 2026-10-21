import { useEffect, useRef, useState } from 'react'
import { FileText, Keyboard, Printer } from 'lucide-react'
import Table from '../components/common/Table'
import Numpad from '../components/common/Numpad'
import TouchKeyboard from '../components/common/Keyboard'
import Modal from '../components/common/Modal'

const SAMPLE_RECEIPTS = [
  { billNo: '001', customerCode: '003', customerName: 'STILL FOOD BAQALA', amount: '25.000', date: '21-05-2026' },
  { billNo: '002', customerCode: '101', customerName: 'SAKLKARIYA',         amount: '18.500', date: '21-05-2026' },
  { billNo: '003', customerCode: '102', customerName: 'SAJINAS KTK',        amount: '42.000', date: '21-05-2026' },
  { billNo: '004', customerCode: '103', customerName: 'NASAR',              amount: '10.750', date: '21-05-2026' },
  { billNo: '005', customerCode: '104', customerName: 'SUMON',              amount: '33.200', date: '21-05-2026' },
]

const COLUMNS = [
  { key: 'billNo',       label: 'Bill No',       width: 72,  mono: true },
  { key: 'customerCode', label: 'Customer Code',  width: 110, mono: true },
  { key: 'customerName', label: 'Customer Name'              },
  { key: 'amount',       label: 'Amount',         width: 90,  align: 'right', mono: true },
]

export default function ReceiptModal({ onClose }) {
  const [selectedBill,   setSelectedBill]   = useState(null)
  const [billNo,         setBillNo]         = useState('')
  const [customerName,   setCustomerName]   = useState('')
  const [focus,          setFocus]          = useState('billNo')
  const [keyboardOpen,   setKeyboardOpen]   = useState(false)
  const billRef     = useRef()
  const custRef     = useRef()

  useEffect(() => {
    billRef.current?.focus()
  }, [onClose])

  const handleRowClick = row => {
    setSelectedBill(row)
    setBillNo(row.billNo)
    setCustomerName(row.customerName)
  }

  const handleNumKey = k => {
    const set = focus === 'billNo' ? setBillNo : setCustomerName
    if (k === 'C')  { set(''); return }
    if (k === '⌫') { set(v => v.slice(0, -1)); return }
    if (k === '.' && focus === 'billNo') return
    set(v => v + k)
  }

  const handleKbKey = k => {
    if (k === '⌫') {
      if (focus === 'billNo')       setBillNo(v => v.slice(0, -1))
      else if (focus === 'custName') setCustomerName(v => v.slice(0, -1))
      return
    }
    if (k === 'ENTER') { handlePrint(); return }
    if (focus === 'billNo')        setBillNo(v => v + k)
    else if (focus === 'custName') setCustomerName(v => v + k)
  }

  const handlePrint = () => {
    if (!billNo && !selectedBill) return
    onClose()
  }

  const filteredRows = SAMPLE_RECEIPTS.filter(r =>
    (!billNo       || r.billNo.includes(billNo)) &&
    (!customerName || r.customerName.toLowerCase().includes(customerName.toLowerCase()))
  )

  return (
    <Modal
      onClose={onClose}
      icon={FileText}
      kicker="Lookup"
      title="Receipt"
      width={820}
      maxHeight="92vh"
    >
      <style>{`
        @media (max-width: 640px) {
          .rc-body { flex-direction: column !important; }
          .rc-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; min-height: 180px; }
          .rc-right { width: 100% !important; border-top: none !important; max-height: 320px; }
        }
      `}</style>

      {/* ── Body ── */}
      <div className="rc-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT — table */}
        <div className="rc-left" style={{ flex: 1, padding: '14px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
          <Table
            columns={COLUMNS}
            rows={filteredRows}
            rowKey="billNo"
            selected={selectedBill?.billNo}
            onRowClick={handleRowClick}
            emptyText="No receipts found"
          />
        </div>

        {/* RIGHT — inputs + numpad */}
        <div className="rc-right" style={{ width: 256, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Fields */}
          <div style={{ padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Bill No */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Bill No</label>
              <input
                ref={billRef}
                value={billNo}
                onChange={e => setBillNo(e.target.value)}
                onFocus={() => { setFocus('billNo'); setKeyboardOpen(false) }}
                placeholder="Enter bill no…"
                style={inputStyle(focus === 'billNo')}
              />
            </div>

            {/* Customer Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Customer Name</label>
              <input
                ref={custRef}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                onFocus={() => { setFocus('custName'); setKeyboardOpen(true) }}
                placeholder="Search customer…"
                style={inputStyle(focus === 'custName')}
              />
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', flexShrink: 0, marginInline: 14 }} />

          {/* Numpad */}
          <div style={{ padding: '10px 14px', flex: 1 }}>
            <Numpad
              onKey={handleNumKey}
              showDot={true}
              showClear={true}
              showBackspace={true}
              btnHeight={40}
              fontSize={15}
              gap={5}
            />
          </div>

          {/* Keyboard + Close row */}
          <div style={{ display: 'flex', gap: 6, padding: '0 14px 14px' }}>
            <button
              onClick={() => setKeyboardOpen(o => !o)}
              style={{
                flex: 1, height: 38, borderRadius: 9,
                border: `1.5px solid ${keyboardOpen ? 'var(--brand)' : 'var(--border)'}`,
                background: keyboardOpen ? 'var(--brand-bg)' : 'var(--surface)',
                color: keyboardOpen ? 'var(--brand)' : 'var(--text-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.14s',
              }}
              onMouseEnter={e => { if (!keyboardOpen) { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' } }}
              onMouseLeave={e => { if (!keyboardOpen) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' } }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              title="On-screen keyboard"
            >
              <Keyboard size={16} />
            </button>

            <button
              onClick={handlePrint}
              style={{
                flex: 2, height: 38, borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
                color: '#fff', fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer', boxShadow: '0 3px 10px rgba(120,8,41,0.2)',
                transition: 'filter 0.12s, transform 0.08s',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <Printer size={14} /> Print
            </button>

            <button
              onClick={onClose}
              style={{
                flex: 1, height: 38, borderRadius: 9,
                border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                color: 'var(--red)', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* ── Touch Keyboard ── */}
      {keyboardOpen && (
        <TouchKeyboard
          onKey={handleKbKey}
          onClose={() => setKeyboardOpen(false)}
        />
      )}
    </Modal>
  )
}

const labelStyle = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
  letterSpacing: 0.7, textTransform: 'uppercase',
}

const inputStyle = active => ({
  height: 36, borderRadius: 8, padding: '0 10px',
  border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
  background: active ? 'var(--brand-bg)' : '#fff',
  fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
  fontFamily: 'inherit',
  outline: 'none', width: '100%', boxSizing: 'border-box',
  transition: 'border-color 0.12s, background 0.12s',
})
