import { useEffect, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

const canFullscreen = () => typeof document !== 'undefined' && document.fullscreenEnabled

/** Top-bar button: enter / leave browser full screen. Hidden where full screen isn't available. */
export default function PosFullscreenButton() {
  const [isFull, setIsFull] = useState(() => !!document.fullscreenElement)

  // Track F11 / Esc exits as well as this button.
  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (!canFullscreen()) return null

  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const label = isFull ? 'Exit full screen' : 'Full screen'
  return (
    <button className="ph-top-lite ph-top-fullscreen" data-pos-skip-refocus onClick={toggle} title={label} aria-label={label}>
      {isFull ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
    </button>
  )
}
