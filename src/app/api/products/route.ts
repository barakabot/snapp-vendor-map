import { NextRequest, NextResponse } from 'next/server'
import { searchProducts, getUniqueProductNames } from '@/lib/vendor-db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const mode = searchParams.get('mode')

  try {
    if (mode === 'names') {
      const names = getUniqueProductNames(query || undefined)
      return NextResponse.json(names)
    }

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    const products = searchProducts(query)
    return NextResponse.json(products)
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}