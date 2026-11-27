// Native bridge for the Windows build: silent receipt printing. Everything else is plain HTTP.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('posDesktop', {
  isDesktop: true,
  printHtml: (html, opts) => ipcRenderer.invoke('pos-print-html', html, opts),
  listPrinters: () => ipcRenderer.invoke('pos-list-printers'),
  openDrawer: (opts) => ipcRenderer.invoke('pos-open-drawer', opts),
  installUpdate: (url, sha256) => ipcRenderer.invoke('pos-install-update', { url, sha256 }),
})
