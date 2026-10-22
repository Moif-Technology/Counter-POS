import { ScanLine } from 'lucide-react'
import BarcodeInput from './BarcodeInput'
import CustomerSearch from './CustomerSearch'

/** Customer search + barcode entry + Sunmi scan button, with the scanner status strip below. */
export default function PosScanBar({ scanning, sunmiScanOpen, onEnter, onSunmiScan }) {
  const isScanning = false
  const scannerError = null

  return (
    <>
      <div className="pos-topbar">
        <div className="pos-topbar-customer"><CustomerSearch /></div>

        <div className="pos-topbar-barcode" style={{ flex: 1, minWidth: 0, opacity: scanning ? 0.72 : 1 }}>
          <BarcodeInput onEnter={onEnter} />
        </div>

        <button
          className="pos-scan-btn"
          data-pos-skip-refocus
          disabled={sunmiScanOpen || scanning}
          onClick={onSunmiScan}
          style={{
            height: 42, minWidth: 92, flexShrink: 0,
            borderRadius: 'var(--r-md)',
            border: '1.5px solid var(--brand-border)',
            background: sunmiScanOpen ? 'var(--surface-2)' : 'var(--brand)',
            color: sunmiScanOpen ? 'var(--text-3)' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            fontSize: 13, fontWeight: 800, letterSpacing: 0.2,
            cursor: sunmiScanOpen || scanning ? 'not-allowed' : 'pointer',
            opacity: sunmiScanOpen || scanning ? 0.72 : 1,
            transition: 'all 0.12s',
          }}
        >
          <ScanLine size={16} />
          <span className="pos-scan-label">{sunmiScanOpen ? 'Scanning' : 'Scan'}</span>
        </button>
      </div>

      {/* Sunmi scanner status strip — visible on Android when scanner is active */}
      <div className={`pos-scanner-preview${isScanning ? ' active' : ''}`}>
        {scannerError ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', letterSpacing: 0.3 }}>
            ⚠ {scannerError}
          </span>
        ) : (
          <>
            <div className="scanner-dot" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', letterSpacing: 0.5 }}>
              SCANNER READY
            </span>
          </>
        )}
      </div>
    </>
  )
}
