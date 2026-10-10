import { useEffect, useState } from 'react'
import { bbox, cacheGet, cacheSet, distanceM, overpass } from './geo'

/** What kind of backdrop fits where we are. Berlin gets its landmarks; elsewhere a generic scene. */
export type SceneKind = 'berlin' | 'city' | 'town' | 'countryside' | 'mountains' | 'seaside'

export interface PlaceInfo {
  kind: SceneKind
  name: string
  region: string
}

const BERLIN = { lat: 52.52, lon: 13.405 }
const BERLIN_RADIUS_M = 20_000
export const BERLIN_INFO: PlaceInfo = { kind: 'berlin', name: 'Berlin', region: 'Berlin' }
const DAY = 24 * 3600e3

export function usePlaceInfo(lat: number | null, lon: number | null, elevation: number | undefined) {
  const [info, setInfo] = useState<PlaceInfo | null>(null)

  useEffect(() => {
    if (lat == null || lon == null) return
    if (distanceM(lat, lon, BERLIN.lat, BERLIN.lon) < BERLIN_RADIUS_M) return setInfo(BERLIN_INFO)

    // Cache per ~2 km cell so moving around a town doesn't refetch
    const key = `place-${lat.toFixed(2)}-${lon.toFixed(2)}`
    const cached = cacheGet<Omit<PlaceInfo, 'kind'> & { settlement: string; coast: boolean }>(key, 7 * DAY)
    let cancelled = false

    const decide = (p: { name: string; region: string; settlement: string; coast: boolean }) => {
      let kind: SceneKind = p.settlement === 'city' ? 'city' : p.settlement === 'town' ? 'town' : 'countryside'
      if ((elevation ?? 0) > 700) kind = 'mountains'
      if (p.coast) kind = 'seaside'
      if (!cancelled) setInfo({ kind, name: p.name, region: p.region })
    }

    if (cached) {
      decide(cached)
    } else {
      lookup(lat, lon)
        .then((p) => {
          cacheSet(key, p)
          decide(p)
        })
        .catch(() => !cancelled && setInfo({ kind: (elevation ?? 0) > 700 ? 'mountains' : 'town', name: 'Here', region: '' }))
    }
    return () => {
      cancelled = true
    }
  }, [lat, lon, elevation])

  return info
}

async function lookup(lat: number, lon: number) {
  const [geo, coast] = await Promise.all([
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1&accept-language=en&lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`).then(
      (r) => r.json(),
    ),
    overpass(`[out:json][timeout:15];way["natural"="coastline"]${bbox(lat, lon, 3)};out ids 1;`)
      .then((els) => els.length > 0)
      .catch(() => false),
  ])
  const a = geo.address ?? {}
  const settlement = a.city ? 'city' : a.town ? 'town' : 'village'
  return {
    name: a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.county ?? 'Here',
    region: a.state ?? a.country ?? '',
    settlement,
    coast,
  }
}
