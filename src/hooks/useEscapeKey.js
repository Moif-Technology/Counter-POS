import { useEffect, useRef } from 'react'

/** Call `handler` when Escape is pressed. Always sees the latest handler. */
export function useEscapeKey(handler, enabled = true) {
  const ref = useRef(handler)
  useEffect(() => { ref.current = handler })

  useEffect(() => {
    if (!enabled) return undefined
    const onKey = e => { if (e.key === 'Escape') ref.current?.(e) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
