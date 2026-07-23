import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Dev-only WebSocket relay for customer display.
 * POS app connects as ws://localhost:3001?role=pos
 * Network display browsers connect as ws://localhost:3001?role=display
 * Requires: npm install ws --save-dev
 */
function customerDisplayRelayPlugin() {
  let wss = null
  return {
    name: 'customer-display-relay',
    configureServer(server) {
      import('ws').then(({ WebSocketServer }) => {
        const pos = new Set()
        const displays = new Set()
        let lastState = null

        wss = new WebSocketServer({ port: 3001 })
        wss.on('connection', (ws, req) => {
          const url = new URL(req.url, 'http://localhost:3001')
          const role = url.searchParams.get('role') ?? 'display'

          if (role === 'pos') {
            pos.add(ws)
            ws.on('message', data => {
              lastState = data
              for (const d of displays) if (d.readyState === 1) d.send(data)
            })
            ws.on('close', () => pos.delete(ws))
          } else {
            displays.add(ws)
            if (lastState) { try { ws.send(lastState) } catch {} }
            ws.on('close', () => displays.delete(ws))
          }
          ws.on('error', () => { pos.delete(ws); displays.delete(ws) })
        })

        server.httpServer?.on('close', () => wss?.close())
        console.log('\x1b[32m[CustDisplay]\x1b[0m WS relay → ws://localhost:3001')
      }).catch(() => {
        console.warn('[CustDisplay] ws package missing — run: npm install ws --save-dev')
      })
    },
    closeBundle() { wss?.close() },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), customerDisplayRelayPlugin()],
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5010',
        changeOrigin: true,
      },
    },
  },
})
