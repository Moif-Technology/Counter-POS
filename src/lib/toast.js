import { create } from 'zustand'

/*
 * Toast — small non-blocking message at the bottom of the screen.
 * <ToastHost /> (components/common/Toast) is mounted once in App; call
 * `toast` from anywhere:
 *
 *   toast('Saved')                      // brand
 *   toast.success('Bill saved')
 *   toast.error('Printer offline', { duration: 5000 })
 *   toast.warning('Low stock')
 *   toast.info('Syncing…')
 *
 * For blocking popups (success/error modal, confirm, delete confirm) use
 * lib/posNotify instead.
 */

let seq = 0

export const useToastStore = create(set => ({
  toasts: [],
  add: t => set(s => ({ toasts: [...s.toasts, t] })),
  remove: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export function toast(message, { type = 'brand', duration = 3000 } = {}) {
  const id = ++seq
  useToastStore.getState().add({ id, message, type, duration })
  return id
}
toast.success = (message, opts) => toast(message, { ...opts, type: 'success' })
toast.error   = (message, opts) => toast(message, { ...opts, type: 'danger' })
toast.warning = (message, opts) => toast(message, { ...opts, type: 'warning' })
toast.info    = (message, opts) => toast(message, { ...opts, type: 'info' })
toast.dismiss = id => useToastStore.getState().remove(id)
