/**
 * Thermal-style receipt print (80mm) via a hidden iframe, so the POS screen
 * itself is never sent to the printer. Call with a snapshot of the bill taken
 * BEFORE the cart is cleared.
 */

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const money = (n) => (Number(n) || 0).toFixed(2)

function buildReceiptHtml(bill) {
  const {
    shopName, shopSubName, billNo, billDate,
    cashierName, counterNo, customerName,
    items = [],
    subTotal, discountAmt, taxAmt, roundOff, netAmount,
    paidAmount, balanceAmount, paymentMode, currency = 'AED',
  } = bill

  const d = billDate instanceof Date ? billDate : new Date()
  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const rows = items.map(it => `
    <tr>
      <td colspan="3" class="desc">${esc(it.description)}</td>
    </tr>
    <tr class="nums">
      <td>${money(it.qty)} x ${money(it.unitPrice)}</td>
      <td class="r">${it.vatPer ? money(it.vatPer) + '%' : ''}</td>
      <td class="r">${money(it.lineTotal)}</td>
    </tr>`).join('')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt ${esc(billNo)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 72mm; margin: 0 auto; font-family: 'Courier New', monospace; font-size: 11px; color: #000; }
  .c { text-align: center; }
  .r { text-align: right; }
  h1 { font-size: 14px; }
  .sub { font-size: 10px; }
  hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .desc { font-weight: bold; }
  .tot td { padding: 1px 0; }
  .net td { font-size: 13px; font-weight: bold; padding: 3px 0; }
  .meta { font-size: 10px; }
</style>
</head>
<body>
  <div class="c">
    <h1>${esc(shopName)}</h1>
    ${shopSubName ? `<div class="sub">${esc(shopSubName)}</div>` : ''}
  </div>
  <hr>
  <table class="meta">
    <tr><td>Bill No: <b>${esc(billNo)}</b></td><td class="r">${dateStr} ${timeStr}</td></tr>
    <tr><td>Counter: ${esc(counterNo || '1')}</td><td class="r">Cashier: ${esc(cashierName || '')}</td></tr>
    ${customerName ? `<tr><td colspan="2">Customer: ${esc(customerName)}</td></tr>` : ''}
  </table>
  <hr>
  <table>${rows}</table>
  <hr>
  <table class="tot">
    <tr><td>Sub Total</td><td class="r">${money(subTotal)}</td></tr>
    ${Number(discountAmt) ? `<tr><td>Discount</td><td class="r">-${money(discountAmt)}</td></tr>` : ''}
    ${Number(taxAmt) ? `<tr><td>VAT</td><td class="r">${money(taxAmt)}</td></tr>` : ''}
    ${Number(roundOff) ? `<tr><td>Round Off</td><td class="r">${money(roundOff)}</td></tr>` : ''}
  </table>
  <hr>
  <table>
    <tr class="net"><td>NET (${esc(currency)})</td><td class="r">${money(netAmount)}</td></tr>
    <tr><td>Paid (${esc(paymentMode || 'CASH')})</td><td class="r">${money(paidAmount)}</td></tr>
    <tr><td>Balance</td><td class="r">${money(balanceAmount)}</td></tr>
  </table>
  <hr>
  <div class="c sub">Thank you for shopping!</div>
</body>
</html>`
}

export function printReceipt(bill) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(frame)

  const win = frame.contentWindow
  win.document.open()
  win.document.write(buildReceiptHtml(bill))
  win.document.close()

  // Give the iframe a tick to lay out before printing, then clean up.
  setTimeout(() => {
    win.focus()
    win.print()
    setTimeout(() => document.body.removeChild(frame), 2000)
  }, 50)
}
