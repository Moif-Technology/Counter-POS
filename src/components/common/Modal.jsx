import { useRef } from 'react'
import { X } from 'lucide-react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { gradient } from './theme'

/*
 * Modal — the standard POS popup shell: blurred overlay, rounded card,
 * brand-gradient header (icon + kicker + title + close button).
 *
 *   <Modal
 *     onClose={onClose}
 *     icon={SlidersHorizontal}
 *     kicker="Quantity Change"
 *     title={item.description}
 *     width={500}
 *   >
 *     …body…
 *   </Modal>
 *
 * Props:
 *   onClose          — () => void   (backdrop click, Escape, ✕ button)
 *   icon             — lucide icon component shown in the header
 *   kicker           — small uppercase line above the title
 *   title            — header title (string or node)
 *   leading          — node rendered before the icon (e.g. a back button)
 *   headerRight      — node rendered before the close button
 *   header           — node replacing the default header entirely (false = no header)
 *   footer           — node rendered in a footer bar
 *   width            — card width (default 500)
 *   maxHeight        — card max height (default '90vh')
 *   zIndex           — overlay z-index (default 1000)
 *   closeOnBackdrop  — default true
 *   closeOnEsc       — default true; pass false when the modal handles Escape itself
 *   cardStyle        — extra card styles
 *   cardClassName    — class on the card (e.g. scrollbar styling)
 *   bodyStyle        — extra body styles
 */
export default function Modal({
  onClose,
  icon,
  kicker,
  title,
  leading,
  headerRight,
  header,
  footer,
  width = 500,
  maxHeight = '90vh',
  zIndex = 1000,
  closeOnBackdrop = true,
  closeOnEsc = true,
  cardStyle,
  cardClassName,
  bodyStyle,
  children,
}) {
  const overlayRef = useRef(null)
  useEscapeKey(onClose, closeOnEsc && !!onClose)

  return (
    <div
      ref={overlayRef} data-pos-overlay
      onClick={e => closeOnBackdrop && e.target === overlayRef.current && onClose?.()}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: 'rgba(10,8,6,0.42)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pos-modal-fade 0.15s ease',
      }}
    >
      <div className={cardClassName} style={{
        width, maxWidth: '96vw', maxHeight,
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'pos-modal-slide 0.18s cubic-bezier(.22,.68,0,1.2)',
        ...cardStyle,
      }}>
        {header === undefined
          ? <ModalHeader leading={leading} icon={icon} kicker={kicker} title={title} right={headerRight} onClose={onClose} />
          : header}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto', ...bodyStyle }}>
          {children}
        </div>

        {footer && <ModalFooter>{footer}</ModalFooter>}
      </div>
    </div>
  )
}

export function ModalHeader({ leading, icon: Icon, kicker, title, right, onClose, style }) {
  return (
    <div style={{
      background: gradient.brand,
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      gap: 12,
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {leading}
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} color="#fff" />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          {kicker && (
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {kicker}
            </p>
          )}
          {title && (
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {right}
        {onClose && <ModalCloseButton onClick={onClose} />}
      </div>
    </div>
  )
}

export function ModalCloseButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      style={{
        width: 28, height: 28, borderRadius: 7,
        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', cursor: 'pointer', transition: 'background 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
    >
      <X size={13} />
    </button>
  )
}

export function ModalFooter({ children, style }) {
  return (
    <div style={{
      display: 'flex', gap: 8, padding: '12px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface-2)', flexShrink: 0,
      ...style,
    }}>
      {children}
    </div>
  )
}
