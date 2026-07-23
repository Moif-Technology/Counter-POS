#!/usr/bin/env node
/**
 * MOIF Customer Display — WebSocket Relay Server
 *
 * Runs standalone for network displays (tablets, second PCs on same WiFi).
 * POS app connects as sender; customer display browsers connect as receivers.
 *
 * Usage:
 *   node customer-display-server.js [port=3001]
 *
 * POS connects to:
 *   ws://<this-machine-ip>:3001?role=pos
 *
 * Customer display opens:
 *   http://<pos-machine-ip>:5173/customer-display?ws=<this-machine-ip>
 *   (or just http://<pos-machine-ip>:5173/customer-display if same machine)
 *
 * Install ws once: npm install ws --save-dev
 */

import { WebSocketServer } from 'ws'
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'

const PORT = Number(process.argv[2] ?? 3001)

// HTTP health-check endpoint
const http = createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify({ status: 'ok', service: 'MOIF Customer Display Relay', port: PORT }))
})

const wss = new WebSocketServer({ server: http })

const pos = new Set()
const displays = new Set()
let lastState = null

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const role = url.searchParams.get('role') ?? 'display'

  if (role === 'pos') {
    pos.add(ws)
    log(`[+] POS sender connected  (pos=${pos.size}, displays=${displays.size})`)

    ws.on('message', data => {
      lastState = data           // cache latest state for new display connections
      for (const d of displays) {
        if (d.readyState === 1) d.send(data)
      }
    })

    ws.on('close', () => {
      pos.delete(ws)
      log(`[-] POS sender disconnected  (pos=${pos.size}, displays=${displays.size})`)
    })
  } else {
    displays.add(ws)
    log(`[+] Display connected  (pos=${pos.size}, displays=${displays.size})`)

    // Send last known state immediately so display doesn't wait for next scan
    if (lastState) {
      try { ws.send(lastState) } catch {}
    }

    ws.on('close', () => {
      displays.delete(ws)
      log(`[-] Display disconnected  (pos=${pos.size}, displays=${displays.size})`)
    })
  }

  ws.on('error', () => { pos.delete(ws); displays.delete(ws) })
})

http.listen(PORT, () => {
  log(`Customer Display Relay listening on port ${PORT}`)
  log('')
  log('POS app connects as:      ws://<this-ip>:' + PORT + '?role=pos')
  log('Customer display opens:   http://<pos-ip>:<vite-port>/customer-display?ws=<this-ip>')
  log('')
  log('Local IPs:')
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        log(`  ${name}: ${addr.address}`)
      }
    }
  }
})

function log(msg) { console.log(msg) }
