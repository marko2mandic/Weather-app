import { useEffect, useState } from 'react'
import { bbox, cacheGet, cacheSet, compass, distanceM, overpass, type OsmElement } from './geo'

/** Real kid-friendly places nearby, from OpenStreetMap. */
export type PlaceCat =
  | 'playground'
  | 'park'
  | 'farm'
  | 'zoo'
  | 'outdoor_pool'
  | 'library'
  | 'museum'
  | 'indoor_play'
  | 'pool'
  | 'family'
  | 'puppet'

export interface KidPlace {
  id: string
  name: string
  cat: PlaceCat
  indoor: boolean
  lat: number
  lon: number
  dist: number // metres
  dir: string // compass direction from you
}

export const CAT: Record<PlaceCat, { emoji: string; label: string; indoor: boolean; minAge: number }> = {
  playground: { emoji: '🛝', label: 'Playground', indoor: false, minAge: 6 },
  park: { emoji: '🌳', label: 'Park', indoor: false, minAge: 0 },
  farm: { emoji: '🐐', label: 'Petting farm', indoor: false, minAge: 12 },
  zoo: { emoji: '🦒', label: 'Zoo', indoor: false, minAge: 12 },
  outdoor_pool: { emoji: '💦', label: 'Outdoor pool (summer)', indoor: false, minAge: 6 },
  library: { emoji: '📚', label: 'Library', indoor: true, minAge: 0 },
  museum: { emoji: '🦕', label: 'Museum', indoor: true, minAge: 18 },
  indoor_play: { emoji: '🧸', label: 'Indoor play', indoor: true, minAge: 9 },
  pool: { emoji: '🏊', label: 'Swimming', indoor: true, minAge: 4 },
  family: { emoji: '👨‍👩‍👧', label: 'Family centre', indoor: true, minAge: 0 },
  puppet: { emoji: '🎭', label: 'Puppet theatre', indoor: true, minAge: 24 },
}

// Libraries/museums worth taking a little one to (OSM has lots of research libraries and memorials).
const NOT_FOR_KIDS =
  /institut|universit|hochschule|campus|charité|medizin|patient|klinik|hospital|comic|theolog|wissenschaft|fakultät|fachbibliothek|zweigbibliothek|seminar|archiv|akademie|gedenk|memorial|stasi|mauer|wall|kriegs|war |gefängnis|prison|jüdisch|dokumentation/i
const ACADEMIC_LIBRARY = new Set(['academic', 'university', 'research', 'scientific', 'specialized', 'special', 'national'])
const OPEN_AIR_POOL = /sommerbad|freibad|kinderbad|strandbad|naturbad|open.?air|outdoor/i
const KID_MUSEUM = /kinder|child|natur|natural|technik|techn|science|spiel|toy|puppe|puppet|zoo|aquari|planetar|dino|labyrinth|explor|mitmach|eisenbahn|railway|verkehr|transport/i
const FAMILY = /famil|eltern|kinder|mütter|parent|child|kita/i

const PER_CAT: Record<PlaceCat, number> = {
  playground: 4,
  park: 3,
  farm: 2,
  zoo: 2,
  outdoor_pool: 2,
  library: 3,
  museum: 3,
  indoor_play: 3,
  pool: 2,
  family: 3,
  puppet: 2,
}

function classify(t: Record<string, string>): { cat: PlaceCat; name?: string } | null {
  const name = t.name
  if (t.leisure === 'playground') return { cat: t.indoor === 'yes' ? 'indoor_play' : 'playground', name }
  if (t.leisure === 'indoor_play') return { cat: 'indoor_play', name }
  if (t.zoo === 'petting_zoo' || (t.tourism === 'zoo' && /bauernhof|farm|streichel|kinder/i.test(name ?? ''))) return { cat: 'farm', name }
  if (t.tourism === 'zoo') return { cat: 'zoo', name }
  if (t.leisure === 'park') return { cat: 'park', name }
  if (t['theatre:genre'] === 'puppet') return { cat: 'puppet', name }
  if (t.leisure === 'sports_centre' || t.leisure === 'water_park' || t.leisure === 'swimming_pool')
    return { cat: OPEN_AIR_POOL.test(name ?? '') || t.covered === 'no' || t.indoor === 'no' ? 'outdoor_pool' : 'pool', name }
  if (t.amenity === 'toy_library') return name ? { cat: 'library', name } : null
  if (t.amenity === 'library') return name && !NOT_FOR_KIDS.test(name) && !ACADEMIC_LIBRARY.has(t.library ?? '') ? { cat: 'library', name } : null
  if (t.tourism === 'museum') return name && KID_MUSEUM.test(name) && !NOT_FOR_KIDS.test(name) ? { cat: 'museum', name } : null
  if (t.amenity === 'community_centre' || t.amenity === 'social_facility') return name && FAMILY.test(name) ? { cat: 'family', name } : null
  return null
}

async function fetchPlaces(lat: number, lon: number, radiusKm: number): Promise<KidPlace[]> {
  // Playgrounds & parks are everywhere in cities: look closer for them to keep the response small.
  const near = bbox(lat, lon, Math.min(radiusKm, 1.5))
  const mid = bbox(lat, lon, Math.min(radiusKm, 2.5))
  const far = bbox(lat, lon, radiusKm)
  const q = `[out:json][timeout:25];(
    nw["leisure"="playground"]${near};
    nw["leisure"="park"]["name"]${mid};
    nw["leisure"="indoor_play"]${far};
    nw["zoo"="petting_zoo"]${far};
    nw["tourism"="zoo"]${far};
    nw["amenity"="library"]${far};
    nw["amenity"="toy_library"]${far};
    nw["tourism"="museum"]${far};
    nw["theatre:genre"="puppet"]${far};
    nw["leisure"="sports_centre"]["sport"="swimming"]${far};
    nw["leisure"="swimming_pool"]["indoor"="yes"]["access"!="private"]${far};
    nw["leisure"="water_park"]${far};
    nw["amenity"="community_centre"]["name"]${far};
  );out center tags;`
  const els = await overpass(q)
  return pick(els, lat, lon, radiusKm)
}

function pick(els: OsmElement[], lat: number, lon: number, radiusKm: number): KidPlace[] {
  const seen = new Set<string>()
  const all: KidPlace[] = []
  for (const e of els) {
    const c = classify(e.tags ?? {})
    if (!c) continue
    const plat = e.lat ?? e.center?.lat
    const plon = e.lon ?? e.center?.lon
    if (plat == null || plon == null) continue
    const dist = distanceM(lat, lon, plat, plon)
    if (dist > radiusKm * 1000) continue
    if (!c.name && c.cat !== 'playground') continue
    const dedupe = `${c.cat}:${c.name ?? `${plat.toFixed(3)},${plon.toFixed(3)}`}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    all.push({
      id: `${e.type}/${e.id}`,
      name: c.name ?? CAT[c.cat].label,
      cat: c.cat,
      indoor: CAT[c.cat].indoor,
      lat: plat,
      lon: plon,
      dist,
      dir: compass(lat, lon, plat, plon),
    })
  }
  all.sort((a, b) => a.dist - b.dist)
  const counts: Partial<Record<PlaceCat, number>> = {}
  return all.filter((p) => {
    counts[p.cat] = (counts[p.cat] ?? 0) + 1
    return counts[p.cat]! <= PER_CAT[p.cat]
  })
}

export function usePlaces(lat: number | null, lon: number | null, radiusKm: number) {
  const [places, setPlaces] = useState<KidPlace[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (lat == null || lon == null) return
    const key = `places-v3-${lat.toFixed(3)}-${lon.toFixed(3)}-${radiusKm}`
    const cached = cacheGet<KidPlace[]>(key, 24 * 3600e3)
    if (cached) {
      setPlaces(cached)
      return
    }
    let cancelled = false
    setPlaces(null)
    setError(null)
    fetchPlaces(lat, lon, radiusKm)
      .then((p) => {
        if (cancelled) return
        cacheSet(key, p)
        setPlaces(p)
      })
      .catch(() => !cancelled && setError('Could not load nearby places right now'))
    return () => {
      cancelled = true
    }
  }, [lat, lon, radiusKm])

  return { places, error }
}

export const mapsLink = (p: KidPlace) => `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(5)},${p.lon.toFixed(5)}`

export const fmtDist = (m: number) => (m < 950 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toFixed(1)} km`)
