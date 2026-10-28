import { useState } from 'react'
import { Mail, Save, Eye, EyeOff, Plus, X } from 'lucide-react'
import { posNotifySuccess } from '../lib/posNotify'
import Modal from '../components/common/Modal'
import './EmailSettingsModal.css'

/*
 * eMail Settings — From address, password (eye to show), To addresses
 * (+ adds another box) and attachment name; same simple layout as Password Change.
 *
 * Saved on this counter (localStorage) until the server has an endpoint for it:
 * swap loadSettings / saveSettings to move it to the backend.
 */
const KEY = 'pos.emailSettings'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    const to = Array.isArray(s.to) ? s.to : String(s.to ?? '').split(/[,;\s]+/).filter(Boolean)
    return { from: s.from ?? '', password: s.password ?? '', to: to.length ? to : [''], attachment: s.attachment ?? '' }
  } catch {
    return { from: '', password: '', to: [''], attachment: '' }
  }
}
function saveSettings(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export default function EmailSettingsModal({ onClose }) {
  const [form, setForm]     = useState(loadSettings)
  const [showPw, setShowPw] = useState(false)
  const [error, setError]   = useState(null)
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(null) }
  const setTo = (i, v) => set('to', form.to.map((a, j) => (j === i ? v : a)))
  const addTo = () => set('to', [...form.to, ''])
  const removeTo = i => set('to', form.to.filter((_, j) => j !== i))

  function handleSubmit(e) {
    e.preventDefault()
    const from = form.from.trim()
    const to = form.to.map(a => a.trim()).filter(Boolean)
    if (!from || !form.password || !to.length) { setError('Email From, Password and To Address are required'); return }
    if (!EMAIL_RE.test(from)) { setError('Email From Address is not valid'); return }
    const bad = to.find(a => !EMAIL_RE.test(a))
    if (bad) { setError(`"${bad}" is not a valid email`); return }
    saveSettings({ from, password: form.password, to, attachment: form.attachment.trim() })
    posNotifySuccess('Email settings saved', { title: 'eMail Settings' })
    onClose()
  }

  return (
    <Modal onClose={onClose} icon={Mail} kicker="Settings" title="eMail Settings" zIndex={1100} width={440}>
      <form className="es" onSubmit={handleSubmit}>
        {error && <div className="es-error">{error}</div>}

        <div className="es-field">
          <label htmlFor="es-from">Email From Address</label>
          <input id="es-from" data-system-keyboard type="email" value={form.from} onChange={e => set('from', e.target.value)} placeholder="counter@yourshop.com" autoFocus />
        </div>

        <div className="es-field">
          <label htmlFor="es-password">Email Password</label>
          <div className="es-box">
            <input id="es-password" data-system-keyboard type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Enter email password" />
            <button type="button" className="es-icon" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className="es-field">
          <label htmlFor="es-to-0">Email To Address</label>
          <div className="es-list">
            {form.to.map((addr, i) => (
              <div key={i} className="es-box">
                <input
                  id={`es-to-${i}`}
                  data-system-keyboard
                  type="email"
                  value={addr}
                  onChange={e => setTo(i, e.target.value)}
                  placeholder={i === 0 ? 'manager@yourshop.com' : 'Another email'}
                  autoFocus={i > 0 && i === form.to.length - 1 && !addr}
                />
                {i === 0
                  ? <button type="button" className="es-icon is-add" onClick={addTo} aria-label="Add another address"><Plus size={18} /></button>
                  : <button type="button" className="es-icon is-remove" onClick={() => removeTo(i)} aria-label="Remove address"><X size={16} /></button>}
              </div>
            ))}
          </div>
        </div>

        <div className="es-field">
          <label htmlFor="es-attachment">Email Attachment</label>
          <input id="es-attachment" data-system-keyboard value={form.attachment} onChange={e => set('attachment', e.target.value)} placeholder="e.g. Counter Report.pdf" />
        </div>

        <div className="es-btns">
          <button type="button" className="es-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="es-save"><Save size={14} /> Save</button>
        </div>
      </form>
    </Modal>
  )
}
