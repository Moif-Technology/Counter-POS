import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtMoney, setCurrencyPrecision } from '../../lib/currencyFormat'

const CHANNEL_KEY = 'moif-customer-display'
const WS_PORT = 3001
const COLS = 20

const INITIAL = {
  mode: 'idle',
  shopName: 'MOIF TECHNOLOGY',
  shopSubName: 'Point of Sale',
  currency: 'AED',
  billNo: '',
  cashierName: '',
  customerName: '',
  lastItem: null,
  cartItems: [],
  itemCount: 0,
  subTotal: 0,
  discountAmt: 0,
  taxAmt: 0,
  netAmount: 0,
  paidAmount: 0,
  balanceAmount: 0,
  paymentMode: 'CASH',
}

function fmt(n, cur = 'AED') {
  return `${cur} ${fmtMoney(n)}`
}

// ── Brand colors (mirrors index.css --brand tokens) ──────────────
const BRAND       = 'var(--brand)'
const BRAND_2     = 'var(--brand-2)'
const BRAND_LIGHT = 'var(--brand-light)'

// ── Light theme tokens ────────────────────────────────────────────
const BG       = 'var(--palette-11)'
const SURFACE  = '#ffffff'
const BORDER   = 'var(--border)'
const TEXT_1   = 'var(--text-1)'
const TEXT_2   = 'var(--text-2)'
const TEXT_3   = 'var(--text-3)'

// ── 2-Line VFD Pole Display Simulation ───────────────────────────
function TwoLineDisplay({ data }) {
  const { mode, lastItem, netAmount, balanceAmount, currency, shopName } = data
  const c = currency || 'AED'

  function lines() {
    if (mode === 'idle') return ['WELCOME'.padEnd(COLS), 'Please wait...'.padEnd(COLS)]
    if (mode === 'saved') {
      const chg = balanceAmount > 0
        ? `CHG ${c} ${fmtMoney(balanceAmount)}`
        : 'THANK YOU!'
      return ['BILL SAVED'.padEnd(COLS), chg.substring(0, COLS).padEnd(COLS)]
    }
    const totalStr = `${c} ${fmtMoney(netAmount)}`
    const totalLine = ('TOTAL' + totalStr.padStart(COLS - 5)).substring(0, COLS)
    if (lastItem) {
      const desc = String(lastItem.description || '').substring(0, COLS)
      const amt = fmtMoney(lastItem.lineTotal)
      const gap = COLS - desc.length - amt.length
      const l1 = gap >= 1
        ? desc + ' '.repeat(gap) + amt
        : desc.substring(0, COLS - amt.length - 1) + ' ' + amt
      return [l1.substring(0, COLS), totalLine]
    }
    return [''.padEnd(COLS), totalLine]
  }

  const [l1, l2] = lines()

  return (
    <div style={{
      width: '100vw', height: '100vh', background: 'var(--palette-1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32,
    }}>
      <div style={{
        background: 'var(--palette-2)',
        border: '3px solid var(--palette-3)',
        borderRadius: 10,
        padding: '28px 36px',
        boxShadow: '0 0 60px rgba(241,230,233,0.08), inset 0 0 30px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          fontFamily: 'inherit',
          fontSize: 26,
          color: 'var(--palette-10)',
          textShadow: '0 0 6px var(--palette-10), 0 0 12px rgba(241,230,233,0.3)',
          letterSpacing: 3,
          lineHeight: 1.8,
          whiteSpace: 'pre',
          userSelect: 'none',
        }}>
          {l1}{'\n'}{l2}
        </div>
      </div>
      <div style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'inherit', letterSpacing: 2 }}>
        {shopName} · 20-CHARACTER VFD POLE DISPLAY
      </div>
    </div>
  )
}

// ── Idle Screen ───────────────────────────────────────────────────
function IdleScreen({ data }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: BG,
    }}>
      <div style={{
        width: 96, height: 96, borderRadius: 22,
        background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_2} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
        boxShadow: `0 10px 40px rgba(120,8,41,0.25)`,
      }}>
        <span style={{ fontSize: 46, color: '#fff', fontWeight: 900 }}>M</span>
      </div>

      <h1 style={{ color: TEXT_1, fontSize: 40, fontWeight: 900, margin: 0, letterSpacing: 2 }}>
        {data.shopName}
      </h1>
      <p style={{ color: TEXT_3, fontSize: 17, margin: '8px 0 52px', letterSpacing: 1 }}>
        {data.shopSubName}
      </p>

      <div style={{
        fontSize: 68, fontWeight: 200, color: TEXT_1,
        letterSpacing: 6, fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}>
        {timeStr}
      </div>
      <div style={{ color: TEXT_2, fontSize: 18, marginTop: 10, letterSpacing: 1 }}>
        {dateStr}
      </div>

      <div style={{
        marginTop: 60,
        padding: '14px 44px',
        border: `1px solid rgba(120,8,41,0.2)`,
        borderRadius: 100,
        color: TEXT_3,
        fontSize: 13,
        letterSpacing: 4,
        textTransform: 'uppercase',
      }}>
        Welcome — Please Present Your Items
      </div>
    </div>
  )
}

// ── Scanning Screen ───────────────────────────────────────────────
function ScanScreen({ data }) {
  const { cartItems = [], netAmount, subTotal, discountAmt, taxAmt, itemCount, currency, customerName } = data
  const cur = currency || 'AED'
  const listRef = useRef(null)

  // Auto-scroll to bottom whenever items change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [cartItems.length])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: BG, color: TEXT_1, minHeight: 0 }}>
      {customerName ? (
        <div style={{
          background: 'var(--palette-10)', borderBottom: `1px solid var(--brand-border)`,
          padding: '8px 24px', fontSize: 13, color: TEXT_2,
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span>Customer:</span>
          <strong style={{ color: BRAND }}>{customerName}</strong>
        </div>
      ) : null}

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 60px 110px 110px',
        padding: '9px 24px',
        background: SURFACE, borderBottom: `1.5px solid ${BORDER}`,
        flexShrink: 0,
      }}>
        {['DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT'].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: BRAND, textTransform: 'uppercase', textAlign: h === 'DESCRIPTION' ? 'left' : 'right' }}>
            {h}
          </div>
        ))}
      </div>

      {/* Scrollable item list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {cartItems.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: TEXT_3, fontSize: 18, letterSpacing: 2 }}>
            Waiting for scan…
          </div>
        ) : (
          cartItems.map((item, idx) => {
            const isLast = idx === cartItems.length - 1
            return (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '1fr 60px 110px 110px',
                padding: '11px 24px',
                borderBottom: `1px solid ${BORDER}`,
                background: isLast ? 'var(--palette-10)' : (idx % 2 === 0 ? SURFACE : 'var(--palette-10)'),
                borderLeft: isLast ? `3px solid ${BRAND}` : '3px solid transparent',
                transition: 'background 0.2s',
              }}>
                <div style={{ fontSize: 14, fontWeight: isLast ? 700 : 500, color: TEXT_1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {item.description}
                </div>
                <div style={{ fontSize: 14, fontWeight: isLast ? 700 : 400, color: isLast ? BRAND : TEXT_2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {item.qty}
                </div>
                <div style={{ fontSize: 14, fontWeight: 400, color: TEXT_2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtMoney(item.unitPriceGross)}
                </div>
                <div style={{ fontSize: 14, fontWeight: isLast ? 700 : 500, color: isLast ? BRAND : TEXT_1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtMoney(item.lineTotal)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bill totals bar */}
      <div style={{
        background: SURFACE,
        borderTop: `1.5px solid ${BORDER}`,
        padding: '14px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <Stat label="ITEMS" value={itemCount} />
          <Stat label="SUBTOTAL" value={fmt(subTotal, cur)} />
          {discountAmt > 0 && <Stat label="DISCOUNT" value={`-${fmt(discountAmt, cur)}`} green />}
          <Stat label="TAX" value={fmt(taxAmt, cur)} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: TEXT_3, fontSize: 11, letterSpacing: 3, marginBottom: 4 }}>
            TOTAL DUE
          </div>
          <div style={{
            fontSize: 48, fontWeight: 900, color: BRAND,
            letterSpacing: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(netAmount, cur)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Saved / Thank You Screen ──────────────────────────────────────
function SavedScreen({ data }) {
  const { netAmount, paidAmount, balanceAmount, currency } = data
  const cur = currency || 'AED'

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: BG,
      gap: 20,
    }}>
      <div style={{
        width: 90, height: 90, borderRadius: '50%',
        background: 'rgba(120,8,41,0.12)',
        border: '2px solid rgba(120,8,41,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 44, color: 'var(--palette-1)' }}>✓</span>
      </div>

      <h1 style={{ color: 'var(--brand)', fontSize: 52, fontWeight: 900, margin: 0, letterSpacing: 2 }}>
        THANK YOU!
      </h1>

      <div style={{ display: 'flex', gap: 56, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Stat label="TOTAL" value={fmt(netAmount, cur)} large />
        <Stat label="PAID" value={fmt(paidAmount, cur)} large />
        {balanceAmount > 0 && <Stat label="CHANGE" value={fmt(balanceAmount, cur)} green large />}
      </div>

      <div style={{
        marginTop: 24, color: TEXT_3,
        fontSize: 15, letterSpacing: 3, textTransform: 'uppercase',
      }}>
        Please come again!
      </div>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────
function Stat({ label, value, large, accent, green }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: TEXT_3, fontSize: 10, letterSpacing: 2.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontSize: large ? 32 : 22,
        fontWeight: large ? 600 : 400,
        color: accent ? BRAND : green ? 'var(--palette-1)' : TEXT_1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  )
}

function Divider({ char = '×' }) {
  return (
    <div style={{ color: BORDER, fontSize: 28, fontWeight: 200, userSelect: 'none' }}>
      {char}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function CustomerDisplayPage() {
  const [data, setData] = useState(INITIAL)
  const savedTimerRef = useRef(null)

  const params = new URLSearchParams(window.location.search)
  const displayMode = params.get('mode') // '2line' or null (full screen)
  const wsHost = params.get('ws')        // e.g. '192.168.1.10' for network display

  const updateData = useCallback((incoming) => {
    // When "saved" screen is active, suppress the next "idle" broadcast
    // (clearAll fires ~80ms after broadcastSaved — keep "thank you" visible for 3s)
    if (savedTimerRef.current && incoming.mode === 'idle') return

    // Separate window: POS sends its precision with each payload.
    if (incoming.currencyPrecision != null) setCurrencyPrecision(incoming.currencyPrecision)
    setData(prev => ({ ...prev, ...incoming }))

    if (incoming.mode === 'saved') {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => {
        savedTimerRef.current = null
        setData(prev => ({ ...prev, mode: 'idle' }))
      }, 3000)
    }
  }, [])

  useEffect(() => {
    // BroadcastChannel — same device (desktop second window or Android same WebView)
    let bc = null
    try {
      bc = new BroadcastChannel(CHANNEL_KEY)
      bc.onmessage = e => updateData(e.data)
    } catch {}

    // WebSocket — network display (tablet on same WiFi, or WS relay server)
    let ws = null
    const targetHost = wsHost || (window.location.hostname !== 'localhost' ? window.location.hostname : null)
    if (targetHost) {
      try {
        ws = new WebSocket(`ws://${targetHost}:${WS_PORT}?role=display`)
        ws.onmessage = e => {
          try {
            const msg = JSON.parse(e.data)
            if (msg.type === 'pos-state') updateData(msg.data)
          } catch {}
        }
      } catch {}
    }

    // Android Sunmi bridge — called by CustomerDisplayPlugin.java via evaluateJavascript
    window.__cdReceive = json => {
      try { updateData(JSON.parse(json)) } catch {}
    }

    return () => {
      bc?.close()
      ws?.close()
      delete window.__cdReceive
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [updateData])

  if (displayMode === '2line') {
    return <TwoLineDisplay data={data} />
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Top status bar — brand crimson header */}
      <div style={{
        background: `linear-gradient(145deg, ${BRAND} 0%, ${BRAND_2} 100%)`,
        borderBottom: `1px solid rgba(0,0,0,0.2)`,
        padding: '8px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700 }}>
          {data.shopName} · Customer Display
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          {data.billNo && (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>
              Bill #{data.billNo}
            </span>
          )}
          {data.cashierName && (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>
              {data.cashierName}
            </span>
          )}
        </div>
      </div>

      {data.mode === 'idle'     && <IdleScreen  data={data} />}
      {data.mode === 'scanning' && <ScanScreen  data={data} />}
      {data.mode === 'saved'    && <SavedScreen data={data} />}
    </div>
  )
}
