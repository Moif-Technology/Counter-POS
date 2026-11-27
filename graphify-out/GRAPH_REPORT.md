# Graph Report - Counter-pos  (2026-11-19)

## Corpus Check
- 172 files · ~1,715,990 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 791 nodes · 1275 edges · 46 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 299 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]

## God Nodes (most connected - your core abstractions)
1. `fmtMoney()` - 36 edges
2. `SunmiPrinterPlugin` - 25 edges
3. `roundMoney()` - 24 edges
4. `buildBillPrintCommands()` - 20 edges
5. `buildDeliveryPrintCommands()` - 19 edges
6. `buildHoldPrintCommands()` - 17 edges
7. `idb()` - 17 edges
8. `normalizePaymentMode()` - 17 edges
9. `buildDeliveryReceiptHtml()` - 17 edges
10. `buildBillReceiptHtml()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `fmtMoney()` --calls--> `RecallHoldModal()`  [INFERRED]
  src\lib\currencyFormat.js → src\modals\RecallHoldModal.jsx
- `roundMoney()` --calls--> `roundAmt()`  [INFERRED]
  src\lib\currencyFormat.js → src\pages\lite\liteHelpers.js
- `offlineReceiptBill()` --calls--> `saveBillOffline()`  [INFERRED]
  src\lib\offlineSync.js → src\pages\pos\hooks\useSaveBill.js
- `money()` --calls--> `fmtMoney()`  [INFERRED]
  src\lib\androidPosPrinter.js → src\lib\currencyFormat.js
- `money()` --calls--> `offlineBlockReason()`  [INFERRED]
  src\lib\androidPosPrinter.js → src\lib\offlineSync.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (57): LiteBillSummary(), LiteMobileTabs(), fmtMoney(), getReceiptPrinterName(), buildBillReceiptHtml(), isWalkInCustomer(), lineUnitDisplay(), printBillFromData() (+49 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (57): deviceBillForReturn(), offlineError(), request(), withCache(), withStored(), addSynced(), applyStockDeduction(), billKey() (+49 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (37): PosItemCard(), calcLineTotals(), findCartItemByKey(), getCartRowKey(), lineTaxableBeforeDiscount(), lineVatRate(), normalizeCartLine(), resolveUnitPriceGross() (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (48): amountLine(), billLineUnitDisplay(), billNoLabel(), buildBillPrintCommands(), buildCounterReportPrintCommands(), buildCreditReceiptVoucherPrintCommands(), buildDeliveryPrintCommands(), buildHoldPrintCommands() (+40 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (30): PosLineActionBar(), PosPaymentPad(), PosPayTiles(), clearScanAndRefocus(), recallDocument(), useBarcodeEntry(), usePosActions(), askOpeningFloat() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (20): PosTransactionPanel(), isCashTenderMode(), isCreditCardMode(), isMultiPaymentMode(), normalizePaymentMode(), resolveMode(), CreditReceiptVoucher(), CreditSettlementHistoryList() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (2): onServiceConnected(), SunmiPrinterPlugin

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (20): buildCode39Svg(), encodeCode39(), patternToBars(), buildDeliveryBarcodeSvg(), formatDeliveryBarcode(), parseDeliveryBarcode(), parseDeliveryBarcodeScan(), parseDeliveryRemarks() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (5): CustomerDisplayPlugin, CustomerDisplayPresentation, SunmiCameraScannerPlugin, Plugin, Presentation

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (7): getCurrencyPrecision(), broadcast(), broadcastSaved(), buildPayload(), ch(), poleLines(), writePole()

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (6): Keyboard(), ClassicBtn(), keyClass(), NeuBtn(), Numpad(), useUiVariant()

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (3): getEnrollment(), LoginPage(), RequireEnrollment()

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (7): moneyPlaceholder(), isGroupBrowseMode(), LiteRecallModal(), CashInOutModal(), CounterReadingModal(), GroupModal(), GroupPriceModal()

### Community 13 - "Community 13"
Cohesion: 0.21
Nodes (7): CustomerRow(), CustomerSearch(), LiteModals(), liteCreditSettlementFns(), liteCustomerSearchFn(), liteDeliverySettlementFns(), liteReportFns()

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (4): fmt(), SavedScreen(), ScanScreen(), PriceEnquiryModal()

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (5): searchLiteProducts(), notFound(), roundAmt(), litePriceEnquiryFn(), liteProductSearchFn()

### Community 17 - "Community 17"
Cohesion: 0.36
Nodes (7): pad(), PosClock(), useNow(), areaOf(), defaultDeliveryTime(), DeliveryCustomerModal(), searchText()

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (3): Modal(), PosItemsTable(), useEscapeKey()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (7): addDays(), DateRangePicker(), iso(), pad(), parse(), presets(), pretty()

### Community 20 - "Community 20"
Cohesion: 0.61
Nodes (7): derive(), fromHex(), offlineLogin(), read(), rememberLogin(), toHex(), write()

### Community 21 - "Community 21"
Cohesion: 0.39
Nodes (6): CloseDetailModal(), CounterCloseViewerModal(), daysAgoISO(), fmtDateTime(), orDash(), todayISO()

### Community 22 - "Community 22"
Cohesion: 0.32
Nodes (4): emptyPriv(), localLoad(), localSave(), PrivilegeSettingsModal()

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (4): DateTimePicker(), display(), pad(), toValue()

### Community 24 - "Community 24"
Cohesion: 0.47
Nodes (3): pad(), parseTime(), TimePicker()

### Community 25 - "Community 25"
Cohesion: 0.47
Nodes (3): handlesKeysItself(), onKeyDown(), scopeOf()

### Community 26 - "Community 26"
Cohesion: 0.47
Nodes (4): ClearHoldBillModal(), fmtDateTime(), holdAge(), startOfDay()

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (3): useLiteBill(), useLiteLedger(), LiteHomePage()

### Community 28 - "Community 28"
Cohesion: 0.7
Nodes (4): Calendar(), daysInMonth(), firstDay(), isoDate()

### Community 29 - "Community 29"
Cohesion: 0.6
Nodes (3): CashInOutViewerModal(), daysAgoISO(), todayISO()

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (3): holdAge(), RecallHoldModal(), startOfDay()

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (2): BridgeActivity, MainActivity

### Community 32 - "Community 32"
Cohesion: 0.83
Nodes (3): extractSunmiBarcode(), firstTextValue(), scanSunmiBarcode()

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (2): LiteSearchPanel(), groupChipStyle()

### Community 38 - "Community 38"
Cohesion: 0.83
Nodes (3): fmtDateTime(), fmtTime(), SyncStatusButton()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (1): ExampleInstrumentedTest

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (1): ExampleUnitTest

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (2): DatePicker(), formatDisplayDate()

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (2): BillReprintModal(), isoDate()

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (2): fmtCloseDate(), GroupWiseReportModal()

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (2): inputStyle(), ReceiptModal()

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (2): inputStyle(), SalesManModal()

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (2): fmtCloseDate(), StaffWiseReportModal()

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (2): LiteMoreOptionsModal(), renderActionGroup()

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (2): inputStyle(), LiteProductLookupModal()

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (2): isoDate(), LiteReprintModal()

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (2): canFullscreen(), PosFullscreenButton()

## Knowledge Gaps
- **Thin community `Community 6`** (27 nodes): `SunmiPrinterPlugin.java`, `onServiceConnected()`, `onServiceDisconnected()`, `SunmiPrinterPlugin`, `.bindPrinterService()`, `.clearPending()`, `.clearPendingHtml()`, `.drawThermalText()`, `.executeCommand()`, `.executePrint()`, `.executePrintHtml()`, `.isAvailable()`, `.isEmphasisLine()`, `.isHardPrinterError()`, `.isRuleLine()`, `.jsonIntArray()`, `.jsonStringArray()`, `.load()`, `.print()`, `.printBitmap()`, `.printerStateMessage()`, `.printHtml()`, `.rejectOnMain()`, `.renderAndPrintHtml()`, `.renderReceiptTextBitmap()`, `.resolveAvailability()`, `.resolveOnMain()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `MainActivity.java`, `BridgeActivity`, `MainActivity`, `.onCreate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (4 nodes): `LiteSearchPanel()`, `groupChipStyle()`, `LiteSearchPanel.jsx`, `liteStyles.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (3 nodes): `ExampleInstrumentedTest.java`, `ExampleInstrumentedTest`, `.useAppContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (3 nodes): `ExampleUnitTest.java`, `ExampleUnitTest`, `.addition_isCorrect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (3 nodes): `DatePicker()`, `formatDisplayDate()`, `DatePicker.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (3 nodes): `BillReprintModal()`, `isoDate()`, `BillReprintModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (3 nodes): `fmtCloseDate()`, `GroupWiseReportModal()`, `GroupWiseReportModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (3 nodes): `inputStyle()`, `ReceiptModal()`, `ReceiptModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (3 nodes): `inputStyle()`, `SalesManModal()`, `SalesManModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `fmtCloseDate()`, `StaffWiseReportModal()`, `StaffWiseReportModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (3 nodes): `LiteMoreOptionsModal()`, `renderActionGroup()`, `LiteMoreOptionsModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (3 nodes): `inputStyle()`, `LiteProductLookupModal()`, `LiteProductLookupModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (3 nodes): `isoDate()`, `LiteReprintModal()`, `LiteReprintModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (3 nodes): `canFullscreen()`, `PosFullscreenButton()`, `PosFullscreenButton.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fmtMoney()` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 9`, `Community 12`, `Community 13`, `Community 14`, `Community 17`, `Community 26`, `Community 30`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `offlineBlockReason()` connect `Community 1` to `Community 3`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `money()` connect `Community 3` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 34 inferred relationships involving `fmtMoney()` (e.g. with `money()` and `poleLines()`) actually correct?**
  _`fmtMoney()` has 34 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `roundMoney()` (e.g. with `resolveUnitPricesFromInput()` and `resolveUnitPriceGross()`) actually correct?**
  _`roundMoney()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `buildBillPrintCommands()` (e.g. with `normalizePaymentMode()` and `isMultiPaymentMode()`) actually correct?**
  _`buildBillPrintCommands()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `buildDeliveryPrintCommands()` (e.g. with `fmtReceiptDateTime()` and `resolveCashierName()`) actually correct?**
  _`buildDeliveryPrintCommands()` has 4 INFERRED edges - model-reasoned connections that need verification._