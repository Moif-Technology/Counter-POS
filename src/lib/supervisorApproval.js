import { create } from 'zustand'
import { usePosStore, canDo } from '../store/posStore'

/**
 * Till actions guarded by a POS feature switch on the cashier's role (ERP → Configuration →
 * Handle Permissions). On → go ahead. Off → an admin or supervisor PIN; the server checks that
 * person (POST /counter-pos/supervisor/approve). Dialog: SupervisorApprovalDialog.
 */
export const APPROVAL_ACTIONS = {
  discount:     { feature: 'pos.discount',     title: 'Discount needs approval',     verb: 'give a discount' },
  price_change: { feature: 'pos.price_change', title: 'Price change needs approval', verb: 'change the price' },
}

export const useApproval = create(() => ({ action: null, resolve: null }))

/**
 * May the cashier do `action` now? 'self' = their role allows it, 'supervisor' = a supervisor
 * just approved it, false = cancelled. (Truthy = go ahead.)
 */
export async function requireApproval(action) {
  const rule = APPROVAL_ACTIONS[action]
  if (!rule || canDo(usePosStore.getState(), rule.feature)) return 'self'
  const ok = await new Promise(resolve => useApproval.setState({ action, resolve }))
  return ok ? 'supervisor' : false
}
