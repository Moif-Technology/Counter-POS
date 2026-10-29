import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Keyboard, Check, Trash2 } from 'lucide-react'
import TouchKeyboard from '../components/common/Keyboard'
import { usePosStore } from '../store/posStore'
import Modal from '../components/common/Modal'
import { posNotifySuccess } from '../lib/posNotify'

export default function CommentsModal({ onClose, onSave }) {
  const billComment    = usePosStore(s => s.billComment)
  const setBillComment = usePosStore(s => s.setBillComment)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const textareaRef = useRef()

  useEffect(() => {
    textareaRef.current?.focus()
  }, [onClose])

  const handleKbKey = k => {
    if (k === '⌫')    { setBillComment(v => v.slice(0, -1)); return }
    if (k === 'ENTER') { setBillComment(v => v + '\n'); return }
    setBillComment(v => v + k)
  }

  const handleDone = () => {
    onSave?.(billComment.trim())
    posNotifySuccess(billComment.trim() ? 'Bill comment saved' : 'Bill comment cleared', { title: 'Comments', duration: 1500 })
    onClose()
  }

  return (
    <Modal onClose={onClose} icon={MessageSquare} kicker="Note" title="Comments" width={560}>

      {/* ── Textarea ── */}
      <div style={{ padding: '16px 18px 10px', flexShrink: 0 }}>

        {/* Label row with keyboard icon + clear */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Comment
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Clear button */}
            {billComment && (
              <button
                onClick={() => { setBillComment(''); textareaRef.current?.focus() }}
                style={{
                  width: 30, height: 30, borderRadius: 7,
                  border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
                  color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
                title="Clear"
              >
                <Trash2 size={13} />
              </button>
            )}
            {/* Keyboard icon button */}
            <button
              onClick={() => { setKeyboardOpen(o => !o); textareaRef.current?.blur() }}
              style={{
                width: 30, height: 30, borderRadius: 7,
                border: `1.5px solid ${keyboardOpen ? 'var(--brand)' : 'var(--border)'}`,
                background: keyboardOpen ? 'var(--brand-bg)' : 'var(--surface)',
                color: keyboardOpen ? 'var(--brand)' : 'var(--text-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.14s',
              }}
              onMouseEnter={e => { if (!keyboardOpen) { e.currentTarget.style.background = 'var(--brand-bg)'; e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' } }}
              onMouseLeave={e => { if (!keyboardOpen) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' } }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              title="On-screen keyboard"
            >
              <Keyboard size={14} />
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={billComment}
          onChange={e => setBillComment(e.target.value)}
          placeholder="Type your comment here…"
          rows={keyboardOpen ? 3 : 6}
          style={{
            width: '100%', boxSizing: 'border-box',
            borderRadius: 10, padding: '12px 14px',
            border: '1.5px solid var(--border)',
            background: '#fff',
            fontSize: 14, fontWeight: 500, color: 'var(--text-1)',
            fontFamily: 'inherit', lineHeight: 1.7,
            resize: 'none', outline: 'none',
            transition: 'border-color 0.14s, background 0.14s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-2)' }}
          onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border)' }}
        />

        {/* Character count */}
        <div style={{ textAlign: 'right', marginTop: 4, fontSize: 10, color: 'var(--text-4)', fontWeight: 600 }}>
          {billComment.length} characters
        </div>
      </div>

      {/* ── Touch Keyboard ── */}
      {keyboardOpen && (
        <TouchKeyboard
          onKey={handleKbKey}
          onClose={() => { setKeyboardOpen(false); textareaRef.current?.focus() }}
        />
      )}

      {/* ── Footer ── */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 18px 14px',
        borderTop: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, height: 42, borderRadius: 10,
            border: '1.5px solid var(--red-border)', background: 'var(--red-bg)',
            color: 'var(--red)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          Cancel
        </button>

        <button
          onClick={handleDone}
          style={{
            flex: 2, height: 42, borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
            color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: '0 4px 14px rgba(120,8,41,0.22)',
            transition: 'filter 0.12s, transform 0.08s',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <Check size={15} /> Done
        </button>
      </div>
    </Modal>
  )
}
