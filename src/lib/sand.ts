import type { Hour } from './weather'

export type Wetness = 'dry' | 'damp' | 'wet'

export interface SurfaceState {
  state: Wetness
  water: number // model "mm" of surface water
  dryAt: number | null // when it's expected to be dry (ms), null if already dry or not within forecast
  lastRain: { time: number; mm: number } | null
}

interface SurfaceModel {
  cap: number // max water the surface holds
  drain: number // mm/h lost regardless of sun (soaking in / running off)
  evap: number // multiplier on ET0
  wet: number // threshold for "wet"
  damp: number // threshold for "damp"
}

// Sand holds a lot and dries slowly; slides/benches shed water and dry fast.
const SAND: SurfaceModel = { cap: 6, drain: 0.06, evap: 1.6, wet: 1.5, damp: 0.3 }
const SLIDE: SurfaceModel = { cap: 0.6, drain: 0.15, evap: 4, wet: 0.15, damp: 0.04 }

function simulate(hours: Hour[], model: SurfaceModel, factor: number, now: number): SurfaceState {
  let water = 0
  let lastRain: SurfaceState['lastRain'] = null
  let stateNow: number | null = null
  let dryAt: number | null = null

  for (const h of hours) {
    if (h.precip >= 0.1 && h.time <= now) lastRain = { time: h.time, mm: h.precip }
    water = Math.min(model.cap, water + h.precip)
    // Drying: evaporation (sun, wind, warmth are all in ET0) + a little extra for wind and sunshine.
    const sunBoost = 1 + h.sunshine / 3600
    const windBoost = 1 + Math.min(h.wind, 40) / 40
    const loss = (model.drain + h.et0 * model.evap * sunBoost * windBoost) * factor
    water = Math.max(0, water - loss)

    if (h.time <= now) stateNow = water
    else if (stateNow !== null && dryAt === null && stateNow >= model.damp && water < model.damp) dryAt = h.time
  }

  const w = stateNow ?? 0
  return {
    state: w >= model.wet ? 'wet' : w >= model.damp ? 'damp' : 'dry',
    water: w,
    dryAt: w >= model.damp ? dryAt : null,
    lastRain,
  }
}

export const sandState = (hours: Hour[], factor: number, now = Date.now()) => simulate(hours, SAND, factor, now)
export const slideState = (hours: Hour[], factor: number, now = Date.now()) => simulate(hours, SLIDE, factor, now)

/** Total rain in the last n hours. */
export function rainLast(hours: Hour[], n: number, now = Date.now()) {
  return hours.filter((h) => h.time <= now && h.time > now - n * 3600e3).reduce((a, h) => a + h.precip, 0)
}
