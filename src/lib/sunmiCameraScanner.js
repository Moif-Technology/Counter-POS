import { Capacitor, registerPlugin } from '@capacitor/core'

const SunmiCameraScanner = registerPlugin('SunmiCameraScanner', {
  web: () => ({
    scan: () => Promise.reject(new Error('Sunmi scanner not available on web')),
  }),
})

function firstTextValue(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstTextValue(item)
      if (found) return found
    }
    return ''
  }
  if (typeof value === 'object') {
    const direct = value.VALUE ?? value.value ?? value.data ?? value.barcode ?? value.SCAN_RESULT
    const found = firstTextValue(direct)
    if (found) return found
  }
  return ''
}

export function extractSunmiBarcode(result) {
  if (result == null) return ''
  if (typeof result === 'string' || typeof result === 'number') return String(result).trim()

  return firstTextValue(
    result.barcode ??
    result.data ??
    result.SCAN_RESULT ??
    result.scanResult ??
    result.result ??
    result.SCAN_RESULT_LIST ??
    result.list ??
    result.values,
  )
}

export async function scanSunmiBarcode() {
  const result = await SunmiCameraScanner.scan()
  if (result?.cancelled) return null
  return extractSunmiBarcode(result)
}

export const IS_ANDROID = Capacitor.getPlatform() === 'android'
export { SunmiCameraScanner }
