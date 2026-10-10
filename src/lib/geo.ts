/** Small geo helpers shared by the place lookups. */

export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function compass(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  return COMPASS[Math.round(deg / 45) % 8]
}

/** Overpass bbox string "(s,w,n,e)" for a radius around a point. */
export function bbox(lat: number, lon: number, km: number) {
  const dLat = km / 111
  const dLon = km / (111 * Math.cos((lat * Math.PI) / 180))
  return `(${(lat - dLat).toFixed(4)},${(lon - dLon).toFixed(4)},${(lat + dLat).toFixed(4)},${(lon + dLon).toFixed(4)})`
}

// Public Overpass instances; the main one is often overloaded, so fall back to a mirror.
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']

export interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export async function overpass(query: string): Promise<OsmElement[]> {
  let lastError: unknown
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }) })
      if (!res.ok) throw new Error(`Overpass ${res.status}`)
      const json = await res.json()
      return json.elements as OsmElement[]
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

/** Tiny localStorage cache with expiry; failures just mean no cache. */
export function cacheGet<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { at, value } = JSON.parse(raw)
    return Date.now() - at < maxAgeMs ? (value as T) : null
  } catch {
    return null
  }
}

export function cacheSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }))
  } catch {
    /* ignore */
  }
}
