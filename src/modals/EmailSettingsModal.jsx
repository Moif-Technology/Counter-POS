import { useState } from 'react'
import { Mail, AtSign, Eye, EyeOff, Send, Paperclip, X, Save, Check } from 'lucide-react'
import { posNotifySuccess } from '../lib/posNotify'
import Modal from '../components/common/Modal'
import './EmailSettingsModal.css'

/*
 * eMail Settings — sender address + password, one or more "To" addresses
 * (type and press Enter / comma to add), and the attachment name.
 *
 * Saved on this counter (localStorage) until the server has an endpoint for it:
 * swap loadSettings / saveSettings to move it to the backend.
 */
const KEY = 'pos.emailSettings'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY = { from: '', password: '', to: [], attachment: '' }

function loadSettings() {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return EMPTY }
}
function saveSettings(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export default function EmailSettingsModal({ onClose }) {
  const [form, setForm]   = useState(loadSettings)
  const [toText, setToText] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  // Add the typed address(es) to the "To" list; returns the new list
  const addTo = (text = toText) => {
    const parts = text.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
    if (!parts.length) return form.to
    const bad = parts.find(p => !EMAIL_RE.test(p))
    if (bad) { setErrors(e => ({ ...e, to: `"${bad}" is not a valid email` })); return null }
    const next = [...form.to, ...parts.filter(p => !form.to.includes(p))]
    set('to', next)
    setToText('')
    return next
  }

  const handleSave = () => {
    const to = addTo()
    if (to === null) return
    const errs = {}
    if (!EMAIL_RE.test(form.from.trim())) errs.from = 'Enter a valid sender email'
    if (!form.password) errs.password = 'Enter the email password'
    if (!to.length) errs.to = 'Add at least one address'
    if (Object.keys(errs).length) { setErrors(errs); return }
    saveSettings({ ...form, from: form.from.trim(), to, attachment: form.attachment.trim() })
    posNotifySuccess('Email settings saved', { title: 'eMail Settings' })
    onClose()
  }

  return (
    <Modal onClose={onClose} icon={Mail} kicker="Settings" title="eMail Settings" width={540} zIndex={1100}>
      <div className="es">
        {/* Send from */}
        <section className="es-card">
          <header><span className="es-badge"><AtSign size={15} /></span><b>Send from</b></header>
          <label className={`es-row${errors.from ? ' has-error' : ''}`}>
            <span>Email address</span>
            <input data-system-keyboard type="email" value={form.from} onChange={e => set('from', e.target.value)} placeholder="counter@yourshop.com" autoFocus />
          </label>
          {errors.from && <em className="es-err">{errors.from}</em>}
          <label className={`es-row${errors.password ? ' has-error' : ''}`}>
            <span>Password</span>
            <input data-system-keyboard type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="App password" />
            <button type="button" className="es-eye" onClick={() => setShowPw(v => !v)}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />} {showPw ? 'Hide' : 'Show'}
            </button>
          </label>
          {errors.password && <em className="es-err">{errors.password}</em>}
        </section>

        {/* Send to */}
        <section className={`es-card${errors.to ? ' has-error' : ''}`}>
          <header>
            <span className="es-badge"><Send size={15} /></span><b>Send to</b>
            {form.to.length > 0 && <small>{form.to.length} recipient{form.to.length !== 1 ? 's' : ''}</small>}
          </header>
          <div className="es-chips" onClick={e => e.currentTarget.querySelector('input')?.focus()}>
            {form.to.map(addr => (
              <span key={addr} className="es-chip">
                {addr}
                <button type="button" onClick={() => set('to', form.to.filter(a => a !== addr))} aria-label={`Remove ${addr}`}><X size={12} /></button>
              </span>
            ))}
            <input
              data-system-keyboard
              type="email"
              value={toText}
              onChange={e => { setToText(e.target.value); setErrors(er => ({ ...er, to: null })) }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',' || e.key === ';') { e.preventDefault(); e.stopPropagation(); addTo() }
                else if (e.key === 'Backspace' && !toText && form.to.length) set('to', form.to.slice(0, -1))
              }}
              onBlur={() => toText && addTo()}
              placeholder={form.to.length ? 'Add another email…' : 'Type an email and press Enter'}
            />
          </div>
          {errors.to && <em className="es-err">{errors.to}</em>}
        </section>

        {/* Attachment */}
        <section className="es-card">
          <header><span className="es-badge"><Paperclip size={15} /></span><b>Attachment</b><small>optional</small></header>
          <label className="es-row">
            <span>File name</span>
            <input data-system-keyboard value={form.attachment} onChange={e => set('attachment', e.target.value)} placeholder="e.g. Counter Report.pdf" />
          </label>
        </section>
      </div>

      <div className="es-foot">
        <span className="es-note"><Save size={13} /> Saved on this counter</span>
        <button type="button" className="es-close" onClick={onClose}>Close</button>
        <button type="button" className="es-save" onClick={handleSave}><Check size={17} /> Save</button>
      </div>
    </Modal>
  )
}
