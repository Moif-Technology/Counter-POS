import UiVariantProvider from '../../../components/common/UiVariantProvider'
import { posNotifySuccess } from '../../../lib/posNotify'

import BillDiscountModal from '../../../modals/BillDiscountModal'
import CashInOutModal from '../../../modals/CashInOutModal'
import CommentsModal from '../../../modals/CommentsModal'
import CreditSettlementModal from '../../../modals/CreditSettlementModal'
import CurrencyModal from '../../../modals/CurrencyModal'
import DeliveryCustomerModal from '../../../modals/DeliveryCustomerModal'
import DeliverySettlementModal from '../../../modals/DeliverySettlementModal'
import GroupModal from '../../../modals/GroupModal'
import PriceChangeModal from '../../../modals/PriceChangeModal'
import PriceEnquiryModal from '../../../modals/PriceEnquiryModal'
import PrivilegeCustomerModal from '../../../modals/PrivilegeCustomerModal'
import QtyChangeModal from '../../../modals/QtyChangeModal'
import ReportsModal from '../../../modals/ReportsModal'
import SalesManModal from '../../../modals/SalesManModal'
import LiteMoreOptionsModal from '../../../modals/lite/LiteMoreOptionsModal'
import LitePacketScanModal from '../../../modals/lite/LitePacketScanModal'
import LiteProductLookupModal from '../../../modals/lite/LiteProductLookupModal'
import LiteRecallModal from '../../../modals/lite/LiteRecallModal'
import LiteReprintModal from '../../../modals/lite/LiteReprintModal'

import { liteCustomerSearchFn, liteCreditSettlementFns } from '../services/liteCustomerFns'
import { liteDeliverySettlementFns } from '../services/liteDeliveryFns'
import { litePriceEnquiryFn, liteProductSearchFn } from '../services/liteCatalogFns'
import { liteReportFns } from '../services/liteReportFns'
import { liteReprint } from '../services/liteReprint'

/**
 * Every popup the Lite home screen can open. Only one is open at a time —
 * `active` is its key ('qtyChange', 'report', …), `onClose` closes it.
 *
 * Shared POS modals get their data from the Lite ledger through services/.
 */
export default function LiteModals({
  active, onClose, ledger, salesMan,
  lookupGroup, deliverySavePending,
  onMoreOption, onRecallHold, onCancelHold, onAddItem, onGroupSelect,
  onPrivilegeApply, onCashInOutSave, onDeliveryConfirm, onDeliveryRecall, onSalesManApply,
}) {
  const customerSearch = liteCustomerSearchFn(ledger)

  switch (active) {
    case 'more':
      return <LiteMoreOptionsModal onClose={onClose} onSelect={onMoreOption} />

    case 'report':
      return <ReportsModal onClose={onClose} onSelect={() => {}} {...liteReportFns(ledger)} />

    case 'recall':
      return (
        <LiteRecallModal
          heldBills={ledger.heldBills}
          onClose={onClose}
          onRecall={onRecallHold}
          onCancelHold={onCancelHold}
        />
      )

    case 'reprint':
      return (
        <LiteReprintModal
          onClose={onClose}
          onPrint={(docType, docNo, meta) => liteReprint(ledger, docType, docNo, meta)}
        />
      )

    case 'billDiscount':
      return <BillDiscountModal onClose={onClose} />

    case 'packetScan':
      return <LitePacketScanModal onClose={onClose} onAddItem={onAddItem} />

    case 'productLookup':
      return (
        <LiteProductLookupModal
          onClose={onClose}
          onSelect={onAddItem}
          groupId={lookupGroup?.groupId ?? null}
          groupLabel={lookupGroup?.groupDescription ?? ''}
          searchFn={liteProductSearchFn}
        />
      )

    case 'group':
      return <GroupModal onClose={onClose} onSelect={(result) => { onClose(); onGroupSelect(result) }} />

    case 'priceEnquiry':
      return <PriceEnquiryModal onClose={onClose} searchFn={litePriceEnquiryFn} />

    case 'privilege':
      return <PrivilegeCustomerModal onClose={onClose} onApply={onPrivilegeApply} searchFn={customerSearch(100)} />

    case 'delivery':
      return (
        <DeliveryCustomerModal
          onClose={onClose}
          onConfirm={onDeliveryConfirm}
          title={deliverySavePending ? 'Save Delivery' : 'Delivery Details'}
          searchFn={customerSearch(80)}
        />
      )

    case 'deliverySettlement':
      return (
        <DeliverySettlementModal
          onClose={onClose}
          {...liteDeliverySettlementFns(ledger, { salesMan, onRecall: onDeliveryRecall })}
        />
      )
  }

  // Shared with the normal POS, restyled with the Lite soft-UI numpad/keyboard.
  return (
    <UiVariantProvider variant="neumorphic">
      {active === 'priceChange' && <PriceChangeModal onClose={onClose} />}
      {active === 'qtyChange' && <QtyChangeModal onClose={onClose} />}
      {active === 'currency' && <CurrencyModal onClose={onClose} />}
      {active === 'comments' && (
        <CommentsModal
          onClose={onClose}
          onSave={() => posNotifySuccess('Comment saved', { title: 'Comments', duration: 1200 })}
        />
      )}
      {active === 'salesMan' && <SalesManModal onClose={onClose} onApply={onSalesManApply} />}
      {active === 'cashInOut' && <CashInOutModal onClose={onClose} saveFn={onCashInOutSave} />}
      {active === 'creditSettlement' && <CreditSettlementModal onClose={onClose} {...liteCreditSettlementFns(ledger)} />}
    </UiVariantProvider>
  )
}
