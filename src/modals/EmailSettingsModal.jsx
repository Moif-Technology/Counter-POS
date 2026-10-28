import { useState } from 'react'
import { Mail, Save } from 'lucide-react'
import { posNotifySuccess } from '../lib/posNotify'
import Modal from '../components/common/Modal'
import './EmailSettingsModal.css'

/*
 * eMail Settings — From address, password, To address(es, comma separated)
 * and attachment name; same simple layout as Password Change.
 *
 * Saved on this counter (localStorage) until the server has an endpoint for it:
 * swap loadSettings / saveSettings to move it to the backend.
 */
const KEY = 'pos.emailSettings'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      from: s.from ?? '',
      password: s.password ?? '',
      to: Array.isArray(s.to) ? s.to.join(', ') : (s.to ?? ''),
      attachment: s.attachment ?? '',
    }
  } catch {
    return { from: '', password: '', to: '', attachment: '' }
  }
}
function saveSettings(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

const FIELDS = [
  { key: 'from',       label: 'Email From Address', type: 'email',    placeholder: 'counter@yourshop.com' },
  { key: 'password',   label: 'Email Password',     type: 'password', placeholder: 'Enter email password' },
  { key: 'to',         label: 'Email To Address',   type: 'text',     placeholder: 'manager@yourshop.com, owner@yourshop.com' },
  { key: 'attachment', label: 'Email Attachment',   type: 'text',     placeholder: 'e.g. Counter Report.pdf' },
]

export default function EmailSettingsModal({ onClose }) {
  const [form, setForm]   = useState(loadSettings)
  const [error, setError] = useState(null)
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(null) }

  function handleSubmit(e) {
    e.preventDefault()
    const from = form.from.trim()
    const to = form.to.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
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

        {FIELDS.map((f, i) => (
          <div key={f.key} className="es-field">
            <label htmlFor={`es-${f.key}`}>{f.label}</label>
            <input
              id={`es-${f.key}`}
              data-system-keyboard
              type={f.type}
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              autoFocus={i === 0}
            />
            {f.key === 'to' && <p className="es-hint">Separate more than one address with a comma.</p>}
          </div>
        ))}

        <div className="es-btns">
          <button type="button" className="es-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="es-save"><Save size={14} /> Save</button>
        </div>
      </form>
    </Modal>
  )
}
