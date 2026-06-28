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
  SheetTrigger,
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
  ChevronUp,
  ExternalLink,
  Search,
  Store,
} from 'lucide-react'

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

// --- Constants ---
const DEFAULT_CENTER: [number, number] = [35.6892, 51.389] // Tehran
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

// --- Custom Marker Icons ---
function createVendorIcon(vendorType: string, isOpen: number): L.DivIcon {
  const color = TYPE_COLORS[vendorType] || '#6b7280'
  const emoji = TYPE_ICONS[vendorType] || '📍'
  const opacity = isOpen ? '1' : '0.5'

  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 36px; height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      opacity: ${opacity};
      border: 2px solid white;
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

// --- Map Click Handler ---
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// --- Map Center Controller ---
function MapCenterController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const hasMovedRef = useRef(false)

  useEffect(() => {
    if (!hasMovedRef.current) {
      map.setView(center, zoom)
      hasMovedRef.current = true
    }
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

// --- Main Page ---
export default function HomePage() {
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
  const mapRef = useRef<L.Map | null>(null)

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

  // Fetch vendors when filters change
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

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  // Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('مکان‌یابی در مرورگر شما پشتیبانی نمی‌شود')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation([latitude, longitude])
        setMapCenter([latitude, longitude])
        setMapZoom(14)
        setLocating(false)
      },
      () => {
        setLocating(false)
        alert('امکان دسترسی به مکان شما وجود ندارد')
      },
      { timeout: 10000 }
    )
  }

  // Handle map click to set location
  const handleMapClick = (lat: number, lng: number) => {
    setUserLocation([lat, lng])
  }

  // Filter vendors by search
  const filteredVendors = searchQuery
    ? vendors.filter(v => v.title.includes(searchQuery))
    : vendors

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="bg-white border-b border-border px-3 py-2 z-[1000] relative shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Logo / Title */}
          <div className="flex items-center gap-2 ml-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-base hidden sm:block">نقشه فروشندگان</h1>
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 pb-0.5">
            <Button
              variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs whitespace-nowrap shrink-0"
              onClick={() => setSelectedCategory('ALL')}
            >
              همه
            </Button>
            {vendorTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedCategory === type.value ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs whitespace-nowrap shrink-0"
                onClick={() => setSelectedCategory(type.value)}
                style={
                  selectedCategory === type.value
                    ? { backgroundColor: TYPE_COLORS[type.value], borderColor: TYPE_COLORS[type.value] }
                    : {}
                }
              >
                <span className="ml-1">{TYPE_ICONS[type.value]}</span>
                {type.label}
              </Button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6 hidden md:block" />

          {/* City Filter */}
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="شهر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">همه شهرها</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Locate Me */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleLocateMe}
            disabled={locating}
          >
            <Navigation className="w-3.5 h-3.5 ml-1" />
            {locating ? 'در حال پیدا کردن...' : 'مکان من'}
          </Button>

          {/* List Toggle (mobile) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs md:hidden">
                <List className="w-3.5 h-3.5 ml-1" />
                لیست
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh] rounded-t-xl">
              <SheetHeader className="pb-2">
                <SheetTitle>فروشندگان نزدیک ({filteredVendors.length})</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100%-3rem)]">
                <VendorList
                  vendors={filteredVendors}
                  loading={loading}
                  onSelect={(v) => {
                    setSelectedVendor(v)
                    setMapCenter([v.lat, v.long])
                    setMapZoom(16)
                  }}
                  selectedId={selectedVendor?.id}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full z-0"
            zoomControl={false}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <MapCenterController center={mapCenter} zoom={mapZoom} />

            {/* User Location Marker */}
            <Marker position={userLocation} icon={createLocationIcon()}>
              <Popup>
                <div className="text-sm font-medium text-center" dir="rtl">
                  📍 موقعیت شما
                </div>
              </Popup>
            </Marker>

            {/* Vendor Markers */}
            {filteredVendors.map((vendor) => (
              <Marker
                key={vendor.id}
                position={[vendor.lat, vendor.long]}
                icon={createVendorIcon(vendor.vendor_type, vendor.is_open)}
                eventHandlers={{
                  click: () => setSelectedVendor(vendor),
                }}
              >
                <Popup maxWidth={280} dir="rtl">
                  <VendorPopup vendor={vendor} />
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Search Box on Map */}
          <div className="absolute top-3 right-3 z-[400] w-64">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="جستجوی فروشنده..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pr-9 pl-3 text-sm bg-white border border-border rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Stats Badge */}
          <div className="absolute bottom-3 right-3 z-[400]">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm shadow-md text-xs">
              <MapPin className="w-3 h-3 ml-1" />
              {filteredVendors.length} فروشنده
            </Badge>
          </div>

          {/* List Toggle Desktop */}
          <button
            onClick={() => setShowList(!showList)}
            className="absolute top-3 left-3 z-[400] bg-white border border-border rounded-lg p-2 shadow-md hover:bg-accent transition-colors md:hidden"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Sidebar - Vendor List */}
        <aside
          className={`hidden md:flex flex-col w-96 border-r border-border bg-white transition-all duration-300 ${
            showList ? 'translate-x-0' : 'translate-x-full'
          } absolute md:relative left-0 top-0 h-full z-[500]`}
        >
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm">
                فروشندگان نزدیک
                <span className="text-muted-foreground font-normal mr-2">
                  ({filteredVendors.length})
                </span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 md:hidden"
                onClick={() => setShowList(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {/* Distance info */}
            <p className="text-xs text-muted-foreground mt-1">
              <Navigation className="w-3 h-3 inline ml-1" />
              مرتب‌سازی بر اساس نزدیکی به موقعیت انتخاب شده
            </p>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-3 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <VendorList
                vendors={filteredVendors}
                onSelect={(v) => {
                  setSelectedVendor(v)
                  setMapCenter([v.lat, v.long])
                  setMapZoom(16)
                }}
                selectedId={selectedVendor?.id}
              />
            )}
          </ScrollArea>
        </aside>

        {/* Selected Vendor Detail Panel */}
        {selectedVendor && (
          <VendorDetailPanel
            vendor={selectedVendor}
            onClose={() => setSelectedVendor(null)}
          />
        )}
      </div>
    </div>
  )
}

// --- Vendor List Component ---
function VendorList({
  vendors,
  loading,
  onSelect,
  selectedId,
}: {
  vendors: Vendor[]
  loading?: boolean
  onSelect: (v: Vendor) => void
  selectedId?: string
}) {
  if (!loading && vendors.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Store className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">فروشنده‌ای یافت نشد</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {vendors.map((vendor) => (
        <button
          key={vendor.id}
          onClick={() => onSelect(vendor)}
          className={`w-full text-right p-3 hover:bg-accent/50 transition-colors ${
            selectedId === vendor.id ? 'bg-accent' : ''
          }`}
        >
          <div className="flex gap-3">
            {/* Logo */}
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
              {vendor.logo ? (
                <img
                  src={vendor.logo}
                  alt={vendor.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">
                  {TYPE_ICONS[vendor.vendor_type] || '🏪'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{vendor.title}</h3>
                {vendor.is_open ? (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-green-600 border-green-200 bg-green-50 shrink-0">
                    باز
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-red-600 border-red-200 bg-red-50 shrink-0">
                    بسته
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  {vendor.rate_1_to_5?.toFixed(1) || '-'}
                  <span className="text-[10px]">({vendor.comment_count})</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDistance(vendor.distance)}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {formatPrice(vendor.delivery_fee)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {vendor.delivery_time} دقیقه
                </span>
              </div>

              {vendor.is_pro === 1 && (
                <Badge className="text-[10px] h-4 px-1 mt-1 bg-purple-100 text-purple-700 border-purple-200">
                  PRO
                </Badge>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// --- Vendor Popup (on map marker click) ---
function VendorPopup({ vendor }: { vendor: Vendor }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div className="flex gap-2 items-start">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
          {vendor.logo ? (
            <img
              src={vendor.logo}
              alt={vendor.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">
              {TYPE_ICONS[vendor.vendor_type] || '🏪'}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight">{vendor.title}</p>
          <p className="text-xs text-gray-500">{vendor.city}</p>
        </div>
      </div>
      <div className="flex gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          {vendor.rate_1_to_5?.toFixed(1) || '-'}
        </span>
        <span>{formatDistance(vendor.distance)}</span>
        <span>{vendor.delivery_time} دقیقه</span>
      </div>
      <p className="text-xs text-gray-500">ارسال: {formatPrice(vendor.delivery_fee)}</p>
    </div>
  )
}

// --- Vendor Detail Panel ---
function VendorDetailPanel({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const snappLink = `https://snappfood.ir/restaurant/${vendor.code}`

  return (
    <div className="absolute bottom-0 left-0 right-0 md:left-96 z-[600] md:relative md:z-auto md:border-r md:border-t-0 md:border-b-0 border-t border-border bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-none">
      {/* Mobile drag handle */}
      <div className="flex justify-center pt-2 md:hidden">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 items-start flex-1 min-w-0">
            {/* Logo */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
              {vendor.logo ? (
                <img
                  src={vendor.logo}
                  alt={vendor.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  {TYPE_ICONS[vendor.vendor_type] || '🏪'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base truncate">{vendor.title}</h2>
                {vendor.is_open ? (
                  <Badge className="text-[10px] h-5 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                    باز
                  </Badge>
                ) : (
                  <Badge className="text-[10px] h-5 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                    بسته
                  </Badge>
                )}
                {vendor.is_pro === 1 && (
                  <Badge className="text-[10px] h-5 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
                    PRO
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{vendor.city}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-bold text-sm">{vendor.rate_1_to_5?.toFixed(1) || '-'}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ({vendor.comment_count?.toLocaleString('fa-IR')} نظر)
            </p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-sm">{vendor.delivery_time}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">دقیقه</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Truck className="w-4 h-4 text-green-500" />
              <span className="font-bold text-sm text-xs">
                {vendor.delivery_fee === 0 ? 'رایگان' : `${(vendor.delivery_fee / 1000).toFixed(0)}K`}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">هزینه ارسال</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4 text-red-500" />
              <span className="font-bold text-sm">{formatDistance(vendor.distance)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">فاصله</p>
          </div>
        </div>

        {/* Badges & Coupon */}
        {(vendor.badges || vendor.coupon_info) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {vendor.badges && (
              <Badge variant="secondary" className="text-xs">
                {vendor.badges}
              </Badge>
            )}
            {vendor.coupon_info && (
              <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                🎫 {vendor.coupon_info}
              </Badge>
            )}
          </div>
        )}

        {/* Minimum Order */}
        <p className="text-xs text-muted-foreground mt-3">
          حداقل سفارش: {formatPrice(vendor.minimum_order_value)}
        </p>

        {/* Action Button */}
        <Button
          className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white"
          onClick={() => window.open(snappLink, '_blank')}
        >
          <ExternalLink className="w-4 h-4 ml-2" />
          مشاهده در اسنپ فود
        </Button>
      </div>
    </div>
  )
}