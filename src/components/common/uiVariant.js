import { createContext, useContext } from 'react'

/*
 * UI variant — picks the look of shared input widgets (Numpad, Keyboard).
 *
 *   'classic'    — white keys with borders (main POS)
 *   'neumorphic' — soft-UI keys flush with the panel (Lite POS)
 *
 * Wrap a subtree in <UiVariantProvider variant="neumorphic"> to restyle every
 * Numpad/Keyboard inside it, so one modal file can serve both screens.
 * A widget's own `variant` prop wins over the context.
 */
export const UiVariantContext = createContext('classic')

export function useUiVariant(override) {
  const ctx = useContext(UiVariantContext)
  return override ?? ctx
}
