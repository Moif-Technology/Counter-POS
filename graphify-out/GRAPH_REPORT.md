# Graph Report - d:/ERP SOFTWARE DESKTOP/ERP new version/Counter-pos  (2026-06-16)

## Corpus Check
- 47 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 134 nodes · 113 edges · 11 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Counter Reading & Utils|Counter Reading & Utils]]
- [[_COMMUNITY_Auth & Device Token|Auth & Device Token]]
- [[_COMMUNITY_Customer Search & Store|Customer Search & Store]]
- [[_COMMUNITY_Recall Hold & Formatting|Recall Hold & Formatting]]
- [[_COMMUNITY_Calendar Picker|Calendar Picker]]
- [[_COMMUNITY_Receipt Printing|Receipt Printing]]
- [[_COMMUNITY_Bill Reprint Modal|Bill Reprint Modal]]
- [[_COMMUNITY_Price Change Modal|Price Change Modal]]
- [[_COMMUNITY_Price Enquiry Modal|Price Enquiry Modal]]
- [[_COMMUNITY_Receipt Modal|Receipt Modal]]
- [[_COMMUNITY_Salesman Modal|Salesman Modal]]

## God Nodes (most connected - your core abstractions)
1. `fmt3()` - 8 edges
2. `Calendar()` - 4 edges
3. `buildReceiptHtml()` - 4 edges
4. `BillReprintModal()` - 3 edges
5. `PriceChangeModal()` - 3 edges
6. `fmt()` - 3 edges
7. `getEnrollment()` - 3 edges
8. `featureEnabled()` - 3 edges
9. `RequireEnrollment()` - 2 edges
10. `isoDate()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `CounterReadingModal()` --calls--> `fmt3()`  [INFERRED]
  src\components\popup\CounterReadingModal.jsx → src\lib\utils.js
- `ItemDetailModal()` --calls--> `fmt3()`  [INFERRED]
  src\components\popup\ItemDetailModal.jsx → src\lib\utils.js
- `StaffWiseReportModal()` --calls--> `fmt3()`  [INFERRED]
  src\components\popup\StaffWiseReportModal.jsx → src\lib\utils.js
- `BillSummary()` --calls--> `fmt3()`  [INFERRED]
  src\components\pos\BillSummary.jsx → src\lib\utils.js
- `ItemDetailModal()` --calls--> `fmt3()`  [INFERRED]
  src\components\pos\ItemDetailModal.jsx → src\lib\utils.js

## Communities

### Community 0 - "Counter Reading & Utils"
Cohesion: 0.09
Nodes (8): fmt3(), CounterReadingModal(), ItemDetailModal(), StaffWiseReportModal(), BillSummary(), ItemDetailModal(), ItemPreview(), ItemsGrid()

### Community 1 - "Auth & Device Token"
Cohesion: 0.13
Nodes (3): getEnrollment(), LoginPage(), RequireEnrollment()

### Community 2 - "Customer Search & Store"
Cohesion: 0.33
Nodes (3): CustomerSearch(), featureEnabled(), hasFeature()

### Community 3 - "Recall Hold & Formatting"
Cohesion: 0.5
Nodes (2): fmt(), RecallHoldModal()

### Community 4 - "Calendar Picker"
Cohesion: 0.7
Nodes (4): Calendar(), daysInMonth(), firstDay(), isoDate()

### Community 5 - "Receipt Printing"
Cohesion: 0.7
Nodes (4): buildReceiptHtml(), esc(), money(), printReceipt()

### Community 6 - "Bill Reprint Modal"
Cohesion: 0.83
Nodes (3): BillReprintModal(), formatDisplay(), isoDate()

### Community 7 - "Price Change Modal"
Cohesion: 0.83
Nodes (3): fmt2(), fmt4(), PriceChangeModal()

### Community 8 - "Price Enquiry Modal"
Cohesion: 0.83
Nodes (3): fmt(), PriceEnquiryModal(), TableRow()

### Community 12 - "Receipt Modal"
Cohesion: 1.0
Nodes (2): inputStyle(), ReceiptModal()

### Community 13 - "Salesman Modal"
Cohesion: 1.0
Nodes (2): inputStyle(), SalesManModal()

## Knowledge Gaps
- **Thin community `Recall Hold & Formatting`** (5 nodes): `fmt()`, `fmtDateTime()`, `getSalesMan()`, `RecallHoldModal()`, `RecallHoldModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Receipt Modal`** (3 nodes): `inputStyle()`, `ReceiptModal()`, `ReceiptModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Salesman Modal`** (3 nodes): `inputStyle()`, `SalesManModal()`, `SalesManModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 7 inferred relationships involving `fmt3()` (e.g. with `CounterReadingModal()` and `ItemDetailModal()`) actually correct?**
  _`fmt3()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Should `Counter Reading & Utils` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Auth & Device Token` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._