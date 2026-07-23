import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { ScanMode, SunmiScanHead, WriteContextType } from '@kduma-autoid/capacitor-sunmi-scanhead'

const DEBOUNCE_MS = 1500
const IS_ANDROID = Capacitor.getPlatform() === 'android'

const NOOP = { isScanning: false, error: null }

async function configureScannerOutput() {
  try {
    await SunmiScanHead.createWriteContext({ type: WriteContextType.Service })
    await SunmiScanHead.setOutputBroadcastEnabled({ enabled: true })
    await SunmiScanHead.setBroadcastConfiguration({
      scanned_intent: 'com.sunmi.scanner.ACTION_DATA_CODE_RECEIVED',
      start_intent: 'com.sunmi.scanner.ACTION_SCAN_START',
      end_intent: 'com.sunmi.scanner.ACTION_SCAN_END',
      intent_data_key: 'data',
      intent_byte_key: 'source_byte',
    })
    await SunmiScanHead.setTrigger({ enabled: true })
    await SunmiScanHead.setTriggerMethod({
      mode: ScanMode.Continuous,
      timeout: 5000,
      sleep: 300,
    })
    await SunmiScanHead.commitWriteContext()
  } catch (_err) {
    try { await SunmiScanHead.discardWriteContext() } catch (_discardErr) {}
  }
}

export function useBarcodeScanner({ onScan }) {
  const [scanState, setScanState] = useState({ bound: false, error: null })
  const onScanRef = useRef(onScan)
  const lastScanRef = useRef({ code: null, ts: 0 })
  const handlersRef = useRef({ result: null, stop: null })
  const restartTimer = useRef(null)
  const cancelledRef = useRef(false)

  useEffect(() => { onScanRef.current = onScan }, [onScan])

  useEffect(() => {
    if (!IS_ANDROID) return

    cancelledRef.current = false

    function scheduleRestart() {
      clearTimeout(restartTimer.current)
      restartTimer.current = setTimeout(async () => {
        if (cancelledRef.current) return
        try { await SunmiScanHead.scan() } catch (_e) {}
      }, 300)
    }

    async function init() {
      try {
        await SunmiScanHead.bindService()
        if (cancelledRef.current) return

        await configureScannerOutput()
        if (cancelledRef.current) return

        const resultHandle = await SunmiScanHead.addListener('onScanResult', ({ data }) => {
          if (!data || cancelledRef.current) return
          const now = Date.now()
          const last = lastScanRef.current
          if (data === last.code && now - last.ts < DEBOUNCE_MS) return
          lastScanRef.current = { code: data, ts: now }
          onScanRef.current?.(data)
          scheduleRestart()
        })

        const stopHandle = await SunmiScanHead.addListener('onScanStop', () => {
          if (cancelledRef.current) return
          scheduleRestart()
        })

        handlersRef.current = { result: resultHandle, stop: stopHandle }
        scheduleRestart()

        if (!cancelledRef.current) setScanState({ bound: true, error: null })
      } catch (err) {
        if (!cancelledRef.current) {
          setScanState({ bound: false, error: err?.message ?? 'Scanner service unavailable' })
        }
      }
    }

    init()

    return () => {
      cancelledRef.current = true
      clearTimeout(restartTimer.current)
      handlersRef.current.result?.remove()
      handlersRef.current.stop?.remove()
      handlersRef.current = { result: null, stop: null }
      SunmiScanHead.stop().catch(() => {})
      SunmiScanHead.unBindService().catch(() => {})
    }
  }, [])

  if (!IS_ANDROID) return NOOP
  return { isScanning: scanState.bound, error: scanState.error }
}
