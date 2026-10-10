import type { Weather } from './weather'
import { describe, type Kind } from './wmo'

export type Phase = 'night' | 'dawn' | 'day' | 'dusk'

/** Everything the animated background needs to know. */
export interface Scene {
  phase: Phase
  kind: Kind
  cloud: number // 0–100
  precip: number // mm/h
  wind: number // km/h
  /** 0→1 progress of the sun (day) or moon (night) across the sky */
  arc: number
}

const TWILIGHT = 45 * 60 * 1000

export function sceneFromWeather(w: Weather, now = Date.now()): Scene {
  const today = w.days[0]
  const tomorrow = w.days[1]
  const sunrise = today?.sunrise ?? now - 6 * 3600e3
  const sunset = today?.sunset ?? now + 6 * 3600e3

  let phase: Phase
  if (Math.abs(now - sunrise) < TWILIGHT) phase = 'dawn'
  else if (Math.abs(now - sunset) < TWILIGHT) phase = 'dusk'
  else if (now > sunrise && now < sunset) phase = 'day'
  else phase = 'night'

  let arc: number
  // Sun phases (incl. twilight just before sunrise / after sunset) keep the sun pinned to its horizon
  if (phase !== 'night') arc = (now - sunrise) / (sunset - sunrise)
  else if (now > sunset) {
    const nextRise = tomorrow?.sunrise ?? sunrise + 24 * 3600e3
    arc = (now - sunset) / (nextRise - sunset)
  } else {
    const prevSet = sunset - 24 * 3600e3
    arc = (now - prevSet) / (sunrise - prevSet)
  }

  // Rain rate: prefer the 15-min nowcast for the current slot, fall back to "current".
  const slot = w.minutely.find((m) => m.time <= now && now < m.time + 15 * 60e3)
  const precip = Math.max(w.current.precip, slot ? slot.precip * 4 : 0)

  return {
    phase,
    kind: describe(w.current.code).kind,
    cloud: w.current.cloud,
    precip,
    wind: w.current.wind,
    arc: Math.min(1, Math.max(0, arc)),
  }
}

export type SkyGroup = 'clear' | 'cloudy' | 'wet' | 'snow'

export function skyGroup(s: Scene): SkyGroup {
  if (s.kind === 'snow') return 'snow'
  if (s.kind === 'rain' || s.kind === 'storm' || s.kind === 'drizzle') return 'wet'
  if (s.kind === 'cloudy' || s.kind === 'fog' || s.cloud > 75) return 'cloudy'
  return 'clear'
}

/** Sky gradients: [top, middle, horizon]. Always in the purple family, like the reference. */
export const SKY: Record<Phase, Record<SkyGroup, [string, string, string]>> = {
  day: {
    clear: ['#4e2bc9', '#8f57e0', '#f6a9c9'],
    cloudy: ['#47388c', '#7564a6', '#b8a6d2'],
    wet: ['#2b2758', '#47426f', '#6f6a93'],
    snow: ['#6762a6', '#a39ccd', '#e4ddf3'],
  },
  dawn: {
    clear: ['#33208a', '#a0479f', '#ffa47c'],
    cloudy: ['#372a72', '#7a5890', '#d29c9e'],
    wet: ['#272354', '#4b406e', '#856c86'],
    snow: ['#47428a', '#8e7eb2', '#e3bdcc'],
  },
  dusk: {
    clear: ['#2a1570', '#9a3d8c', '#ff8a5c'],
    cloudy: ['#30236a', '#7a4f86', '#c98a8c'],
    wet: ['#221e4c', '#463a66', '#7c6178'],
    snow: ['#3e3a80', '#8676aa', '#d9adbf'],
  },
  night: {
    clear: ['#0a0624', '#1b104e', '#3d2479'],
    cloudy: ['#110c2c', '#231a48', '#3a2f60'],
    wet: ['#0c0a20', '#1a1736', '#2b274d'],
    snow: ['#181540', '#2a265c', '#4a4580'],
  },
}

/**
 * Landmark colours per time of day × weather.
 * far = hazy city behind, mid = the landmark, near = ground/trees,
 * accent = sun- or moonlit edge, water = the Spree.
 */
export interface LandColors {
  far: string
  mid: string
  near: string
  accent: string
  water: string
}

const L = (far: string, mid: string, near: string, accent: string, water: string): LandColors => ({ far, mid, near, accent, water })

export const LAND: Record<Phase, Record<SkyGroup, LandColors>> = {
  day: {
    clear: L('#8a6cc8', '#5a36a6', '#2f1a6e', '#ffc9a3', '#7f9cf5'),
    cloudy: L('#7e70b0', '#554896', '#2e2466', '#cfc2ea', '#6f78b4'),
    wet: L('#5e5a88', '#3e3a6c', '#221f48', '#9590bc', '#4a5384'),
    snow: L('#a49cd0', '#6e64a8', '#3a3272', '#ffffff', '#8d9cd2'),
  },
  dawn: {
    clear: L('#a0609e', '#5e2c78', '#2e1252', '#ffb08a', '#d084ac'),
    cloudy: L('#8a6494', '#553870', '#2c1a50', '#e3aaa9', '#8e6c9c'),
    wet: L('#6a5680', '#43355f', '#241a40', '#9c88aa', '#5c527a'),
    snow: L('#a68cb4', '#6a5490', '#362a60', '#ffe6ee', '#9c8cba'),
  },
  dusk: {
    clear: L('#9a4c8c', '#5a2268', '#2a0e48', '#ff8f66', '#d6748e'),
    cloudy: L('#84588a', '#523066', '#2a1646', '#e29292', '#8c608a'),
    wet: L('#64507a', '#403258', '#22183c', '#a2829c', '#594c72'),
    snow: L('#9c84ac', '#64508a', '#34285a', '#ffd8e0', '#9686b2'),
  },
  night: {
    clear: L('#2c205e', '#1b1244', '#0d0728', '#5a48a8', '#261c5e'),
    cloudy: L('#2a2350', '#1a1538', '#0d0a22', '#433a7c', '#201c4a'),
    wet: L('#221e44', '#151232', '#0a081c', '#3a3668', '#1c1a42'),
    snow: L('#3c3670', '#262250', '#14112e', '#cbc6f2', '#2c2a62'),
  },
}
