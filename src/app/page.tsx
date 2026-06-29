'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  MapPin,
  Navigation,
  Star,
  Clock,
  Truck,
  Filter,
  List,
  X,
  ExternalLink,
  Search,
  Store,
  ShoppingCart,
  Plus,
  Minus,
  Trophy,
  Check,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// --- Types ---
interface VendorType {
  value: string
  label: string
}

interface Vendor {
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
  distance: number
}

interface BasketItem {
  name: string
  quantity: number
}

interface ProductSuggestion {
  name: string
  category: string
  count: number
  min_price: number
  max_price: number
}

interface CompareResult {
  vendor_id: string
  vendor_title: string
  vendor_code: string
  vendor_type: string
  vendor_city: string
  vendor_lat: number
  vendor_long: number
  vendor_rate_1_to_5: number
  vendor_delivery_fee: number
  vendor_delivery_time: number
  vendor_is_open: number
  vendor_is_pro: number
  vendor_logo: string
  vendor_minimum_order_value: number
  distance: number
  items: { name: string; requested_qty: number; unit_price: number; subtotal: number; available: boolean }[]
  items_total: number
  delivery_fee: number
  grand_total: number
  available_count: number
  all_available: boolean
}

// --- Constants ---
const DEFAULT_CENTER: [number, number] = [35.6892, 51.389]
const DEFAULT_ZOOM = 12

const TYPE_COLORS: Record<string, string> = {
  RESTAURANT: '#ef4444',
  CONFECTIONERY: '#f59e0b',
  CAFFE: '#8b5cf6',
  CHAIN_STORE: '#3b82f6',
  CORNER_SHOP: '#22c55e',
  SUPER_MALL: '#ec4899',
}

const TYPE_ICONS: Record<string, string> = {
  RESTAURANT: '🍽',
  CONFECTIONERY: '🧁',
  CAFFE: '☕',
  CHAIN_STORE: '🏪',
  CORNER_SHOP: '🛒',
  SUPER_MALL: '🏬',
}

const CATEGORY_ICONS: Record<string, string> = {
  'غذا': '🍽',
  'ساندویچ': '🥪',
  'پیتزا': '🍕',
  'نوشیدنی': '🥤',
  'دسر': '🍰',
  'پیش‌غذا': '🥗',
}

// --- Custom Marker Icons ---
function createVendorIcon(vendorType: string, isOpen: number, isHighlighted?: boolean): L.DivIcon {
  const color = TYPE_COLORS[vendorType] || '#6b7280'
  const emoji = TYPE_ICONS[vendorType] || '📍'
  const opacity = isOpen ? '1' : '0.5'
  const scale = isHighlighted ? 'scale(1.4)' : 'scale(1)'
  const zIndex = isHighlighted ? '1000' : '400'
  const border = isHighlighted ? '3px solid #facc15' : '2px solid white'

  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 36px; height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg) ${scale};
      display: flex; align-items: center; justify-content: center;
      box-shadow: ${isHighlighted ? '0 0 16px rgba(250,204,21,0.8), ' : ''}0 2px 8px rgba(0,0,0,0.3);
      opacity: ${opacity};
      border: ${border};
      z-index: ${zIndex};
      transition: transform 0.3s, border 0.3s;
    "><span style="transform: rotate(45deg); font-size: 16px;">${emoji}</span></div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

function createLocationIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      background: #3b82f6;
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 2px #3b82f6, 0 2px 10px rgba(0,0,0,0.3);
      animation: pulse-ring 2s infinite;
    "></div>
    <style>
      @keyframes pulse-ring {
        0% { box-shadow: 0 0 0 2px #3b82f6, 0 2px 10px rgba(0,0,0,0.3); }
        50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.3), 0 2px 10px rgba(0,0,0,0.3); }
        100% { box-shadow: 0 0 0 2px #3b82f6, 0 2px 10px rgba(0,0,0,0.3); }
      }
    </style>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function MapCenterController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const hasMovedRef = useRef(false)
  useEffect(() => {
    if (!hasMovedRef.current) { map.setView(center, zoom); hasMovedRef.current = true }
  }, [center, zoom, map])
  return null
}

// --- Format helpers ---
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} متر`
  return `${km.toFixed(1)} کیلومتر`
}

function formatPrice(price: number): string {
  if (price === 0) return 'رایگان'
  return `${price.toLocaleString('fa-IR')} تومان`
}

function formatPriceShort(price: number): string {
  if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`
  if (price >= 1000) return `${(price / 1000).toFixed(0)}K`
  return `${price}`
}

// ==================== MAIN PAGE ====================
export default function HomePage() {
  // --- Map State ---
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorTypes, setVendorTypes] = useState<VendorType[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedCity, setSelectedCity] = useState<string>('ALL')
  const [userLocation, setUserLocation] = useState<[number, number]>(DEFAULT_CENTER)
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [loading, setLoading] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [showList, setShowList] = useState(true)
  const [locating, setLocating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedVendorId, setHighlightedVendorId] = useState<string | null>(null)

  // --- Basket State ---
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [compareResults, setCompareResults] = useState<CompareResult[]>([])
  const [comparing, setComparing] = useState(false)
  const [basketOpen, setBasketOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'map' | 'compare'>('map')

  // Fetch vendor types and cities
  useEffect(() => {
    async function fetchMeta() {
      try {
        const [typesRes, citiesRes] = await Promise.all([
          fetch('/api/vendors?mode=types'),
          fetch('/api/vendors?mode=cities'),
        ])
        const typesData = await typesRes.json()
        const citiesData = await citiesRes.json()
        setVendorTypes(typesData.types || [])
        setCities(citiesData.cities || [])
      } catch (err) {
        console.error('Failed to fetch meta:', err)
      }
    }
    fetchMeta()
  }, [])

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        lat: userLocation[0].toString(),
        lng: userLocation[1].toString(),
        limit: '100',
      })
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory)
      if (selectedCity !== 'ALL') params.set('city', selectedCity)
      const res = await fetch(`/api/vendors?${params}`)
      const data = await res.json()
      setVendors(data || [])
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
    } finally {
      setLoading(false)
    }
  }, [userLocation, selectedCategory, selectedCity])

  useEffect(() => { fetchVendors() }, [fetchVendors])

  // Product search with debounce
  useEffect(() => {
    if (!productSearch || productSearch.length < 1) {
      setProductSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?mode=names&q=${encodeURIComponent(productSearch)}`)
        const data = await res.json()
        setProductSuggestions(data || [])
        setShowSuggestions(true)
      } catch { /* ignore */ }
    }, 250)
    return () => clearTimeout(timer)
  }, [productSearch])

  // Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude])
        setMapCenter([pos.coords.latitude, pos.coords.longitude])
        setMapZoom(14)
        setLocating(false)
      },
      () => { setLocating(false) },
      { timeout: 10000 }
    )
  }

  const handleMapClick = (lat: number, lng: number) => { setUserLocation([lat, lng]) }

  const filteredVendors = searchQuery
    ? vendors.filter(v => v.title.includes(searchQuery))
    : vendors

  // --- Basket Functions ---
  const addToBasket = (name: string) => {
    setBasket(prev => {
      const existing = prev.find(i => i.name === name)
      if (existing) return prev.map(i => i.name === name ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { name, quantity: 1 }]
    })
    setProductSearch('')
    setShowSuggestions(false)
  }

  const updateBasketQty = (name: string, delta: number) => {
    setBasket(prev => {
      const item = prev.find(i => i.name === name)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter(i => i.name !== name)
      return prev.map(i => i.name === name ? { ...i, quantity: newQty } : i)
    })
  }

  const removeFromBasket = (name: string) => {
    setBasket(prev => prev.filter(i => i.name !== name))
  }

  const runComparison = async () => {
    if (basket.length === 0) return
    setComparing(true)
    setActiveTab('compare')
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basket, lat: userLocation[0], lng: userLocation[1] }),
      })
      const data = await res.json()
      setCompareResults(data || [])
      if (data.length > 0) {
        setHighlightedVendorId(data[0].vendor_id)
        setMapCenter([data[0].vendor_lat, data[0].vendor_long])
        setMapZoom(13)
      }
    } catch (err) {
      console.error('Compare error:', err)
    } finally {
      setComparing(false)
    }
  }

  const basketTotal = basket.reduce((sum, i) => sum + i.quantity, 0)

  // Combine vendor markers and comparison result markers
  const compareVendorIds = new Set(compareResults.map(r => r.vendor_id))
  const displayVendors = activeTab === 'compare' && compareResults.length > 0
    ? vendors.filter(v => compareVendorIds.has(v.id))
    : vendors

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="bg-white border-b border-border px-3 py-2 z-[1000] relative shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 ml-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-base hidden sm:block">نقشه فروشندگان</h1>
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'map' | 'compare')} className="mx-1">
            <TabsList className="h-8">
              <TabsTrigger value="map" className="text-xs px-3">
                <MapPin className="w-3.5 h-3.5 ml-1" />
                نقشه
              </TabsTrigger>
              <TabsTrigger value="compare" className="text-xs px-3 relative">
                <ShoppingCart className="w-3.5 h-3.5 ml-1" />
                مقایسه قیمت
                {basketTotal > 0 && (
                  <Badge className="h-4 min-w-4 px-1 text-[10px] absolute -top-1.5 -left-1.5 bg-red-500 text-white">
                    {basketTotal}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Filters (only in map mode) */}
          {activeTab === 'map' && (
            <>
              <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 pb-0.5">
                <Button variant={selectedCategory === 'ALL' ? 'default' : 'outline'} size="sm" className="h-8 text-xs whitespace-nowrap shrink-0" onClick={() => setSelectedCategory('ALL')}>
                  همه
                </Button>
                {vendorTypes.map((type) => (
                  <Button key={type.value} variant={selectedCategory === type.value ? 'default' : 'outline'} size="sm" className="h-8 text-xs whitespace-nowrap shrink-0" onClick={() => setSelectedCategory(type.value)}
                    style={selectedCategory === type.value ? { backgroundColor: TYPE_COLORS[type.value], borderColor: TYPE_COLORS[type.value] } : {}}>
                    <span className="ml-1">{TYPE_ICONS[type.value]}</span>
                    {type.label}
                  </Button>
                ))}
              </div>

              <Separator orientation="vertical" className="h-6 hidden md:block" />

              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue placeholder="شهر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه شهرها</SelectItem>
                  {cities.map((city) => (<SelectItem key={city} value={city}>{city}</SelectItem>))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleLocateMe} disabled={locating}>
                <Navigation className="w-3.5 h-3.5 ml-1" />
                {locating ? '...' : 'مکان من'}
              </Button>
            </>
          )}

          {/* Basket Button (visible in map mode when basket has items) */}
          {activeTab === 'map' && basketTotal > 0 && (
            <Button size="sm" className="h-8 text-xs bg-red-500 hover:bg-red-600 text-white" onClick={() => setActiveTab('compare')}>
              <ShoppingCart className="w-3.5 h-3.5 ml-1" />
              سبد ({basketTotal})
            </Button>
          )}

          {/* Mobile List Toggle */}
          {activeTab === 'map' && (
            <Sheet>
              <SheetContent side="bottom" className="h-[60vh] rounded-t-xl">
                <SheetHeader className="pb-2">
                  <SheetTitle>فروشندگان نزدیک ({filteredVendors.length})</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100%-3rem)]">
                  <VendorList vendors={filteredVendors} loading={loading} onSelect={(v) => { setSelectedVendor(v); setMapCenter([v.lat, v.long]); setMapZoom(16) }} selectedId={selectedVendor?.id} />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ====== MAP VIEW ====== */}
        {activeTab === 'map' && (
          <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-1 relative">
              <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full z-0" zoomControl={false}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickHandler onMapClick={handleMapClick} />
                <MapCenterController center={mapCenter} zoom={mapZoom} />
                <Marker position={userLocation} icon={createLocationIcon()}>
                  <Popup><div className="text-sm font-medium text-center" dir="rtl">📍 موقعیت شما</div></Popup>
                </Marker>
                {filteredVendors.map((vendor) => (
                  <Marker key={vendor.id} position={[vendor.lat, vendor.long]} icon={createVendorIcon(vendor.vendor_type, vendor.is_open, highlightedVendorId === vendor.id)}
                    eventHandlers={{ click: () => setSelectedVendor(vendor) }}>
                    <Popup maxWidth={280} dir="rtl"><VendorPopup vendor={vendor} /></Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Search Box */}
              <div className="absolute top-3 right-3 z-[400] w-64">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" placeholder="جستجوی فروشنده..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pr-9 pl-8 text-sm bg-white border border-border rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>)}
                </div>
              </div>

              {/* Vendor Count */}
              <div className="absolute bottom-3 right-3 z-[400]">
                <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm shadow-md text-xs">
                  <MapPin className="w-3 h-3 ml-1" />{filteredVendors.length} فروشنده
                </Badge>
              </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className={`hidden md:flex flex-col w-96 border-r border-border bg-white transition-all duration-300 ${showList ? 'translate-x-0' : 'translate-x-full'} absolute md:relative left-0 top-0 h-full z-[500]`}>
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm">فروشندگان نزدیک <span className="text-muted-foreground font-normal mr-2">({filteredVendors.length})</span></h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1"><Navigation className="w-3 h-3 inline ml-1" />مرتب‌سازی بر اساس نزدیکی به موقعیت انتخاب شده</p>
              </div>
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="p-3 space-y-3">{[...Array(6)].map((_, i) => (<div key={i} className="flex gap-3"><Skeleton className="w-14 h-14 rounded-lg shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>))}</div>
                ) : (
                  <VendorList vendors={filteredVendors} onSelect={(v) => { setSelectedVendor(v); setMapCenter([v.lat, v.long]); setMapZoom(16) }} selectedId={selectedVendor?.id} />
                )}
              </ScrollArea>
            </aside>

            {/* Vendor Detail Panel */}
            {selectedVendor && <VendorDetailPanel vendor={selectedVendor} onClose={() => setSelectedVendor(null)} />}
          </div>
        )}

        {/* ====== COMPARE VIEW ====== */}
        {activeTab === 'compare' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Basket Builder - Left/Top Panel */}
            <div className="w-full lg:w-96 border-l border-border bg-white flex flex-col shrink-0 z-[500]">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-500" />
                  سبد مقایسه قیمت
                </h2>
                <p className="text-xs text-muted-foreground mt-1">محصولات اضافه کنید و بهترین قیمت رو پیدا کنید</p>
              </div>

              {/* Product Search */}
              <div className="p-3 border-b border-border relative">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" placeholder="جستجوی محصول (مثلاً: کباب، پیتزا، نوشابه...)" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} onFocus={() => productSuggestions.length > 0 && setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full h-10 pr-9 pl-3 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                </div>
                {/* Suggestions Dropdown */}
                {showSuggestions && productSuggestions.length > 0 && (
                  <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-border rounded-lg shadow-lg z-[600] max-h-60 overflow-y-auto">
                    {productSuggestions.map((p) => {
                      const inBasket = basket.find(b => b.name === p.name)
                      return (
                        <button key={p.name} className="w-full text-right px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-center justify-between border-b border-border last:border-0"
                          onClick={() => addToBasket(p.name)}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg">{CATEGORY_ICONS[p.category] || '📦'}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.count} فروشنده · {formatPrice(p.min_price)} - {formatPrice(p.max_price)}</p>
                            </div>
                          </div>
                          {inBasket ? (
                            <Badge variant="secondary" className="text-[10px] shrink-0">{inBasket.quantity} در سبد</Badge>
                          ) : (
                            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Basket Items */}
              <div className="flex-1 overflow-y-auto">
                {basket.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">سبد خرید خالی است</p>
                    <p className="text-xs mt-1">از کادر بالا محصول جستجو کنید</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {basket.map((item) => (
                      <div key={item.name} className="px-4 py-3 flex items-center gap-3">
                        <span className="text-lg">{CATEGORY_ICONS[productSuggestions.find(s => s.name === item.name)?.category || ''] || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateBasketQty(item.name, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateBasketQty(item.name, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <button onClick={() => removeFromBasket(item.name)} className="text-muted-foreground hover:text-destructive mr-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compare Button */}
              <div className="p-3 border-t border-border bg-muted/30">
                <Button className="w-full bg-red-500 hover:bg-red-600 text-white h-11" disabled={basket.length === 0 || comparing} onClick={runComparison}>
                  {comparing ? (
                    <><Skeleton className="w-4 h-4 rounded-full" /><span className="mr-2">در حال مقایسه...</span></>
                  ) : (
                    <><Zap className="w-4 h-4 ml-2" />مقایسه قیمت در {basket.length} محصول</>
                  )}
                </Button>
              </div>
            </div>

            {/* Results + Map */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Comparison Results */}
              <div className="w-full lg:w-[420px] border-l border-border bg-white flex flex-col shrink-0 order-2 lg:order-1">
                <div className="p-3 border-b border-border">
                  <h3 className="font-bold text-sm">
                    {compareResults.length > 0 ? `نتیجه مقایسه (${compareResults.length} فروشنده)` : 'نتایج مقایسه'}
                  </h3>
                </div>
                <ScrollArea className="flex-1">
                  {comparing ? (
                    <div className="p-4 space-y-3">
                      {[...Array(4)].map((_, i) => (<div key={i} className="p-3 border border-border rounded-lg"><Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></div>))}
                    </div>
                  ) : compareResults.length === 0 && basket.length > 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">دکمه «مقایسه قیمت» را بزنید</p>
                    </div>
                  ) : compareResults.length > 0 ? (
                    <CompareResultsList results={compareResults} onSelect={(r) => { setHighlightedVendorId(r.vendor_id); setMapCenter([r.vendor_lat, r.vendor_long]); setMapZoom(15) }} selectedId={highlightedVendorId} />
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">ابتدا محصولات را به سبد اضافه کنید</p>
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Map */}
              <div className="flex-1 relative order-1 lg:order-2 min-h-[300px]">
                <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full z-0" zoomControl={false}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClickHandler onMapClick={handleMapClick} />
                  <MapCenterController center={mapCenter} zoom={mapZoom} />
                  <Marker position={userLocation} icon={createLocationIcon()}>
                    <Popup><div className="text-sm font-medium text-center" dir="rtl">📍 موقعیت شما</div></Popup>
                  </Marker>
                  {compareResults.map((r, idx) => (
                    <Marker key={r.vendor_id} position={[r.vendor_lat, r.vendor_long]} icon={createVendorIcon(r.vendor_type, r.vendor_is_open, highlightedVendorId === r.vendor_id)}
                      eventHandlers={{ click: () => { setHighlightedVendorId(r.vendor_id); setMapCenter([r.vendor_lat, r.vendor_long]); setMapZoom(15) } }}>
                      <Popup maxWidth={300} dir="rtl">
                        <ComparePopup result={r} rank={idx + 1} />
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {/* Map Legend */}
                <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2 text-xs">
                  <p className="font-bold mb-1">🏆 رتبه‌بندی بر اساس:</p>
                  <p>1. تعداد محصولات موجود</p>
                  <p>2. کل مبلغ (غذا + ارسال)</p>
                  <p>3. فاصله تا شما</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== SUB-COMPONENTS ====================

function VendorList({ vendors, loading, onSelect, selectedId }: { vendors: Vendor[]; loading?: boolean; onSelect: (v: Vendor) => void; selectedId?: string }) {
  if (!loading && vendors.length === 0) {
    return (<div className="p-6 text-center text-muted-foreground"><Store className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">فروشنده‌ای یافت نشد</p></div>)
  }
  return (
    <div className="divide-y divide-border">
      {vendors.map((vendor) => (
        <button key={vendor.id} onClick={() => onSelect(vendor)} className={`w-full text-right p-3 hover:bg-accent/50 transition-colors ${selectedId === vendor.id ? 'bg-accent' : ''}`}>
          <div className="flex gap-3">
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
              {vendor.logo ? (<img src={vendor.logo} alt={vendor.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />) : (<div className="w-full h-full flex items-center justify-center text-xl">{TYPE_ICONS[vendor.vendor_type] || '🏪'}</div>)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{vendor.title}</h3>
                {vendor.is_open ? (<Badge variant="outline" className="text-[10px] h-4 px-1 text-green-600 border-green-200 bg-green-50 shrink-0">باز</Badge>) : (<Badge variant="outline" className="text-[10px] h-4 px-1 text-red-600 border-red-200 bg-red-50 shrink-0">بسته</Badge>)}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" />{vendor.rate_1_to_5?.toFixed(1) || '-'}<span className="text-[10px]">({vendor.comment_count})</span></span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{formatDistance(vendor.distance)}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{formatPrice(vendor.delivery_fee)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{vendor.delivery_time} دقیقه</span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function VendorPopup({ vendor }: { vendor: Vendor }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div className="flex gap-2 items-start">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
          {vendor.logo ? (<img src={vendor.logo} alt={vendor.title} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-lg">{TYPE_ICONS[vendor.vendor_type] || '🏪'}</div>)}
        </div>
        <div className="min-w-0"><p className="font-bold text-sm leading-tight">{vendor.title}</p><p className="text-xs text-gray-500">{vendor.city}</p></div>
      </div>
      <div className="flex gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" />{vendor.rate_1_to_5?.toFixed(1) || '-'}</span>
        <span>{formatDistance(vendor.distance)}</span><span>{vendor.delivery_time} دقیقه</span>
      </div>
      <p className="text-xs text-gray-500">ارسال: {formatPrice(vendor.delivery_fee)}</p>
    </div>
  )
}

function VendorDetailPanel({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const snappLink = `https://snappfood.ir/restaurant/${vendor.code}`
  return (
    <div className="absolute bottom-0 left-0 right-0 md:left-96 z-[600] md:relative md:z-auto md:border-r border-t border-border bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-none">
      <div className="flex justify-center pt-2 md:hidden"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 items-start flex-1 min-w-0">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
              {vendor.logo ? (<img src={vendor.logo} alt={vendor.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />) : (<div className="w-full h-full flex items-center justify-center text-2xl">{TYPE_ICONS[vendor.vendor_type] || '🏪'}</div>)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base truncate">{vendor.title}</h2>
                {vendor.is_open ? (<Badge className="text-[10px] h-5 bg-green-100 text-green-700 border-green-200">باز</Badge>) : (<Badge className="text-[10px] h-5 bg-red-100 text-red-700 border-red-200">بسته</Badge>)}
                {vendor.is_pro === 1 && (<Badge className="text-[10px] h-5 bg-purple-100 text-purple-700 border-purple-200">PRO</Badge>)}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{vendor.city}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" />, value: vendor.rate_1_to_5?.toFixed(1) || '-', sub: `(${vendor.comment_count?.toLocaleString('fa-IR')} نظر)` },
            { icon: <Clock className="w-4 h-4 text-blue-500" />, value: vendor.delivery_time, sub: 'دقیقه' },
            { icon: <Truck className="w-4 h-4 text-green-500" />, value: vendor.delivery_fee === 0 ? 'رایگان' : `${(vendor.delivery_fee / 1000).toFixed(0)}K`, sub: 'هزینه ارسال' },
            { icon: <MapPin className="w-4 h-4 text-red-500" />, value: formatDistance(vendor.distance), sub: 'فاصله' },
          ].map((s, i) => (
            <div key={i} className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1">{s.icon}<span className="font-bold text-sm">{s.value}</span></div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
        {(vendor.badges || vendor.coupon_info) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {vendor.badges && <Badge variant="secondary" className="text-xs">{vendor.badges}</Badge>}
            {vendor.coupon_info && <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">🎫 {vendor.coupon_info}</Badge>}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">حداقل سفارش: {formatPrice(vendor.minimum_order_value)}</p>
        <Button className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white" onClick={() => window.open(snappLink, '_blank')}>
          <ExternalLink className="w-4 h-4 ml-2" />مشاهده در اسنپ فود
        </Button>
      </div>
    </div>
  )
}

// --- Comparison Results List ---
function CompareResultsList({ results, onSelect, selectedId }: { results: CompareResult[]; onSelect: (r: CompareResult) => void; selectedId?: string | null }) {
  return (
    <div className="divide-y divide-border">
      {results.map((r, idx) => {
        const isBest = idx === 0
        const isFull = r.all_available
        return (
          <button key={r.vendor_id} onClick={() => onSelect(r)} className={`w-full text-right p-3 transition-colors ${selectedId === r.vendor_id ? 'bg-accent' : 'hover:bg-accent/50'} ${isBest ? 'bg-yellow-50/80 hover:bg-yellow-50' : ''}`}>
            {/* Rank Badge */}
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${isBest ? 'bg-yellow-400 text-yellow-900' : 'bg-muted text-muted-foreground'}`}>
                {isBest ? <Trophy className="w-4 h-4" /> : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm truncate">{r.vendor_title}</h3>
                  {isFull ? (
                    <Badge className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 border-green-200">
                      <Check className="w-2.5 h-2.5 ml-0.5" />همه موجود
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-200 bg-amber-50">
                      <AlertCircle className="w-2.5 h-2.5 ml-0.5" />{r.available_count} از {r.items.length}
                    </Badge>
                  )}
                  {r.vendor_is_open ? (<Badge variant="outline" className="text-[10px] h-4 px-1 text-green-600 border-green-200 bg-green-50">باز</Badge>) : (<Badge variant="outline" className="text-[10px] h-4 px-1 text-red-600 border-red-200 bg-red-50">بسته</Badge>)}
                </div>

                {/* Price Breakdown */}
                <div className="mt-2 space-y-1">
                  {r.items.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <span className={item.available ? '' : 'text-muted-foreground line-through'}>
                        {CATEGORY_ICONS[productCategory(item.name)] || '📦'} {item.name} × {item.requested_qty}
                      </span>
                      <span className={item.available ? 'font-medium' : 'text-muted-foreground'}>
                        {item.available ? formatPrice(item.subtotal) : 'موجود نیست'}
                      </span>
                    </div>
                  ))}
                  <Separator className="my-1.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>جمع غذا</span><span>{formatPrice(r.items_total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>هزینه ارسال</span><span>{formatPrice(r.delivery_fee)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>مبلغ کل</span>
                    <span className={isBest ? 'text-green-600' : ''}>{formatPrice(r.grand_total)}</span>
                  </div>
                </div>

                {/* Meta Row */}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-500 fill-amber-500" />{r.vendor_rate_1_to_5?.toFixed(1)}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{r.vendor_delivery_time} دقیقه</span>
                  <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{formatDistance(r.distance)}</span>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ComparePopup({ result, rank }: { result: CompareResult; rank: number }) {
  const isBest = rank === 1
  const snappLink = `https://snappfood.ir/restaurant/${result.vendor_code}`
  return (
    <div className="space-y-2 min-w-[220px]">
      <div className="flex items-center gap-2">
        {isBest && <Trophy className="w-5 h-5 text-yellow-500" />}
        <span className="font-bold text-sm">{result.vendor_title}</span>
      </div>
      <div className="space-y-0.5 text-xs">
        {result.items.map(item => (
          <div key={item.name} className="flex justify-between gap-4">
            <span className={item.available ? '' : 'line-through text-gray-400'}>{item.name}</span>
            <span>{item.available ? formatPrice(item.subtotal) : '-'}</span>
          </div>
        ))}
        <div className="border-t pt-1 mt-1 flex justify-between font-bold text-sm">
          <span>مبلغ کل:</span><span className="text-green-600">{formatPrice(result.grand_total)}</span>
        </div>
      </div>
      <a href={snappLink} target="_blank" rel="noopener noreferrer" className="block text-center text-xs bg-red-500 text-white rounded py-1.5 hover:bg-red-600">
        سفارش در اسنپ فود
      </a>
    </div>
  )
}

function productCategory(name: string): string {
  if (['کباب', 'چلو', 'قرمه', 'زرشک', 'باقالی', 'فسنجان', 'دیزی', 'قورمه'].some(k => name.includes(k))) return 'غذا'
  if (['برگر', 'ساندویچ', 'فلافل'].some(k => name.includes(k))) return 'ساندویچ'
  if (name.includes('پیتزا')) return 'پیتزا'
  if (['نوشابه', 'دوغ', 'آبمیوه', 'قهوه', 'کاپوچینو'].some(k => name.includes(k))) return 'نوشیدنی'
  if (['شیرینی', 'باقلوا', 'کیک'].some(k => name.includes(k))) return 'دسر'
  if (['سالاد', 'سوپ'].some(k => name.includes(k))) return 'پیش‌غذا'
  return ''
}