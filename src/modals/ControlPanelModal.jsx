import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Settings, Save, Minus, Plus, X, Type, ImagePlus, RotateCcw } from 'lucide-react'
import Modal from '../components/common/Modal'
import { api } from '../lib/api'
import { usePosStore } from '../store/posStore'
import {
  getReceiptParams, setReceiptSettings, parseReceiptSettings, parseBillLayout,
  BILL_FIELDS, BILL_LINES, FIELD_SIZE, FIELD_WEIGHT,
} from '../lib/posSettings'
import { buildBillReceiptHtml } from '../lib/printBillReceipt'
import { getReceiptPrintMetaFromStore } from '../lib/receiptPrintTheme'
import { posNotifySuccess, posNotifyWarning } from '../lib/posNotify'
import {
  MAX_BLOCKS, TEXT_MAX, DEFAULT_FOOTER, LINE_SIZE, LINE_WEIGHT, COUNTER_LINE,
  textBlock, lineStyle, fileToReceiptImage, renderBlocks, blocksFromParams, fillBlocks,
} from '../lib/receiptBlocks'
import './ControlPanelModal.css'

/*
 * Control Panel — bill header / footer (editable lines + images), bill layout (click any field or
 * dotted line on the preview bill to restyle / hide it), and how many copies Save & Print gives.
 * Stored as company POS parameters (receipt_*). Saving needs pos.settings.edit (server check).
 */
const TABS = ['Header & Footer', 'Bill Print']
const PARTS = { header: 'Header', footer: 'Footer' }
const MAX_COPIES = 10
/** Older show / hide parameters; the matching field's "Show on bill" box drives them. */
const TOGGLE_KEYS = Object.values(BILL_FIELDS).map(f => f.param).filter(Boolean)
const WEIGHT_LABEL = { 400: 'Normal', 500: 'Medium', 600: 'Semi-bold', 700: 'Bold', 800: 'Extra bold' }

/** Preview bill: every field filled so each one can be clicked. */
const SAMPLE_BILL = {
  billNo: 1024, salesId: 1024, transactionType: 'SALE', billTime: new Date().toISOString(), counterNo: 1, staffName: 'CASHIER',
  customer: { customerId: 1, customerName: 'Sample Customer', mobileNo: '0501234567' },
  remarks: 'Sample comment',
  items: [
    { description: 'Sample item', qty: 2, lineTotal: 10, vatPer: 5, vatAmt: 0.48, productCode: 'PRD-0001' },
    { description: 'Another item', qty: 1, lineTotal: 3.5, vatPer: 5, vatAmt: 0.17, productCode: 'PRD-0002' },
  ],
  paymentMode: 'CASH', amount: 13.5, paidAmount: 20, balanceAmount: 6.5, taxableAmt: 12.86, taxAmt: 0.64,
}

function Stepper({ value, min, max, step = 1, name, show = value, onChange }) {
  return (
    <div className="cpn-stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label={`Decrease ${name}`}><Minus size={16} /></button>
      <span className={typeof show === 'string' ? 'is-text' : undefined} aria-live="polite">{show}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={`Increase ${name}`}><Plus size={16} /></button>
    </div>
  )
}

/** This counter's company details — what the receipt prints when nothing is set. */
function counterCompany() {
  const s = usePosStore.getState()
  return { name: s.shopName, branch: s.shopSubName, phone: s.companyPhone, address: s.companyAddress }
}

function formFromParams(p = {}) {
  const co = counterCompany()
  const f = {
    receipt_copies: Math.max(1, Math.min(MAX_COPIES, Math.floor(Number(p.receipt_copies) || 1))),
    header: blocksFromParams(p, 'header', co),
    footer: blocksFromParams(p, 'footer', co),
    layout: parseBillLayout(p.receipt_bill_layout),
  }
  for (const key of TOGGLE_KEYS) f[key] = p[key] == null || p[key] === '' || Number(p[key]) !== 0
  return f
}

/** Form → parameter values: the save body, and (parsed) the preview's settings. */
function paramsFromForm(form) {
  const p = {
    receipt_copies: form.receipt_copies,
    receipt_header_blocks: JSON.stringify(form.header),
    receipt_footer_blocks: JSON.stringify(form.footer),
    receipt_bill_layout: JSON.stringify(form.layout),
  }
  for (const key of TOGGLE_KEYS) p[key] = form[key] ? 1 : 0
  return p
}

/**
 * Editable lines + images for one part. Header images go on top, footer images at the bottom.
 * Clicking a text line shows its size / boldness under it, and "+ Counter no." which adds
 * "Counter {counter}" — each counter prints its own number ("Counter 2").
 */
function LinesEditor({ part, blocks, values, onChange, onError }) {
  const fileRef = useRef(null)
  const [sel, setSel] = useState(-1)
  const full = blocks.length >= MAX_BLOCKS
  const counterNo = String(values.counter ?? '').trim()
  const firstText = part === 'header' ? blocks.findIndex(b => b.type !== 'image') : -1
  const restyle = (i, patch) => onChange(blocks.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const image = { type: 'image', src: await fileToReceiptImage(file) }
      const at = part === 'header' ? blocks.findIndex(b => b.type !== 'image') : -1
      onChange(at === -1 ? [...blocks, image] : [...blocks.slice(0, at), image, ...blocks.slice(at)])
    } catch (err) {
      onError(err.message)
    }
  }

  return (
    <div className="cpn-lines">
      {!blocks.length && (
        <p className="cpn-empty">
          {part === 'header' ? 'Empty — the company name, branch, phone and address print here.' : `Empty — "${DEFAULT_FOOTER}" prints here.`}
        </p>
      )}
      {blocks.map((b, i) => {
        const st = b.type === 'image' ? null : lineStyle(b, i === firstText)
        const name = `${PARTS[part]} line ${i + 1}`
        const counterText = st ? `${b.text}${b.text && !/\s$/.test(b.text) ? ' ' : ''}${COUNTER_LINE}` : ''
        return (
          <Fragment key={i}>
            <div className={sel === i && st ? 'cpn-line is-sel' : 'cpn-line'}>
              {b.type === 'image' ? (
                <div className="cpn-line-img"><img src={b.src} alt="" /></div>
              ) : (
                <input
                  data-system-keyboard
                  dir="auto"
                  maxLength={TEXT_MAX}
                  value={b.text}
                  placeholder="Type a line — English or Arabic"
                  aria-label={name}
                  onFocus={() => setSel(i)}
                  onChange={e => restyle(i, { text: e.target.value })}
                />
              )}
              <button type="button" className="cpn-line-remove" onClick={() => { setSel(-1); onChange(blocks.filter((_, j) => j !== i)) }} aria-label="Remove">
                <X size={16} />
              </button>
            </div>
            {sel === i && st && (
              <div className="cpn-line-style">
                <label>Size</label>
                <Stepper name={`${name} size`} {...LINE_SIZE} value={st.size} onChange={v => restyle(i, { size: v })} />
                <label>Boldness</label>
                <Stepper name={`${name} boldness`} {...LINE_WEIGHT} value={st.weight} show={WEIGHT_LABEL[st.weight]} onChange={v => restyle(i, { weight: v })} />
                <div className="cpn-line-tokens">
                  <button type="button" disabled={/\{counter\}/i.test(b.text) || counterText.length > TEXT_MAX} onClick={() => restyle(i, { text: counterText })}>
                    <Plus size={13} /> Counter no.{counterNo ? ` (Counter ${counterNo})` : ''}
                  </button>
                </div>
              </div>
            )}
          </Fragment>
        )
      })}
      <div className="cpn-line-add">
        <button type="button" onClick={() => onChange([...blocks, textBlock()])} disabled={full}><Type size={14} /> Add line</button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={full}><ImagePlus size={14} /> Add image</button>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/*" hidden onChange={handleFile} />
    </div>
  )
}

/** layout with one field changed; values back at their default are dropped so the saved JSON holds changes only. */
function withField(layout, key, patch) {
  const def = BILL_FIELDS[key]
  const next = { ...layout.fields[key], ...patch }
  if (next.size === def.size) delete next.size
  if (next.weight === FIELD_WEIGHT.def) delete next.weight
  if (!next.hide) delete next.hide
  const fields = { ...layout.fields }
  if (Object.keys(next).length) fields[key] = next
  else delete fields[key]
  return { ...layout, fields }
}

function withLine(layout, key, on) {
  const lines = { ...layout.lines }
  if (on) delete lines[key]
  else lines[key] = false
  return { ...layout, lines }
}

/** Settings for the clicked field: size, boldness, show on bill, its dotted line. */
function FieldPanel({ fieldKey, form, setForm }) {
  const def = BILL_FIELDS[fieldKey]
  const cur = form.layout.fields[fieldKey] ?? {}
  const size = cur.size ?? def.size
  const weight = cur.weight ?? FIELD_WEIGHT.def
  const shown = def.param ? form[def.param] : !cur.hide
  const lineOn = def.line ? form.layout.lines[def.line] !== false : false
  const patch = p => setForm(f => ({ ...f, layout: withField(f.layout, fieldKey, p) }))

  function setShown(on) {
    if (def.param) setForm(f => ({ ...f, [def.param]: on }))
    else patch({ hide: !on })
  }

  function reset() {
    setForm(f => {
      const fields = { ...f.layout.fields }
      delete fields[fieldKey]
      return { ...f, ...(def.param ? { [def.param]: true } : {}), layout: { ...f.layout, fields } }
    })
  }

  return (
    <div className="cpn-field">
      <div className="cpn-field-head">
        <strong>{def.label}</strong>
        <button type="button" onClick={reset}><RotateCcw size={13} /> Reset</button>
      </div>
      <div className="cpn-row">
        <label>Size</label>
        <Stepper name={`${def.label} size`} {...FIELD_SIZE} value={size} onChange={v => patch({ size: v })} />
      </div>
      <div className="cpn-row">
        <label>Boldness</label>
        <Stepper name={`${def.label} boldness`} {...FIELD_WEIGHT} value={weight} show={WEIGHT_LABEL[weight]} onChange={v => patch({ weight: v })} />
      </div>
      <label className="cpn-check">
        <input type="checkbox" checked={shown} onChange={e => setShown(e.target.checked)} />
        <span><strong>Show on bill</strong><small>Hidden fields stay faint on the preview — click them to bring back.</small></span>
      </label>
      {def.line && (
        <label className="cpn-check">
          <input type="checkbox" checked={lineOn} onChange={e => setForm(f => ({ ...f, layout: withLine(f.layout, def.line, e.target.checked) }))} />
          <span><strong>{BILL_LINES[def.line]}</strong></span>
        </label>
      )}
    </div>
  )
}

export default function ControlPanelModal({ onClose }) {
  const accessToken = usePosStore(s => s.accessToken)
  const trn = usePosStore(s => s.companyTrn)
  const counterNo = usePosStore(s => s.counterNo)
  const branchName = usePosStore(s => s.shopSubName)
  // Preview fills {counter} / {branch} with this counter's values; each counter prints its own.
  const tokenValues = useMemo(() => ({ counter: counterNo, branch: branchName }), [counterNo, branchName])
  const [tab, setTab]         = useState(TABS[0])
  const [part, setPart]       = useState('header')
  const [form, setForm]       = useState(() => formFromParams(getReceiptParams()))
  const [preview, setPreview] = useState({ header: '', footer: '' })
  const [picked, setPicked]   = useState(null)   // { kind: 'field' | 'line', key }
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  // Fresh values from the server (another counter may have changed them).
  useEffect(() => {
    let alive = true
    api.appParameters.gvtax(accessToken)
      .then(d => { if (alive && d?.receiptSettings) setForm(formFromParams(d.receiptSettings)) })
      .catch(() => { /* offline: keep what this counter has */ })
    return () => { alive = false }
  }, [accessToken])

  // Header / footer images = the same drawing a printed bill uses.
  useEffect(() => {
    let alive = true
    const timer = setTimeout(() => {
      Promise.all([renderBlocks(fillBlocks(form.header, tokenValues), { bigFirstLine: true }), renderBlocks(fillBlocks(form.footer, tokenValues))])
        .then(([header, footer]) => { if (alive) setPreview({ header, footer }) })
        .catch(err => { if (alive) setError(err.message) })
    }, 200)
    return () => { alive = false; clearTimeout(timer) }
  }, [form.header, form.footer, tokenValues])

  // Preview = the real bill HTML with the unsaved settings, in editor mode (clickable).
  const billHtml = useMemo(() => buildBillReceiptHtml({ ...SAMPLE_BILL, counterNo: counterNo ?? 1 }, getReceiptPrintMetaFromStore(), preview, {
    settings: parseReceiptSettings(paramsFromForm(form)),
    editor: true,
    selected: picked?.key,
  }), [form, preview, picked, counterNo])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(null) }
  const setCopies = n => set('receipt_copies', Math.max(1, Math.min(MAX_COPIES, n)))

  /** Each preview load is a new document: size the frame to it and listen for clicks. */
  function handleFrameLoad(e) {
    const frame = e.currentTarget
    const doc = frame.contentDocument
    if (!doc) return
    const fit = () => { frame.style.height = `${doc.documentElement.scrollHeight}px` }
    fit()
    doc.fonts?.ready.then(fit)
    doc.addEventListener('click', ev => {
      const el = ev.target.closest?.('[data-f], [data-d], [data-go]')
      if (!el) return
      if (el.dataset.go) {
        setPart(el.dataset.go)
        setTab('Header & Footer')
        return
      }
      if (el.dataset.d) {
        // A dotted line switches on / off with one click.
        const key = el.dataset.d
        setForm(f => ({ ...f, layout: withLine(f.layout, key, f.layout.lines[key] === false) }))
        setPicked({ kind: 'line', key })
      } else {
        setPicked({ kind: 'field', key: el.dataset.f })
      }
      setTab('Bill Print')
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // Same drawing the bill uses — stop here if it can't print (e.g. too tall).
      await Promise.all([renderBlocks(fillBlocks(form.header, tokenValues), { bigFirstLine: true }), renderBlocks(fillBlocks(form.footer, tokenValues))])
      const res = await api.counterPos.saveReceiptSettings(paramsFromForm(form), accessToken)
      setReceiptSettings(res.receiptSettings)
      const skipped = (res.ignored ?? []).filter(k => k.startsWith('receipt_'))
      if (skipped.length) {
        posNotifyWarning('Some settings were not saved — the server needs the latest migrations.', { title: 'Control Panel' })
      } else {
        posNotifySuccess('Bill settings saved', { title: 'Control Panel', duration: 1200 })
      }
      onClose()
    } catch (err) {
      setError(err.status === 403
        ? 'Your role cannot change the Control Panel. Ask an admin to allow POS settings → Edit.'
        : (err.message ?? 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const lineKey = picked?.kind === 'line' ? picked.key : null

  return (
    <Modal onClose={onClose} icon={Settings} kicker="Settings" title="Control Panel" zIndex={1100} width={940}>
      <form className="cpn" onSubmit={handleSave}>
        <nav className="cpn-tabs" aria-label="Control panel sections">
          {TABS.map(t => (
            <button key={t} type="button" className={tab === t ? 'is-on' : undefined} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>

        <div className="cpn-body">
          <div className="cpn-form">
            {error && <div className="cpn-error">{error}</div>}

            {tab === 'Header & Footer' ? (
              <>
                <div className="cpn-part" role="group" aria-label="Edit header or footer">
                  {Object.entries(PARTS).map(([k, label]) => (
                    <button key={k} type="button" className={part === k ? 'is-on' : undefined} aria-pressed={part === k} onClick={() => setPart(k)}>
                      {label}
                    </button>
                  ))}
                </div>
                <LinesEditor key={part} part={part} blocks={form[part]} values={tokenValues} onChange={v => set(part, v)} onError={setError} />
                <p className="cpn-hint">Tap a line, then + Counter no. — every counter prints its own number there (Counter 2).</p>
                {part === 'header' && (
                  <p className="cpn-hint">TRN {trn || '(not set)'} prints under the header — from Company Profile. Click it on the bill to change it.</p>
                )}
              </>
            ) : (
              <>
                <p className="cpn-title">Copies</p>
                <div className="cpn-row">
                  <label>Bill copies</label>
                  <div className="cpn-stepper">
                    <button type="button" onClick={() => setCopies(form.receipt_copies - 1)} disabled={form.receipt_copies <= 1} aria-label="Fewer copies"><Minus size={16} /></button>
                    <span aria-live="polite">{form.receipt_copies}</span>
                    <button type="button" onClick={() => setCopies(form.receipt_copies + 1)} disabled={form.receipt_copies >= MAX_COPIES} aria-label="More copies"><Plus size={16} /></button>
                  </div>
                </div>
                <p className="cpn-hint">Printed on every Save &amp; Print, each copy cut separately. Reprints print one copy.</p>

                <p className="cpn-title">Bill layout</p>
                {picked?.kind === 'field' ? (
                  <FieldPanel key={picked.key} fieldKey={picked.key} form={form} setForm={setForm} />
                ) : lineKey ? (
                  <label className="cpn-check">
                    <input
                      type="checkbox"
                      checked={form.layout.lines[lineKey] !== false}
                      onChange={e => setForm(f => ({ ...f, layout: withLine(f.layout, lineKey, e.target.checked) }))}
                    />
                    <span><strong>{BILL_LINES[lineKey]}</strong><small>Click a dotted line on the bill to switch it on or off.</small></span>
                  </label>
                ) : (
                  <p className="cpn-empty">Click any line on the bill — TRN, counter, date, total… — to change its size, boldness or hide it. Click a dotted line to switch it on or off. Click the header or footer to edit its lines.</p>
                )}
              </>
            )}
          </div>

          {/* Live preview — the real bill, clickable */}
          <aside className="cpn-preview" aria-label="Bill preview">
            <span className="cpn-preview-tag">Preview — click to edit{form.receipt_copies > 1 ? ` · ${form.receipt_copies} copies` : ''}</span>
            <div className="cpn-frame-wrap">
              <iframe className="cpn-frame" title="Bill preview" srcDoc={billHtml} onLoad={handleFrameLoad} />
            </div>
          </aside>
        </div>

        <div className="cpn-btns">
          <button type="button" className="cpn-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="cpn-save" disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}
