import { NextRequest, NextResponse } from 'next/server'
import {
  getVendorsByDistance,
  getVendorTypes,
  getCities,
  getVendorStats,
  VENDOR_TYPE_LABELS,
} from '@/lib/vendor-db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '35.6892')
  const lng = parseFloat(searchParams.get('lng') || '51.389')
  const category = searchParams.get('category') || undefined
  const city = searchParams.get('city') || undefined
  const limit = parseInt(searchParams.get('limit') || '50')
  const isOpen = searchParams.get('isOpen')
  const mode = searchParams.get('mode')

  try {
    if (mode === 'types') {
      const types = getVendorTypes()
      return NextResponse.json({
        types: types.map(t => ({ value: t, label: VENDOR_TYPE_LABELS[t] || t })),
      })
    }

    if (mode === 'cities') {
      const cities = getCities()
      return NextResponse.json({ cities })
    }

    if (mode === 'stats') {
      const stats = getVendorStats()
      return NextResponse.json(stats)
    }

    const vendors = getVendorsByDistance(
      lat,
      lng,
      category,
      city,
      limit,
      isOpen !== null ? isOpen === 'true' : undefined
    )

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('Vendor API error:', error)
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
  }
}