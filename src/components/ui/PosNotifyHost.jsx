import { useEffect, useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, HelpCircle, Minus, Plus } from 'lucide-react'
import { usePosNotify } from '../../lib/posNotify'
import { colors, shadow, gradient } from './theme'

const BRAND_BTN = {
  btnBg: gradient.brand,
  btnShadow: shadow.brand,
  btnOutlineBg: colors.brandBg,
  btnOutlineBorder: colors.brandBorder,
  btnOutlineColor: colors.brand,
}

const THEMES = {
  success: {
    icon: CheckCircle,
    ring: colors.brandBg,
    ringBorder: colors.brandBorder,
    iconColor: colors.brand,
    ...BRAND_BTN,
  },
  brand: {
    icon: CheckCircle,
    ring: colors.brandBg,
    ringBorder: colors.brandBorder,
    iconColor: colors.brand,
    ...BRAND_BTN,
  },
  danger: {
    icon: XCircle,
    ring: colors.redBg,
    ringBorder: colors.redBorder,
    iconColor: colors.red,
    ...BRAND_BTN,
  },
  warning: {
    icon: AlertTriangle,
    ring: colors.amberBg,
    ringBorder: colors.amberBorder,
    iconColor: colors.amber,
    ...BRAND_BTN,
  },
  info: {
    icon: Info,
    ring: colors.blueBg,
    ringBorder: colors.blueBorder,
    iconColor: colors.blue,
    ...BRAND_BTN,
  },
  question: {
    icon: HelpCircle,
    ring: colors.brandBg,
    ringBorder: colors.brandBorder,
    iconColor: colors.brand,
    ...BRAND_BTN,
  },
}

const SWAL_CSS = `
  @keyframes swalFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes swalPopIn {
    0%   { opacity: 0; transform: scale(0.6) translateY(20px); }
    70%  { transform: scale(1.04) translateY(0); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes swalPopOut {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.92); }
  }
  @keyframes swalIconPop {
    0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
    60%  { transform: scale(1.15) rotate(4deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes swalTimerShrink {
    from { width: 100%; }
    to   { width: 0%; }
  }
`

function SwalOverlay({ visible, onBackdropClick, children }) {
  return (
    <div
      data-pos-overlay
      onClick={onBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 10050,
        background: 'rgba(10,8,6,0.42)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: visible ? 'swalFadeIn 0.2s ease' : undefined,
        opacity: visible ? 1 : 0,
        transition: visible ? undefined : 'opacity 0.15s ease',
      }}
    >
      {children}
    </div>
  )
}

function SwalCard({ visible, leaving, onClick, children }) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      onClick={onClick}
      style={{
        background: colors.white,
        borderRadius: 20,
        width: 'min(400px, calc(100vw - 40px))',
        padding: '28px 28px 24px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        animation: leaving
          ? 'swalPopOut 0.18s ease forwards'
          : visible
            ? 'swalPopIn 0.38s cubic-bezier(.34,1.56,.64,1) forwards'
            : undefined,
      }}
    >
      {children}
    </div>
  )
}

function SwalIcon({ type }) {
  const theme = THEMES[type] || THEMES.info
  const Icon = theme.icon
  return (
    <div style={{
      width: 72, height: 72, borderRadius: '50%',
      background: theme.ring,
      border: `3px solid ${theme.ringBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 18px',
      animation: 'swalIconPop 0.5s cubic-bezier(.34,1.56,.64,1) 0.1s both',
    }}>
      <Icon size={36} color={theme.iconColor} strokeWidth={2.2} />
    </div>
  )
}

function SwalButton({ children, onClick, theme, variant = 'primary', autoFocus }) {
  const isPrimary = variant === 'primary'
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '11px 20px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: 0.3,
        cursor: 'pointer',
        border: isPrimary
          ? 'none'
          : `1.5px solid ${theme.btnOutlineBorder}`,
        background: isPrimary ? theme.btnBg : theme.btnOutlineBg,
        color: isPrimary ? '#fff' : theme.btnOutlineColor,
        boxShadow: isPrimary ? theme.btnShadow : 'none',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        if (isPrimary) {
          e.currentTarget.style.boxShadow = shadow.brandHover
        } else {
          e.currentTarget.style.background = colors.brandTint
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        if (isPrimary) {
          e.currentTarget.style.boxShadow = theme.btnShadow
        } else {
          e.currentTarget.style.background = theme.btnOutlineBg
        }
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
    >
      {children}
    </button>
  )
}

function AlertDialog({ alert, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const theme = THEMES[alert.type] || THEMES.info

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const close = useCallback(() => {
    setLeaving(true)
    setTimeout(() => onDismiss(alert.id), alert.timer ? 100 : 180)
  }, [alert.id, alert.timer, onDismiss])

  useEffect(() => {
    if (!alert.timer || leaving) return
    const t = setTimeout(close, alert.timer)
    return () => clearTimeout(t)
  }, [alert.timer, close, leaving])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <SwalOverlay visible={visible && !leaving} onBackdropClick={close}>
      <SwalCard visible={visible} leaving={leaving} onClick={e => e.stopPropagation()}>
        <SwalIcon type={alert.type} />
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: colors.text1,
          marginBottom: 8, lineHeight: 1.25,
        }}>
          {alert.title}
        </h2>
        <p style={{
          fontSize: 14, color: colors.text2, lineHeight: 1.55,
          marginBottom: 24, padding: '0 4px',
        }}>
          {alert.message}
        </p>
        <div style={{ position: 'relative' }}>
          <SwalButton theme={theme} onClick={close} autoFocus>
            {alert.okLabel}
          </SwalButton>
          {alert.timer && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              borderRadius: '0 0 10px 10px', overflow: 'hidden', pointerEvents: 'none',
            }}>
              <div style={{
                height: '100%',
                background: 'rgba(255,255,255,0.45)',
                animation: `swalTimerShrink ${alert.timer}ms linear forwards`,
              }} />
            </div>
          )}
        </div>
      </SwalCard>
    </SwalOverlay>
  )
}

function PromptDialog({ prompt, onResolve }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [count, setCount] = useState(1)
  const countRef = useRef(1)
  const theme = THEMES.question
  const minCopies = Math.max(1, Number(prompt?.min) || 1)
  const maxCopies = Math.max(minCopies, Number(prompt?.max) || 20)
  const defaultCount = Math.min(
    maxCopies,
    Math.max(minCopies, parseInt(String(prompt?.defaultValue ?? '1'), 10) || 1),
  )

  useEffect(() => {
    countRef.current = count
  }, [count])

  useEffect(() => {
    if (prompt) {
      setLeaving(false)
      setCount(defaultCount)
      countRef.current = defaultCount
      const t = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(t)
    }
    setVisible(false)
    setLeaving(false)
  }, [prompt, defaultCount])

  const close = useCallback((result) => {
    setLeaving(true)
    setTimeout(() => onResolve(result), 180)
  }, [onResolve])

  const submit = useCallback(() => {
    close(String(count))
  }, [close, count])

  const decrement = useCallback(() => {
    setCount((c) => {
      const next = Math.max(minCopies, c - 1)
      countRef.current = next
      return next
    })
  }, [minCopies])

  const increment = useCallback(() => {
    setCount((c) => {
      const next = Math.min(maxCopies, c + 1)
      countRef.current = next
      return next
    })
  }, [maxCopies])

  useEffect(() => {
    if (!prompt || !visible || leaving) return undefined

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') {
        e.preventDefault()
        close(null)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        submit()
        return
      }
      if (e.key === '-' || e.key === 'ArrowDown') {
        e.preventDefault()
        decrement()
        return
      }
      if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') {
        e.preventDefault()
        increment()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [prompt, visible, leaving, close, submit, decrement, increment])

  if (!prompt) return null

  const stepBtnStyle = {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: 12,
    border: `2px solid ${colors.brandBorder}`,
    background: colors.brandBg,
    color: colors.brand,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s ease',
  }

  return (
    <SwalOverlay visible={visible && !leaving} onBackdropClick={() => close(null)}>
      <SwalCard visible={visible} leaving={leaving} onClick={e => e.stopPropagation()}>
        <SwalIcon type="question" />
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: colors.text1,
          marginBottom: 8, lineHeight: 1.25,
        }}>
          {prompt.title}
        </h2>
        <p style={{
          fontSize: 14, color: colors.text2, lineHeight: 1.55,
          marginBottom: 16, padding: '0 4px',
        }}>
          {prompt.message}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            aria-label="Fewer copies"
            disabled={count <= minCopies}
            onClick={decrement}
            style={{
              ...stepBtnStyle,
              opacity: count <= minCopies ? 0.4 : 1,
              cursor: count <= minCopies ? 'not-allowed' : 'pointer',
            }}
            onMouseDown={e => { if (count > minCopies) e.currentTarget.style.transform = 'scale(0.94)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Minus size={28} strokeWidth={3} />
          </button>
          <div
            aria-label="Number of copies"
            style={{
              flex: 1,
              minWidth: 80,
              height: 56,
              borderRadius: 12,
              border: `2px solid ${colors.brandBorder}`,
              background: colors.brandBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 900,
              fontFamily: "'JetBrains Mono', monospace",
              color: colors.brand,
            }}
          >
            {count}
          </div>
          <button
            type="button"
            aria-label="More copies"
            disabled={count >= maxCopies}
            onClick={increment}
            style={{
              ...stepBtnStyle,
              opacity: count >= maxCopies ? 0.4 : 1,
              cursor: count >= maxCopies ? 'not-allowed' : 'pointer',
            }}
            onMouseDown={e => { if (count < maxCopies) e.currentTarget.style.transform = 'scale(0.94)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Plus size={28} strokeWidth={3} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <SwalButton theme={theme} variant="secondary" onClick={() => close(null)}>
            {prompt.cancelLabel}
          </SwalButton>
          <SwalButton theme={theme} variant="primary" onClick={submit}>
            {prompt.confirmLabel}
          </SwalButton>
        </div>
      </SwalCard>
    </SwalOverlay>
  )
}

function ConfirmDialog({ confirm, onResolve }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const theme = confirm?.danger ? THEMES.warning : THEMES.question

  useEffect(() => {
    if (confirm) {
      const t = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(t)
    }
    setVisible(false)
  }, [confirm])

  if (!confirm) return null

  const close = (value) => {
    setLeaving(true)
    setTimeout(() => onResolve(value), 180)
  }

  return (
    <SwalOverlay visible={visible && !leaving} onBackdropClick={() => close(false)}>
      <SwalCard visible={visible} leaving={leaving} onClick={e => e.stopPropagation()}>
        <SwalIcon type={confirm.danger ? 'warning' : 'question'} />
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: colors.text1,
          marginBottom: 8, lineHeight: 1.25,
        }}>
          {confirm.title}
        </h2>
        <p style={{
          fontSize: 14, color: colors.text2, lineHeight: 1.55,
          marginBottom: 24, padding: '0 4px',
        }}>
          {confirm.message}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <SwalButton theme={theme} variant="secondary" onClick={() => close(false)}>
            {confirm.cancelLabel}
          </SwalButton>
          <SwalButton theme={theme} variant="primary" onClick={() => close(true)} autoFocus>
            {confirm.confirmLabel}
          </SwalButton>
        </div>
      </SwalCard>
    </SwalOverlay>
  )
}

/** Mount once at app root — SweetAlert-style alerts & confirms. */
export default function PosNotifyHost() {
  const alerts = usePosNotify(s => s.alerts)
  const confirm = usePosNotify(s => s.confirm)
  const prompt = usePosNotify(s => s.prompt)
  const dismissAlert = usePosNotify(s => s.dismissAlert)
  const resolveConfirm = usePosNotify(s => s.resolveConfirm)
  const resolvePrompt = usePosNotify(s => s.resolvePrompt)

  const currentAlert = alerts[0]
  const modalOpen = !!(confirm || prompt)

  return (
    <>
      <style>{SWAL_CSS}</style>
      {currentAlert && !modalOpen && (
        <AlertDialog alert={currentAlert} onDismiss={dismissAlert} />
      )}
      <ConfirmDialog confirm={confirm} onResolve={resolveConfirm} />
      <PromptDialog prompt={prompt} onResolve={resolvePrompt} />
    </>
  )
}
