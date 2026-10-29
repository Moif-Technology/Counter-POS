import { useState } from 'react'
import { LITE_CUSTOMERS } from '../data/liteCustomers'

/**
 * Lite POS local "database" — everything the normal POS keeps on the server.
 * Lives for the session only. The services/ adapters read and write it so the
 * shared modals (Reports, Credit/Delivery Settlement, Reprint…) work offline.
 */
export function useLiteLedger() {
  const [customersList, setCustomersList]         = useState(LITE_CUSTOMERS)
  // { id, holdNo, heldAt, customerName, customerId, customerCode, comment, paymentMode, salesMan, priceLevel, isDelivery, deliveryAddress, cartItems, amount }
  const [heldBills, setHeldBills]                 = useState([])
  // { billNo, billDate, counterCloseNo, receipt }
  const [savedBills, setSavedBills]               = useState([])
  // { id, type: 'IN'|'OUT', amount, remarks, createdAt, counterCloseNo }
  const [cashEntries, setCashEntries]             = useState([])
  // { id, deliveryNo, cartItems, address, customerName, amount }
  const [deliveries, setDeliveries]               = useState([])
  // credit settlement receipts
  const [settlementHistory, setSettlementHistory] = useState([])
  // X/Z counter-close history
  const [counterCloses, setCounterCloses]         = useState([])

  return {
    customersList, setCustomersList,
    heldBills, setHeldBills,
    savedBills, setSavedBills,
    cashEntries, setCashEntries,
    deliveries, setDeliveries,
    settlementHistory, setSettlementHistory,
    counterCloses, setCounterCloses,
  }
}
