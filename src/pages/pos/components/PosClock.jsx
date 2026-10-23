import { useEffect, useState } from 'react'

/** Live clock — ticks on its own so the rest of the POS screen doesn't re-render every second. */
function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

const pad = n => String(n).padStart(2, '0')

/** 22-10-2026  12:12:19 PM */
export default function PosClock({ className }) {
  const d = useNow()
  const h = d.getHours() % 12 || 12
  return (
    <span className={className}>
      <span>{pad(d.getDate())}-{pad(d.getMonth() + 1)}-{d.getFullYear()}</span>
      <b>{pad(h)}:{pad(d.getMinutes())}:{pad(d.getSeconds())} {d.getHours() < 12 ? 'AM' : 'PM'}</b>
    </span>
  )
}
