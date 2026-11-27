// Electron shell for Counter POS. Dev loads the Vite server; packaged serves dist/
// over app://counter-pos so BrowserRouter works and IndexedDB (offline bill queue)
// keeps one stable origin. Never change APP_HOST: a new origin = an empty queue.
const { app, BrowserWindow, Menu, ipcMain, net, protocol, shell } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { spawn } = require('node:child_process')
const { downloadInstaller } = require('./updateInstaller.cjs')

const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
const isDev = !app.isPackaged
const APP_HOST = 'counter-pos'
const DIST = path.join(__dirname, '..', 'dist')

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

// One till per PC: a second launch focuses the running window instead.
if (!app.requestSingleInstanceLock()) app.quit()

// 80mm head prints ~72mm, 58mm head ~50mm. Tall page; the thermal printer cuts at content end.
function silentPrint(win, opts = {}) {
  const widthMicrons = (Number(opts.paperMm) === 58 ? 50 : 72) * 1000
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Printer timed out')), 20000)
    win.webContents.print(
      {
        silent: true,
        ...(opts.deviceName ? { deviceName: opts.deviceName } : {}),
        printBackground: false,
        margins: { marginType: 'none' },
        pageSize: { width: widthMicrons, height: 3276 * 1000 },
      },
      (success, failureReason) => {
        clearTimeout(timer)
        if (!success) reject(new Error(failureReason || 'Printer failed'))
        else resolve()
      },
    )
  })
}

function hiddenWindow() {
  return new BrowserWindow({
    show: false,
    width: 320,
    height: 900,
    webPreferences: { contextIsolation: true, nodeIntegration: false, javascript: false },
  })
}

ipcMain.handle('pos-print-html', async (_event, html, opts) => {
  const win = hiddenWindow()
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(String(html ?? ''))}`)
    await silentPrint(win, opts || {})
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
})

// Cash drawer hangs off the receipt printer's RJ11 port: send it a raw ESC/POS kick through the
// Windows spooler (RAW datatype, bypasses the driver). Pin 2 then pin 5 so either drawer wiring opens.
// ponytail: PowerShell compiles the P/Invoke each press (~1s); keep a resident helper if that ever feels slow.
const DRAWER_PS = `$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class PosRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool OpenPrinter(string name, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern int StartDocPrinter(IntPtr h, int level, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool WritePrinter(IntPtr h, byte[] buf, int n, out int written);
  public static void Send(string printer, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Win32Exception();
    try {
      if (StartDocPrinter(h, 1, new DOCINFO { pDocName = "Cash drawer", pDataType = "RAW" }) == 0) throw new Win32Exception();
      try {
        StartPagePrinter(h);
        int written;
        if (!WritePrinter(h, data, data.Length, out written)) throw new Win32Exception();
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
"@
try { [PosRawPrinter]::Send($env:POS_DRAWER_PRINTER, [byte[]](0x1B,0x70,0x00,0x19,0xFA,0x1B,0x70,0x01,0x19,0xFA)) }
catch { $e = $_.Exception; while ($e.InnerException) { $e = $e.InnerException }; [Console]::Out.WriteLine($e.Message); exit 1 }`

ipcMain.handle('pos-open-drawer', async (event, opts = {}) => {
  let printer = opts.deviceName
  if (!printer) printer = (await event.sender.getPrintersAsync()).find((p) => p.isDefault)?.name
  if (!printer) throw new Error('No receipt printer set up')
  await new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', Buffer.from(DRAWER_PS, 'utf16le').toString('base64'),
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, POS_DRAWER_PRINTER: printer } })
    let err = '' // script prints the failure reason on stdout (stderr comes CLIXML-wrapped)
    child.stdout.on('data', (d) => { err += d })
    const timer = setTimeout(() => { child.kill(); reject(new Error('Cash drawer timed out')) }, 15000)
    child.once('error', (e) => { clearTimeout(timer); reject(e) })
    child.once('exit', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`Cash drawer failed on "${printer}": ${err.trim().slice(0, 200) || `exit ${code}`}`))
    })
  })
})

// Update: download + verify, then run the installer as an in-place upgrade (/S --updated) and quit,
// so no file is locked and no uninstall is needed. elevate.exe (shipped by electron-builder) raises
// the UAC prompt the per-machine installer needs; --force-run reopens the till when done.
ipcMain.handle('pos-install-update', async (_event, { url, sha256 } = {}) => {
  const file = await downloadInstaller(url, sha256, app.getPath('temp'))
  const elevate = path.join(process.resourcesPath, 'elevate.exe')
  if (!fs.existsSync(elevate)) throw new Error('Installer helper missing (dev build?)')
  const code = await new Promise((resolve, reject) => {
    const child = spawn(elevate, [file, '/S', '--updated', '--force-run'], { detached: true, stdio: 'ignore' })
    child.once('error', reject)
    child.once('exit', resolve)
  })
  if (code !== 0) throw new Error('Install cancelled')
  setTimeout(() => app.quit(), 300)
})

ipcMain.handle('pos-list-printers', async () => {
  const win = hiddenWindow()
  try {
    const printers = await win.webContents.getPrintersAsync()
    return printers.map((p) => ({ name: p.name, isDefault: !!p.isDefault }))
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.once('ready-to-show', () => { win.maximize(); win.show() })
  // App pages (customer display) open as app windows; web links go to the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || url.startsWith(`app://${APP_HOST}/`) || url.startsWith(DEV_URL)) return { action: 'allow' }
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.loadURL(isDev ? DEV_URL : `app://${APP_HOST}/`)
  return win
}

Menu.setApplicationMenu(null)

app.whenReady().then(() => {
  // Static file if it exists in dist/, else index.html (SPA routes like /login, /customer-display).
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname)
    const file = path.normalize(path.join(DIST, rel))
    const inDist = file.startsWith(DIST + path.sep)
    const target = inDist && fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(DIST, 'index.html')
    return net.fetch(pathToFileURL(target).toString())
  })

  let mainWin = createWindow()
  app.on('second-instance', () => {
    if (mainWin.isDestroyed()) return
    if (mainWin.isMinimized()) mainWin.restore()
    mainWin.focus()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWin = createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
