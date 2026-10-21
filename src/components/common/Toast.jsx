import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore } from '../../lib/toast'
import { snackbar, keyframes } from './theme'

// Renders toasts raised with `toast(...)` from lib/toast. Mounted once in App.

const ICONS = {
  success: CheckCircle,
  danger:  XCircle,
  warning: AlertTriangle,
  info:    Info,
  brand:   CheckCircle,
  neutral: Info,
}

function ToastItem({ id, message, type, duration, onRemove }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setLeaving(true); setTimeout(() => onRemove(id), 200) }, duration)
    return () => clearTimeout(t)
  }, [id, duration, onRemove])

  const Icon = ICONS[type] || Info

  return (
    <div style={{
      ...snackbar.base,
      ...snackbar[type],
      opacity: leaving ? 0 : 1,
      transform: leaving ? 'translateY(8px)' : 'translateY(0)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
    }}>
      <Icon size={15} style={{ flexShrink: 0, opacity: 0.9 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => { setLeaving(true); setTimeout(() => onRemove(id), 200) }}
        style={{
          background: 'rgba(255,255,255,0.2)', border: 'none',
          borderRadius: 6, width: 20, height: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', flexShrink: 0, padding: 0,
        }}
      >
        <X size={11} />
      </button>
    </div>
  )
}

export default function ToastHost() {
  const toasts = useToastStore(s => s.toasts)
  const remove = useToastStore(s => s.remove)
  return (
    <>
      <style>{keyframes.slideUp}</style>
      <div style={snackbar.container}>
        {toasts.map(t => <ToastItem key={t.id} {...t} onRemove={remove} />)}
      </div>
    </>
  )
}
