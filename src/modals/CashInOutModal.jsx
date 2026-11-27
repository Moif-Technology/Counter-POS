import { useEffect, useRef, useState } from 'react'
import { Wallet, ArrowDownLeft, ArrowUpRight, Keyboard as KeyboardIcon, Trash2, Loader2, Plus } from 'lucide-react'
import Modal from '../components/common/Modal'
import Numpad from '../components/common/Numpad'
import TouchKeyboard from '../components/common/Keyboard'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import { fmtMoney, moneyPlaceholder } from '../lib/currencyFormat'
import './CashInOutModal.css'
import { posNotifySuccess } from '../lib/posNotify'
import { DENOMS } from '../lib/denoms'

/** Cash In categories counted note-by-note (drawer float). */
const DENOM_CATEGORIES = ['Opening Float', 'Petty Cash']
const noCounts = () => Object.fromEntries(DENOMS.map(d => [d.label, '']))

const CATEGORIES = {
  in:  ['Cash', 'Opening Float', 'Petty Cash'],
  out: ['Cash', 'Petty Cash', 'Expense From Cash Counter'],
}
/** Stored ops.cash_in_out.category — X/Z report float and petty cash on their own lines. */
const CATEGORY_CODE = {
  'Cash': 'GENERAL',
  'Opening Float': 'OPENING_FLOAT',
  'Petty Cash': 'PETTY_CASH',
  'Expense From Cash Counter': 'EXPENSE',
}

/**
 * Cash In / Cash Out — one screen:
 *   In | Out switch · category chips · note (+ on-screen keyboard) · big amount
 *   · "Add" puts the entry in the list · Save posts every entry.
 * Entries are saved one by one as CASH_IN / CASH_OUT with "category — note" remarks.
 */
export default function CashInOutModal({ onClose, saveFn = null }) {
  const [type,     setType]     = useState('in')
  const [category, setCategory] = useState(CATEGORIES.in[0])
  const [note,     setNote]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [entries,  setEntries]  = useState([])
  const [kbOpen,   setKbOpen]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const [counts,   setCounts]   = useState(noCounts)
  const [activeDenom, setActiveDenom] = useState(DENOMS[0].label)
  const noteRef     = useRef()
  const accessToken = usePosStore(s => s.accessToken)
  const counterNo   = usePosStore(s => s.counterNo)
  const currency    = usePosStore(s => s.currency)

  const isIn      = type === 'in'
  const denomMode = isIn && DENOM_CATEGORIES.includes(category)
  const denomTotal = Math.round(DENOMS.reduce((s, d) => s + d.value * (parseInt(counts[d.label], 10) || 0), 0) * 1000) / 1000
  const parsed = denomMode ? denomTotal : (parseFloat(amount) || 0)
  const total  = entries.reduce((s, e) => s + e.amount, 0)

  useEffect(() => { noteRef.current?.focus() }, [])

  // Switching In / Out starts a fresh list (one save = one direction).
  const switchType = (t) => {
    if (t === type) return
    setType(t); setCategory(CATEGORIES[t][0]); setEntries([]); setAmount(''); setNote(''); setCounts(noCounts()); setError(null)
  }

  const handleKey = (k) => {
    if (denomMode) {   // numpad types the count of the selected note
      if (k === '.') return
      if (k === 'C') { setCounts(c => ({ ...c, [activeDenom]: '' })); return }
      if (k === '⌫') { setCounts(c => ({ ...c, [activeDenom]: c[activeDenom].slice(0, -1) })); return }
      setCounts(c => (c[activeDenom].length >= 5 ? c : { ...c, [activeDenom]: c[activeDenom] + k }))
      return
    }
    if (k === 'C') { setAmount(''); return }
    if (k === '⌫') { setAmount(v => v.slice(0, -1)); return }
    if (k === '.' && amount.includes('.')) return
    if (/^\d*\.\d{3}$/.test(amount)) return
    setAmount(v => (v === '0' && k !== '.' ? k : v + k))
  }

  const addEntry = () => {
    if (parsed <= 0) return
    const denoms = denomMode
      ? DENOMS.filter(d => parseInt(counts[d.label], 10) > 0).map(d => `${d.label}×${parseInt(counts[d.label], 10)}`).join(', ')
      : ''
    setEntries(prev => [...prev, { id: Date.now(), category, note: note.trim(), denoms, amount: parsed }])
    setAmount(''); setNote(''); setCounts(noCounts()); setActiveDenom(DENOMS[0].label); setError(null)
    noteRef.current?.focus()
  }

  const handleKbKey = (k) => {
    if (k === '⌫') { setNote(v => v.slice(0, -1)); return }
    if (k === 'ENTER') { setKbOpen(false); return }
    if (k === '123') return
    setNote(v => v + k)
  }

  const save = async () => {
    if (!entries.length || saving) return
    setSaving(true); setError(null)
    try {
      const transactionType = isIn ? 'CASH_IN' : 'CASH_OUT'
      const doSave = saveFn ?? ((entry) => api.counterPos.addCashInOut(entry, accessToken))
      for (const e of entries) {
        const remarks = [e.category, e.note, e.denoms].filter(Boolean).join(' — ')
        await doSave({ counterNo, transactionType, category: CATEGORY_CODE[e.category] ?? 'GENERAL', amount: e.amount, remarks: remarks || null })
      }
      posNotifySuccess(`${entries.length} cash ${isIn ? 'in' : 'out'} entr${entries.length === 1 ? 'y' : 'ies'} saved`, { title: 'Cash In / Out', duration: 1500 })
      onClose()
    } catch (err) {
      setError(err.message ?? 'Failed to save cash in/out')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} icon={Wallet} kicker="Cash drawer" title="Cash In / Cash Out" width={820} maxHeight="94vh">
      <div className={`cio ${isIn ? 'is-in' : 'is-out'}`}>
        <div className="cio-left">
          {/* In | Out */}
          <div className="cio-switch" role="tablist">
            <button type="button" role="tab" aria-selected={isIn} className={`cio-switch-btn is-in${isIn ? ' is-on' : ''}`} onClick={() => switchType('in')}>
              <ArrowDownLeft size={18} /> Cash In
            </button>
            <button type="button" role="tab" aria-selected={!isIn} className={`cio-switch-btn is-out${!isIn ? ' is-on' : ''}`} onClick={() => switchType('out')}>
              <ArrowUpRight size={18} /> Cash Out
            </button>
          </div>

          {/* Category */}
          <div className="cio-chips">
            {CATEGORIES[type].map(c => (
              <button key={c} type="button" className={`cio-chip${category === c ? ' is-on' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>

          {/* Note + big amount */}
          <div className="cio-note">
            <input data-system-keyboard
              ref={noteRef}
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntry() } }}
              placeholder="Note (optional) — e.g. supplier, reason"
              aria-label="Note"
            />
            <button type="button" className={`cio-kb${kbOpen ? ' is-on' : ''}`} onClick={() => setKbOpen(o => !o)} aria-label="On-screen keyboard">
              <KeyboardIcon size={18} />
            </button>
          </div>
          <div className="cio-amount">
            <span>{denomMode ? `Notes total · ${currency}` : currency}</span>
            {denomMode
              ? <b className={denomTotal ? '' : 'is-empty'}>{fmtMoney(denomTotal)}</b>
              : <input
                  value={amount}
                  placeholder={moneyPlaceholder()}
                  inputMode="decimal"
                  onChange={e => { const x = e.target.value; if (/^\d*\.?\d{0,3}$/.test(x)) setAmount(x) }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntry() } }}
                  aria-label="Amount"
                />}
          </div>

          {/* Float / petty cash: count each note */}
          {denomMode && (
            <div className="cio-denoms">
              {DENOMS.map(d => (
                <label key={d.label} className={`cio-denom${activeDenom === d.label ? ' is-on' : ''}`} onClick={() => setActiveDenom(d.label)}>
                  <span>{d.label} ×</span>
                  <input
                    value={counts[d.label]}
                    placeholder="0"
                    onFocus={() => setActiveDenom(d.label)}
                    onChange={e => { const x = e.target.value; if (/^\d{0,5}$/.test(x)) setCounts(c => ({ ...c, [d.label]: x })) }}
                    aria-label={`${d.label} count`}
                  />
                </label>
              ))}
            </div>
          )}

          {/* Entries */}
          <div className="cio-list">
            {entries.length === 0 ? (
              <div className="cio-empty">Enter an amount and tap <b>Add</b> — add as many as you need, then Save</div>
            ) : entries.map(e => (
              <div key={e.id} className="cio-entry">
                <div className="cio-entry-main">
                  <b>{e.category}</b>
                  {e.note && <span>{e.note}</span>}
                  {e.denoms && <span>{e.denoms}</span>}
                </div>
                <span className="cio-entry-amt">{isIn ? '+' : '−'}{fmtMoney(e.amount)}</span>
                <button type="button" className="cio-entry-del" onClick={() => setEntries(p => p.filter(x => x.id !== e.id))} aria-label="Remove entry">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          {error && <div className="cio-error">{error}</div>}
        </div>

        <div className="cio-right">
          <Numpad onKey={handleKey} showDot showClear showBackspace={false} btnHeight={50} fontSize={18} gap={8} />
          <button type="button" className="cio-add" onClick={addEntry} disabled={parsed <= 0}>
            <Plus size={17} /> Add {isIn ? 'Cash In' : 'Cash Out'}
          </button>
          <div className="cio-total">
            <span>Total {isIn ? 'in' : 'out'} · {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>
            <b>{fmtMoney(total)}</b>
          </div>
          <div className="cio-foot">
            <button type="button" className="cio-btn is-primary" onClick={save} disabled={!entries.length || saving}>
              {saving ? <><Loader2 size={16} className="cio-spin" /> Saving…</> : 'Save'}
            </button>
            <button type="button" className="cio-btn is-cancel" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      {kbOpen && <TouchKeyboard onKey={handleKbKey} onClose={() => setKbOpen(false)} />}
    </Modal>
  )
}
