import { useCallback, useEffect, useState } from 'react'

export const LANDMARKS = [
  { id: 'tvtower', name: 'Fernsehturm', area: 'Alexanderplatz', river: false },
  { id: 'gate', name: 'Brandenburger Tor', area: 'Pariser Platz', river: false },
  { id: 'reichstag', name: 'Reichstag', area: 'Spreebogen', river: true },
  { id: 'oberbaum', name: 'Oberbaumbrücke', area: 'Spree · Kreuzberg', river: true },
  { id: 'victory', name: 'Siegessäule', area: 'Tiergarten', river: false },
  { id: 'dom', name: 'Berliner Dom', area: 'Museumsinsel', river: true },
] as const

export type LandmarkId = (typeof LANDMARKS)[number]['id']

/** Generic backdrops in the same style for anywhere that isn't Berlin. */
export const GENERIC_SCENES = [
  { id: 'city', river: false },
  { id: 'town', river: false },
  { id: 'countryside', river: false },
  { id: 'mountains', river: false },
  { id: 'seaside', river: true },
] as const

export type GenericId = (typeof GENERIC_SCENES)[number]['id']
export type SceneId = LandmarkId | GenericId
export const ALL_SCENES: readonly { id: SceneId; river: boolean }[] = [...LANDMARKS, ...GENERIC_SCENES]

const ROTATE_MS = 45_000

/** Which Berlin landmark is on screen. Starts somewhere different each visit, then rotates. */
export function useLandmark() {
  const [index, setIndex] = useState(() => Math.floor(Date.now() / (20 * 60e3)) % LANDMARKS.length)
  const next = useCallback(() => setIndex((i) => (i + 1) % LANDMARKS.length), [])

  useEffect(() => {
    const id = setInterval(next, ROTATE_MS)
    return () => clearInterval(id)
  }, [next, index]) // restarting on index change means a manual tap gets a full 45 s too

  return { landmark: LANDMARKS[index], index, next }
}
