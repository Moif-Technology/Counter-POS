import { UiVariantContext } from './uiVariant'

/*
 *   <UiVariantProvider variant="neumorphic">
 *     <QtyChangeModal onClose={...} />
 *   </UiVariantProvider>
 */
export default function UiVariantProvider({ variant, children }) {
  return <UiVariantContext.Provider value={variant}>{children}</UiVariantContext.Provider>
}
