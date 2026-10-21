/** Product groups shown as filter chips above the Lite POS search box. */
export const LITE_GROUPS = [
  'Drinks',
  'Fresh Produce',
  'Perfumes',
  'Personal Care',
  'Toys',
  'Watches',
  'Chips',
]

/** Sample product catalog for the Lite POS (no backend dependency). */
export const LITE_PRODUCTS = [
  { productId: 1,  barcode: '1001', description: 'Water Bottle 500ml',   price: 1.50,  group: 'Drinks' },
  { productId: 2,  barcode: '1002', description: 'Orange Juice 1L',      price: 6.00,  group: 'Drinks' },
  { productId: 3,  barcode: '1003', description: 'Cola Can 330ml',       price: 2.25,  group: 'Drinks' },
  { productId: 4,  barcode: '1004', description: 'Milk 1L',              price: 5.25,  group: 'Drinks' },

  { productId: 5,  barcode: '1005', description: 'Tomato 1kg',           price: 4.50,  group: 'Fresh Produce' },
  { productId: 6,  barcode: '1006', description: 'Banana 1kg',           price: 3.75,  group: 'Fresh Produce' },
  { productId: 7,  barcode: '1007', description: 'Cucumber 1kg',         price: 2.90,  group: 'Fresh Produce' },
  { productId: 8,  barcode: '1008', description: 'Chicken 1kg',          price: 18.00, group: 'Fresh Produce' },

  { productId: 9,  barcode: '1009', description: 'Perfume Oud 50ml',     price: 45.00, group: 'Perfumes' },
  { productId: 10, barcode: '1010', description: 'Perfume Floral 30ml',  price: 32.00, group: 'Perfumes' },
  { productId: 11, barcode: '1011', description: 'Body Mist 100ml',      price: 15.00, group: 'Perfumes' },

  { productId: 12, barcode: '1012', description: 'Shampoo 400ml',        price: 12.50, group: 'Personal Care' },
  { productId: 13, barcode: '1013', description: 'Toothpaste 100g',      price: 5.00,  group: 'Personal Care' },
  { productId: 14, barcode: '1014', description: 'Hand Wash 250ml',      price: 7.25,  group: 'Personal Care' },

  { productId: 15, barcode: '1015', description: 'Building Blocks Set',  price: 25.00, group: 'Toys' },
  { productId: 16, barcode: '1016', description: 'Remote Control Car',   price: 40.00, group: 'Toys' },
  { productId: 17, barcode: '1017', description: 'Puzzle 500pc',         price: 18.00, group: 'Toys' },

  { productId: 18, barcode: '1018', description: 'Classic Analog Watch', price: 85.00, group: 'Watches' },
  { productId: 19, barcode: '1019', description: 'Digital Sports Watch', price: 60.00, group: 'Watches' },

  { productId: 20, barcode: '1020', description: 'Potato Chips 150g',    price: 3.50,  group: 'Chips' },
  { productId: 21, barcode: '1021', description: 'Corn Chips 120g',      price: 3.00,  group: 'Chips' },
  { productId: 22, barcode: '1022', description: 'Tortilla Chips 200g',  price: 4.20,  group: 'Chips' },
]

export function searchLiteProducts(query, group) {
  const q = String(query || '').trim().toLowerCase()
  return LITE_PRODUCTS.filter(p => {
    if (group && p.group !== group) return false
    if (!q) return true
    return p.description.toLowerCase().includes(q) || p.barcode.includes(q)
  })
}
