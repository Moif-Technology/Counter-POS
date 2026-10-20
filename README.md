# Counter-POS

A modern, web-based Point-of-Sale terminal built with React. Designed for fast retail and restaurant checkout — barcode scanning, cart management, multiple payment modes, and a clean keyboard-friendly interface.

---

## What It Does

Counter-POS is the cashier-facing POS terminal. The cashier logs in, scans or types product barcodes, manages the cart, and processes payments. The UI is purpose-built for speed — numpad entry, one-click payment modes, and a full-screen layout with no distractions.

**Current State:** Frontend is wired to the unified MOIF backend API. Browser development can use the hosted backend through the Vite proxy, so frontend developers do not need to run the backend locally.

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2 | UI rendering |
| Vite | 8 | Dev server + build tool |
| React Router | 7.15 | Page routing (Login → POS) |
| Zustand | 5.0 | Global state (cart, session, totals) |
| TanStack Query | 5.100 | Server state caching (ready, not yet used) |
| Tailwind CSS | 4.3 | Utility-first styling |
| Radix UI | — | Headless UI primitives (dialog, tabs, scroll) |
| Lucide React | 1.16 | SVG icons |
| Zod | 4.4 | Schema validation (ready, not yet used) |

---

## Project Structure

```
Counter-pos/
├── public/                    # Static assets, favicon
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                # Router setup (2 routes: / and /pos)
│   ├── index.css              # Design tokens + Tailwind import + Google Fonts
│   ├── lib/
│   │   └── utils.js           # cn() class helper, fmt2()/fmt3() number formatters
│   ├── store/
│   │   └── posStore.js        # Zustand store — all POS state and actions
│   ├── pages/
│   │   ├── LoginPage.jsx      # Cashier login screen
│   │   └── POSPage.jsx        # Main POS interface
│   └── components/
│       └── pos/
│           ├── BarcodeInput.jsx    # Qty × Barcode entry bar
│           ├── BillSummary.jsx     # Totals + payment input footer
│           ├── FunctionButtons.jsx # POS function tabs (Functions/Features/Delivery/Session)
│           ├── ItemPreview.jsx     # Selected cart item detail bar
│           ├── ItemsGrid.jsx       # Cart table (all line items)
│           ├── NumPad.jsx          # 0–9 numpad + ENTER button
│           └── PaymentButtons.jsx  # Cash / Card / Credit / Multi Pay selector
├── index.html
├── vite.config.js
├── eslint.config.js
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm

### Install and Run

```bash
# From the Counter-pos folder
npm install
npm run dev
```

Opens at `http://localhost:5174` (or next available port).

### Available Scripts

| Script | What It Does |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint checks |

---

## Application Flow

### 1. Login Page (`/`)

The cashier opens the app and sees the login screen.

- Toggle between **LOCAL** and **SERVER** database mode (UI toggle — backend switching to be implemented)
- Enter username and password
- Use the **on-screen numpad** for numeric password entry or type directly
- Click **LOGIN** → navigates to `/pos` and sets cashier session in store

### 2. POS Page (`/pos`)

The main working screen. Full-screen layout split into these sections:

```
┌──────────────── HEADER ─────────────────────┐
│ Shop name | Counter | Date | Time | Bill No  │
├──────────────────────────────────────────────┤
│ ITEM PREVIEW — selected item details         │
├─────────────────────────┬────────────────────┤
│                         │  PAYMENT BUTTONS   │
│   ITEMS GRID            │  (Cash/Card/etc.)  │
│   (cart table)          │                    │
│                         │  NUMPAD            │
│   BARCODE INPUT         │  (0–9 + ENTER)     │
│   (qty × barcode)       │                    │
│                         │  FUNCTION BUTTONS  │
│                         │  (tabs)            │
├─────────────────────────┴────────────────────┤
│ BILL SUMMARY — customer | totals | payment   │
├──────────────────────────────────────────────┤
│ FOOTER — version | currency | status         │
└──────────────────────────────────────────────┘
```

---

## How to Add Items to a Bill

1. **Type a barcode** in the barcode input field (or scan with a USB barcode scanner — it types automatically)
2. Optionally **set quantity** first — click the qty pill on the left, enter a number on the numpad
3. Press **ENTER** (numpad or keyboard) — item appears in the cart
4. To **remove an item**, hover the row and click the delete icon
5. To **clear everything**, use the **Clear All** function button

---

## Cart & State

All POS state lives in a single Zustand store (`posStore.js`). State resets when the page is refreshed (RAM only — no localStorage persistence yet).

### What the Store Manages

| Category | Fields |
|---|---|
| **Session** | `cashier` (name + id), `counterNo`, `currency`, `shopName` |
| **Bill** | `billNo`, `billDate`, `cartItems[]`, `selectedRowKey` |
| **Totals** | `subTotal`, `discountAmt`, `taxableAmt`, `taxAmt`, `roundOff`, `netAmount` |
| **Payment** | `paidAmount`, `balanceAmount`, `paymentMode` |
| **Customer** | `customerName`, `customerCode`, `osAmount` (outstanding balance) |
| **Input** | `inputMode` (barcode/qty), `qtyBuffer`, `barcodeBuffer` |

### Cart Item Structure

```js
{
  slNo: 1,
  barcode: "12345",
  description: "Product Name",
  qty: 2,
  unitPrice: 10.00,
  discount: 0,
  lineTotal: 20.00,
  vatPer: 5,
  vatAmt: 1.00
}
```

### How Totals Are Calculated

Every time an item is added or removed, `recalc()` runs automatically:

```
subTotal     = sum of all (unitPrice × qty)
taxableAmt   = subTotal - discountAmt
taxAmt       = sum of all vatAmt per line
netAmount    = taxableAmt + taxAmt  (rounded to 2 decimal)
roundOff     = netAmount - exact value
balanceAmt   = paidAmount - netAmount
```

---

## Payment Modes

| Mode | Behavior |
|---|---|
| **Cash** | Auto-fills paid amount = net total; shows change |
| **Card** | Auto-fills paid amount = net total |
| **Credit** | Manual amount entry; tracks outstanding balance |
| **Multi Pay** | Manual split entry |

Balance shown in **green** if change is due, **red** if amount is short.

---

## Function Buttons

The right panel has 4 tabs:

| Tab | Buttons |
|---|---|
| **Functions** | Clear All, Clear Line, Return, Qty Mode, Hold Bill, Recall Bill, Print Bill, Reprint, Open Drawer, Price Check, Notes, No Sale, Decimal, Manager |
| **Features** | Privilege, Packet Scan, Discount, Reports, Customer Balance, Loyalty, Gift Card, Item Edit, Price Level, Split Bill, Transfer, Cancel, Exchange |
| **Delivery** | Price Level, Save Delivery, Settlement |
| **Session** | Logout (returns to login), Exit |

Most function buttons are UI stubs ready for backend logic to be attached.

---

## Design System

### Colors

| Variable | Value | Used For |
|---|---|---|
| `--brand` | `#5c0000` | Primary brand color (buttons, accents) |
| `--brand-2` | `#8b0000` | Brand hover state |
| `--bg` | `#f7f6f3` | Page background |
| `--surface` | `#ffffff` | Cards, panels |
| `--text-1` | `#1c1a17` | Primary text |
| `--green` | `#15803d` | Success, balance positive |
| `--blue` | `#1d4ed8` | Info, card payment |
| `--amber` | `#b45309` | Warning, credit payment |
| `--purple` | `#6d28d9` | Multi pay |

### Fonts

- **UI text:** Outfit (Google Fonts) — clean, modern sans-serif
- **Numbers:** DM Mono — monospace, tabular digits for price alignment

---

## Backend API Setup

Counter-POS is wired to the unified MOIF backend through `src/lib/api.js`.

For normal frontend development, developers do not need to run the backend locally:

```bash
npm install
npm run dev
```

In browser development, API calls use `VITE_API_URL=/api`. Vite proxies `/api` to the hosted backend configured by `VITE_API_PROXY_TARGET`.

Default remote-backend settings are provided in `.env.example`:

```env
VITE_API_URL=/api
VITE_API_PROXY_TARGET=https://api.moifone.com
```

To use a local backend instead, copy `.env.local.example` to `.env.local`:

```env
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://localhost:5010
```

Android and production builds do not use the Vite dev proxy, so they must use a full API URL:

```env
VITE_API_URL=https://api.moifone.com/api
```

That value is already set in `.env.android` and `.env.production`.

---

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy to any static web host or serve via Express static middleware.

---

## Known Limitations

| Limitation | Notes |
|---|---|
| Some feature buttons are still stubs | Core POS API flows are wired, but a few secondary buttons still need final business logic |
| No cart persistence | Cart resets on page refresh (no localStorage) |
| DB mode toggle is UI only | LOCAL/SERVER switch has no actual effect yet |
| Print / receipt | Button exists, no print logic implemented |
| Most function buttons are stubs | UI only, no business logic attached |
| Barcode scanner | Works with USB HID scanners (they type into the input field automatically) |

---

## Part of MOIF ERP

Counter-POS is one application in the larger MOIF ERP platform. It connects to the same backend API (`api/`) and PostgreSQL database as the main ERP frontend, Flutter desktop POS, and marketing site. See the root `README.md` for full platform documentation.
