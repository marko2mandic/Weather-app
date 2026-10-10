import { useCallback, useEffect, useState } from 'react'

export type LocMode = 'home' | 'gps'

export interface Place {
  lat: number
  lon: number
  name: string
  sub: string
}

/** Home is set by each person on their own phone (Settings → Home), never baked into the app. */
export interface Home {
  lat: number
  lon: number
  label: string // short, e.g. "Main Street · Old Town"
}

const MODE_KEY = 'loc-mode'
const HOME_KEY = 'home-v1'

function readHome(): Home | null {
  try {
    const raw = localStorage.getItem(HOME_KEY)
    return raw ? (JSON.parse(raw) as Home) : null
  } catch {
    return null
  }
}

export function useLocation() {
  const [home, setHomeState] = useState<Home | null>(readHome)
  const [mode, setModeState] = useState<LocMode>(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY) as LocMode | null
      return saved === 'home' && readHome() ? 'home' : 'gps'
    } catch {
      return 'gps'
    }
  })
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const setMode = useCallback((m: LocMode) => {
    setModeState(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      /* ignore */
    }
  }, [])

  const setHome = useCallback(
    (h: Home | null) => {
      setHomeState(h)
      try {
        if (h) localStorage.setItem(HOME_KEY, JSON.stringify(h))
        else localStorage.removeItem(HOME_KEY)
      } catch {
        /* ignore */
      }
      setMode(h ? 'home' : 'gps')
    },
    [setMode],
  )

  useEffect(() => {
    if (mode !== 'gps') {
      setGpsError(null) // a GPS problem is irrelevant while showing Home
      return
    }
    if (!('geolocation' in navigator)) {
      setGpsError('Location is not available on this device')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGpsError(null)
        // round to ~100 m so tiny GPS jitter doesn't refetch the forecast
        setGps((prev) => {
          const next = { lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }
          return prev && prev.lat === next.lat && prev.lon === next.lon ? prev : next
        })
      },
      (e) => setGpsError(e.code === e.PERMISSION_DENIED ? 'Location permission denied' : 'Could not get your location'),
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [mode])

  const place: Place | null =
    mode === 'home' && home
      ? { lat: home.lat, lon: home.lon, name: 'Home', sub: home.label }
      : gps
        ? { ...gps, name: 'Here', sub: 'Current location' }
        : null

  /** One-off GPS fix, used by "Set home to where I am". */
  const locateOnce = useCallback(
    () =>
      new Promise<{ lat: number; lon: number }>((resolve, reject) => {
        if (!('geolocation' in navigator)) return reject(new Error('Location is not available on this device'))
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: +p.coords.latitude.toFixed(4), lon: +p.coords.longitude.toFixed(4) }),
          (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'Location permission denied' : 'Could not get your location')),
          { enableHighAccuracy: true, timeout: 15000 },
        )
      }),
    [],
  )

  return { mode, setMode, place, gpsError, home, setHome, locateOnce }
}

/** Address search for setting Home (OpenStreetMap Nominatim). */
export async function searchAddress(q: string): Promise<Home[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=en&q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Address search failed')
  const list = (await res.json()) as { lat: string; lon: string; display_name: string; address?: Record<string, string> }[]
  return list.map((r) => ({ lat: +(+r.lat).toFixed(4), lon: +(+r.lon).toFixed(4), label: shortLabel(r.address, r.display_name) }))
}

/** Reverse lookup for "use my current location" so Home gets a readable label. */
export async function labelFor(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=en&lat=${lat}&lon=${lon}`)
    const r = await res.json()
    return shortLabel(r.address, r.display_name)
  } catch {
    return 'My home'
  }
}

function shortLabel(a: Record<string, string> | undefined, fallback: string) {
  if (!a) return fallback.split(',').slice(0, 2).join(',')
  const street = a.road ?? a.pedestrian ?? a.square ?? a.neighbourhood
  const area = a.suburb ?? a.city_district ?? a.town ?? a.village ?? a.city
  return [street, area].filter(Boolean).join(' · ') || fallback.split(',').slice(0, 2).join(',')
}
