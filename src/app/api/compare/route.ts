import { NextRequest, NextResponse } from 'next/server'
import { compareBasket, BasketItem } from '@/lib/vendor-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { basket, lat, lng, maxDistance } = body as {
      basket: BasketItem[]
      lat: number
      lng: number
      maxDistance?: number
    }

    if (!basket || !Array.isArray(basket) || basket.length === 0) {
      return NextResponse.json({ error: 'Basket is required and must not be empty' }, { status: 400 })
    }

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    const results = compareBasket(basket, lat, lng, maxDistance || 50)
    return NextResponse.json(results)
  } catch (error) {
    console.error('Compare API error:', error)
    return NextResponse.json({ error: 'Failed to compare basket' }, { status: 500 })
  }
}