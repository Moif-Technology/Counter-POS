import { create } from 'zustand'

let alertSeq = 0

/** @typedef {'success'|'error'|'warning'|'info'|'brand'|'question'} NotifyType */

/**
 * Global SweetAlert-style notification store.
 * Use helpers (posNotify, posConfirm) instead of alert()/confirm().
 */
export const usePosNotify = create((set, get) => ({
  /** @type {Array<{id:number,message:string,type:string,title?:string,timer?:number,okLabel?:string,onClose?:()=>void}>} */
  alerts: [],
  confirm: null,
  /** @type {null | { title?: string, message?: string, defaultValue?: string, confirmLabel?: string, cancelLabel?: string, min?: number, max?: number, resolve?: (v: string|null) => void }} */
  prompt: null,

  addAlert: ({ message, type = 'brand', title, timer, okLabel = 'OK', onClose }) => {
    const id = ++alertSeq
    set(s => ({ alerts: [...s.alerts, { id, message, type, title, timer, okLabel, onClose }] }))
    return id
  },

  dismissAlert: (id) => {
    const alert = get().alerts.find(a => a.id === id)
    try { alert?.onClose?.() } catch { /* ignore callback errors */ }
    set(s => ({ alerts: s.alerts.filter(a => a.id !== id) }))
  },

  showConfirm: (opts) => new Promise((resolve) => {
    set({ confirm: { ...opts, resolve } })
  }),

  resolveConfirm: (value) => {
    const { confirm } = get()
    confirm?.resolve?.(value)
    set({ confirm: null })
  },

  showPrompt: (opts) => new Promise((resolve) => {
    const { prompt } = get()
    if (prompt?.resolve) prompt.resolve(null)
    set({ prompt: { ...opts, resolve } })
  }),

  resolvePrompt: (value) => {
    const { prompt } = get()
    prompt?.resolve?.(value)
    set({ prompt: null })
  },
}))

function normalizeType(type) {
  if (type === 'error') return 'danger'
  if (type === 'success') return 'success'
  if (type === 'warning') return 'warning'
  if (type === 'info') return 'info'
  return type || 'brand'
}

const DEFAULT_TITLES = {
  success: 'Success!',
  danger:  'Oops…',
  warning: 'Attention',
  info:    'Notice',
  brand:   'Done',
}

/**
 * Show a SweetAlert-style modal.
 * @param {string} message
 * @param {{ type?: NotifyType|'error', title?: string, timer?: number, duration?: number, okLabel?: string, onClose?: () => void }} [opts]
 */
export function posNotify(message, opts = {}) {
  const { type, duration, title, okLabel, onClose } = opts
  const normalized = normalizeType(type)
  const timer = opts.timer ?? (normalized === 'success' ? (duration ?? 0) : 0)
  return usePosNotify.getState().addAlert({
    message,
    type: normalized,
    title: title ?? DEFAULT_TITLES[normalized] ?? 'Notice',
    timer: timer > 0 ? timer : undefined,
    okLabel: okLabel ?? 'OK',
    onClose,
  })
}

export const posNotifySuccess = (message, opts = {}) =>
  posNotify(message, { ...opts, type: 'success', duration: opts.duration ?? 3500 })

export const posNotifyError = (message, opts = {}) =>
  posNotify(message, { ...opts, type: 'error' })

export const posNotifyWarning = (message, opts = {}) =>
  posNotify(message, { ...opts, type: 'warning' })

export const posNotifyInfo = (message, opts = {}) =>
  posNotify(message, { ...opts, type: 'info' })

/**
 * SweetAlert-style confirm — returns true if confirmed.
 */
export function posConfirm({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  danger = false,
}) {
  return usePosNotify.getState().showConfirm({
    title,
    message,
    confirmLabel,
    cancelLabel,
    danger,
  })
}

/**
 * Ask how many receipt copies to print. Returns copy count (min 1) or null if skipped.
 */
export function posAskPrintCopies(opts = {}) {
  const min = Math.max(1, Number(opts.min) || 1)
  const max = Math.max(min, Number(opts.max) || 20)
  const defaultValue = String(opts.defaultValue ?? 1)

  return usePosNotify.getState().showPrompt({
    title: opts.title ?? 'Print Copies',
    message: opts.message ?? 'How many copies do you need?',
    defaultValue,
    confirmLabel: opts.confirmLabel ?? 'Print',
    cancelLabel: opts.cancelLabel ?? 'Skip',
    min,
    max,
  }).then((raw) => {
    if (raw == null) return null
    const n = parseInt(String(raw).trim(), 10)
    if (!Number.isFinite(n) || n < min) return min
    return Math.min(n, max)
  })
}
