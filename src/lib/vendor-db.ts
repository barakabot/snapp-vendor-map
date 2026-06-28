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

export function getVendorStats() {
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) as count FROM vendors').get() as any).count
  const open = (db.prepare('SELECT COUNT(*) as count FROM vendors WHERE is_open = 1').get() as any).count
  const types = db.prepare('SELECT vendor_type, COUNT(*) as count FROM vendors GROUP BY vendor_type').all() as any[]
  return { total, open, types }
}
