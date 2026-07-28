const CHANNEL_KEY = 'moif-customer-display'

let _bc = null
let _ws = null
let _polePort = null
let _displayWin = null
let _sunmiPlugin = null

// ─── BroadcastChannel ─────────────────────────────────────────────
function ch() {
  if (!_bc) {
    try { _bc = new BroadcastChannel(CHANNEL_KEY) } catch {}
  }
  return _bc
}

// ─── Second window (desktop secondary monitor) ────────────────────
export function openDisplayWindow() {
  if (_displayWin && !_displayWin.closed) {
    _displayWin.focus()
    return _displayWin
  }
  _displayWin = window.open(
    `${window.location.origin}/customer-display`,
    'moif-customer-display',
    'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=no',
  )
  return _displayWin
}

export function isWindowOpen() {
  return !!(_displayWin && !_displayWin.closed)
}

export function closeDisplayWindow() {
  _displayWin?.close()
  _displayWin = null
}

// ─── WebSocket network relay ──────────────────────────────────────
export function connectNetworkDisplay(host = 'localhost', port = 3001) {
  if (_ws) _ws.close()
  const url = `ws://${host}:${port}?role=pos`
  _ws = new WebSocket(url)
  _ws.onopen = () => console.info('[CustDisplay] WS connected:', url)
  _ws.onclose = () => { _ws = null }
  _ws.onerror = () => { _ws = null }
  return _ws
}

export function disconnectNetworkDisplay() { _ws?.close(); _ws = null }
export function isNetworkConnected() { return _ws?.readyState === WebSocket.OPEN }

// ─── Sunmi Android plugin bridge ─────────────────────────────────
export function setSunmiDisplayPlugin(plugin) { _sunmiPlugin = plugin }

// ─── 2-Line pole display (Web Serial API) ────────────────────────
const COLS = 20

export async function connectPoleDisplay() {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API not available. Use Chrome or Edge on localhost or HTTPS.')
  }
  const port = await navigator.serial.requestPort()
  await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' })
  _polePort = port
  return port
}

export async function disconnectPoleDisplay() {
  try { await _polePort?.close() } catch {}
  _polePort = null
}

export function isPoleConnected() { return !!_polePort }

function poleLines(p) {
  const c = p.currency || 'AED'
  if (p.mode === 'idle') {
    return ['WELCOME'.padEnd(COLS), 'Please wait...'.padEnd(COLS)]
  }
  if (p.mode === 'saved') {
    const chg = p.balanceAmount > 0
      ? `CHG ${c} ${Number(p.balanceAmount).toFixed(2)}`
      : 'THANK YOU!'
    return ['BILL SAVED'.padEnd(COLS), chg.substring(0, COLS).padEnd(COLS)]
  }
  const totalStr = `${c} ${Number(p.netAmount || 0).toFixed(2)}`
  const totalLine = ('TOTAL' + totalStr.padStart(COLS - 5)).substring(0, COLS)
  if (p.lastItem) {
    const desc = String(p.lastItem.description || '').substring(0, COLS)
    const amt = Number(p.lastItem.lineTotal || 0).toFixed(2)
    const gap = COLS - desc.length - amt.length
    const line1 = gap >= 1
      ? desc + ' '.repeat(gap) + amt
      : desc.substring(0, COLS - amt.length - 1) + ' ' + amt
    return [line1.substring(0, COLS), totalLine]
  }
  return [''.padEnd(COLS), totalLine]
}

async function writePole(payload) {
  if (!_polePort) return
  try {
    const [l1, l2] = poleLines(payload)
    const writer = _polePort.writable.getWriter()
    // 0x0C = Form Feed — clears most VFD displays (Epson, Logic Controls, IEE)
    await writer.write(new Uint8Array([0x0C]))
    await writer.write(new TextEncoder().encode(l1 + '\r\n' + l2))
    writer.releaseLock()
  } catch {}
}

// ─── Broadcast to all outputs ─────────────────────────────────────
export function broadcast(payload) {
  ch()?.postMessage(payload)

  if (_ws?.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify({ type: 'pos-state', data: payload }))
  }

  if (_sunmiPlugin) {
    _sunmiPlugin.sendState({ json: JSON.stringify(payload) }).catch(() => {})
  }

  writePole(payload)
}

// ─── Build payload from posStore state ────────────────────────────
export function buildPayload(s) {
  const items = s.cartItems ?? []
  const last = items.length ? items[items.length - 1] : null
  return {
    mode: items.length ? 'scanning' : 'idle',
    shopName: s.shopName || 'MOIF POS',
    shopSubName: s.shopSubName || '',
    currency: s.currency || 'AED',
    billNo: s.billNo || '',
    cashierName: s.cashier?.staffName || '',
    customerName: s.customerName || '',
    lastItem: last
      ? {
          description: last.description,
          qty: last.qty,
          unitPriceGross: last.unitPriceGross,
          lineTotal: last.lineTotal ?? 0,
        }
      : null,
    cartItems: items.map(i => ({
      description: i.description,
      qty: i.qty,
      unitPriceGross: i.unitPriceGross ?? 0,
      lineTotal: i.lineTotal ?? 0,
    })),
    itemCount: items.length,
    subTotal: s.subTotal || 0,
    discountAmt: s.discountAmt || 0,
    taxAmt: s.taxAmt || 0,
    netAmount: s.netAmount || 0,
    paidAmount: s.paidAmount || 0,
    balanceAmount: s.balanceAmount || 0,
    paymentMode: s.paymentMode || 'CASH',
    ts: Date.now(),
  }
}

// Call this explicitly just before clearAll() after a successful save
export function broadcastSaved(netAmount, paidAmount, balanceAmount, currency) {
  broadcast({
    mode: 'saved',
    shopName: '', shopSubName: '',
    currency: currency || 'AED',
    billNo: '', cashierName: '', customerName: '',
    lastItem: null, itemCount: 0,
    subTotal: 0, discountAmt: 0, taxAmt: 0,
    netAmount: netAmount || 0,
    paidAmount: paidAmount || 0,
    balanceAmount: balanceAmount || 0,
    paymentMode: 'CASH',
    ts: Date.now(),
  })
}
