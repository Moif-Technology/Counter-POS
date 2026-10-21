// Product lookups for the shared ProductLookup / PriceEnquiry modals, backed by
// the Lite demo catalogue instead of the server.
import { LITE_TAX_RATE } from '../../../config/appConfig'
import { searchLiteProducts } from '../data/liteProducts'
import { LITE_GROUP_OBJECTS, notFound } from '../liteHelpers'

export const liteProductSearchFn = async (q, price, gid) => {
  const groupName = gid != null ? LITE_GROUP_OBJECTS.find(g => g.groupId === gid)?.groupDescription : null
  let list = searchLiteProducts(q, groupName)
  const maxPrice = parseFloat(price)
  if (Number.isFinite(maxPrice) && maxPrice > 0) list = list.filter(p => p.price <= maxPrice)
  return { products: list.map(p => ({ ...p, unitPrice: p.price, unitName: '—' })) }
}

export const litePriceEnquiryFn = async (term) => {
  const match = searchLiteProducts(term)[0]
  if (!match) throw notFound('No item found for this barcode')
  return {
    product: {
      barcode: match.barcode, description: match.description, unitName: '—',
      unitPrice: match.price, vatPer: LITE_TAX_RATE, qtyOnHand: 999,
    },
  }
}
