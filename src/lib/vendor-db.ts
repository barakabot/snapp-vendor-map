import Database from 'better-sqlite3'

const dbPath = '/home/z/my-project/db/snapp_vendors.db'

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath, { readonly: true })
  }
  return _db
}

export interface Vendor {
  id: string
  title: string
  code: string
  vendor_type: string
  city: string
  lat: number
  long: number
  rating: number
  rate_1_to_5: number
  comment_count: number
  minimum_order_value: number
  delivery_fee: number
  delivery_time: number
  is_open: number
  is_pro: number
  badges: string
  coupon_info: string
  logo: string
}

export interface VendorWithDistance extends Vendor {
  distance: number
}

const VENDOR_TYPE_LABELS: Record<string, string> = {
  RESTAURANT: 'رستوران',
  CONFECTIONERY: 'شیرینی‌فروشی',
  CAFFE: 'کافه',
  CHAIN_STORE: 'فروشگاه زنجیره‌ای',
  CORNER_SHOP: 'سوپرمارکت',
  SUPER_MALL: 'هایپرمارکت',
}

export { VENDOR_TYPE_LABELS }

export function getVendorTypes(): string[] {
  const db = getDb()
  const rows = db.prepare('SELECT DISTINCT vendor_type FROM vendors ORDER BY vendor_type').all() as { vendor_type: string }[]
  return rows.map(r => r.vendor_type)
}

export function getCities(): string[] {
  const db = getDb()
  const rows = db.prepare('SELECT DISTINCT city FROM vendors ORDER BY city').all() as { city: string }[]
  return rows.map(r => r.city)
}

export function getVendorsByDistance(
  lat: number,
  lng: number,
  category?: string,
  city?: string,
  limit: number = 50,
  isOpen?: boolean
): VendorWithDistance[] {
  const db = getDb()

  let query = `
    SELECT 
      id, title, code, vendor_type, city, lat, long,
      rating, rate_1_to_5, comment_count,
      minimum_order_value, delivery_fee, delivery_time,
      is_open, is_pro, badges, coupon_info, logo,
      ((lat - ?) * (lat - ?) + (long - ?) * (long - ?)) AS distance_sq
    FROM vendors
    WHERE 1=1
  `
  const params: (number | string)[] = [lat, lat, lng, lng]

  if (category && category !== 'ALL') {
    query += ' AND vendor_type = ?'
    params.push(category)
  }

  if (city && city !== 'ALL') {
    query += ' AND city = ?'
    params.push(city)
  }

  if (isOpen !== undefined) {
    query += ' AND is_open = ?'
    params.push(isOpen ? 1 : 0)
  }

  query += ` ORDER BY distance_sq ASC LIMIT ${limit}`

  const rows = db.prepare(query).all(...params) as any[]

  // Convert squared distance to approximate km (1 degree ~ 111km)
  return rows.map(row => ({
    ...row,
    distance: Math.sqrt(row.distance_sq) * 111,
  }))
}

export function getVendorById(id: string): Vendor | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id) as any
  return row || null
}

// --- Product Types ---
export interface Product {
  id: number
  vendor_id: string
  name: string
  price: number
  category: string
}

export interface ProductWithVendor extends Product {
  vendor_title: string
  vendor_code: string
  vendor_type: string
  vendor_city: string
  vendor_lat: number
  vendor_long: number
  vendor_rating: number
  vendor_rate_1_to_5: number
  vendor_delivery_fee: number
  vendor_delivery_time: number
  vendor_is_open: number
  vendor_is_pro: number
  vendor_logo: string
  vendor_minimum_order_value: number
}

export interface BasketItem {
  name: string
  quantity: number
}

export interface VendorBasketResult {
  vendor_id: string
  vendor_title: string
  vendor_code: string
  vendor_type: string
  vendor_city: string
  vendor_lat: number
  vendor_long: number
  vendor_rating: number
  vendor_rate_1_to_5: number
  vendor_delivery_fee: number
  vendor_delivery_time: number
  vendor_is_open: number
  vendor_is_pro: number
  vendor_logo: string
  vendor_minimum_order_value: number
  distance: number
  items: {
    name: string
    requested_qty: number
    unit_price: number
    subtotal: number
    available: boolean
  }[]
  items_total: number
  delivery_fee: number
  grand_total: number
  available_count: number
  all_available: boolean
}

export function searchProducts(query: string, limit: number = 20): ProductWithVendor[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT p.*, v.title as vendor_title, v.code as vendor_code, v.vendor_type as vendor_type,
      v.city as vendor_city, v.lat as vendor_lat, v.long as vendor_long,
      v.rating as vendor_rating, v.rate_1_to_5 as vendor_rate_1_to_5,
      v.delivery_fee as vendor_delivery_fee, v.delivery_time as vendor_delivery_time,
      v.is_open as vendor_is_open, v.is_pro as vendor_is_pro, v.logo as vendor_logo,
      v.minimum_order_value as vendor_minimum_order_value
    FROM products p
    JOIN vendors v ON p.vendor_id = v.id
    WHERE p.name LIKE ?
    ORDER BY p.price ASC
    LIMIT ?
  `).all(`%${query}%`, limit) as any[]
  return rows
}

export function getUniqueProductNames(query?: string): { name: string; category: string; count: number; min_price: number; max_price: number }[] {
  const db = getDb()
  let sql = `
    SELECT p.name, p.category, COUNT(*) as count, MIN(p.price) as min_price, MAX(p.price) as max_price
    FROM products p
  `
  const params: string[] = []
  if (query) {
    sql += ' WHERE p.name LIKE ?'
    params.push(`%${query}%`)
  }
  sql += ' GROUP BY p.name ORDER BY count DESC LIMIT 30'
  return db.prepare(sql).all(...params) as any[]
}

export function compareBasket(
  basket: BasketItem[],
  userLat: number,
  userLng: number,
 maxDistanceKm: number = 50
): VendorBasketResult[] {
  if (basket.length === 0) return []

  const db = getDb()

  // Build a query to find vendors that have ALL (or most) basket items
  const itemNames = basket.map(b => b.name)
  const placeholders = itemNames.map(() => '?').join(',')

  // Get all vendors that have at least one basket item
  const vendorRows = db.prepare(`
    SELECT 
      v.id, v.title, v.code, v.vendor_type, v.city,
      v.lat, v.long, v.rating, v.rate_1_to_5,
      v.delivery_fee, v.delivery_time, v.is_open, v.is_pro,
      v.logo, v.minimum_order_value,
      ((v.lat - ?) * (v.lat - ?) + (v.long - ?) * (v.long - ?)) AS distance_sq,
      COUNT(DISTINCT p.name) as available_count
    FROM vendors v
    JOIN products p ON v.id = p.vendor_id
    WHERE p.name IN (${placeholders})
    GROUP BY v.id
    HAVING available_count > 0
    ORDER BY available_count DESC
    LIMIT 200
  `).all(userLat, userLat, userLng, userLng, ...itemNames) as any[]

  const results: VendorBasketResult[] = []

  for (const v of vendorRows) {
    const distKm = Math.sqrt(v.distance_sq) * 111
    if (distKm > maxDistanceKm) continue

    const items = basket.map(b => {
      const product = db.prepare(
        'SELECT price FROM products WHERE vendor_id = ? AND name = ? LIMIT 1'
      ).get(v.id, b.name) as { price: number } | undefined

      return {
        name: b.name,
        requested_qty: b.quantity,
        unit_price: product?.price || 0,
        subtotal: (product?.price || 0) * b.quantity,
        available: !!product,
      }
    })

    const availableItems = items.filter(i => i.available)
    const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0)

    results.push({
      vendor_id: v.id,
      vendor_title: v.title,
      vendor_code: v.code,
      vendor_type: v.vendor_type,
      vendor_city: v.city,
      vendor_lat: v.lat,
      vendor_long: v.long,
      vendor_rating: v.rating,
      vendor_rate_1_to_5: v.rate_1_to_5,
      delivery_fee: v.delivery_fee,
      vendor_delivery_time: v.delivery_time,
      vendor_is_open: v.is_open,
      vendor_is_pro: v.is_pro,
      vendor_logo: v.logo,
      vendor_minimum_order_value: v.minimum_order_value,
      distance: distKm,
      items,
      items_total: itemsTotal,
      delivery_fee: v.delivery_fee,
      grand_total: itemsTotal + v.delivery_fee,
      available_count: availableItems.length,
      all_available: availableItems.length === basket.length,
    })
  }

  // Sort: vendors with all items first, then by grand_total (cheapest), then by distance
  results.sort((a, b) => {
    if (a.all_available !== b.all_available) return a.all_available ? -1 : 1
    if (a.available_count !== b.available_count) return b.available_count - a.available_count
    if (a.grand_total !== b.grand_total) return a.grand_total - b.grand_total
    return a.distance - b.distance
  })

  return results
}

export function getVendorStats() {
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) as count FROM vendors').get() as any).count
  const open = (db.prepare('SELECT COUNT(*) as count FROM vendors WHERE is_open = 1').get() as any).count
  const types = db.prepare('SELECT vendor_type, COUNT(*) as count FROM vendors GROUP BY vendor_type').all() as any[]
  return { total, open, types }
}
