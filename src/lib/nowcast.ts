import type { Weather } from './weather'
import { fmtDuration, fmtHour } from './format'

const WET = 0.1 // mm per 15 min counts as "raining"

export interface Nowcast {
  raining: boolean
  headline: string
  detail: string
  /** next 2 h in 15-min slots, mm/h */
  bars: { time: number; rate: number }[]
}

function intensity(rate: number) {
  if (rate < 1) return 'Light rain'
  if (rate < 4) return 'Rain'
  return 'Heavy rain'
}

export function nowcast(w: Weather, now = Date.now()): Nowcast {
  const slots = w.minutely.filter((m) => m.time + 15 * 60e3 > now)
  const bars = slots.slice(0, 8).map((m) => ({ time: m.time, rate: m.precip * 4 }))
  const raining = (slots[0]?.precip ?? 0) >= WET || w.current.precip >= 0.1

  if (raining) {
    const stop = slots.findIndex((m) => m.precip < WET)
    const peak = Math.max(...slots.slice(0, 4).map((m) => m.precip * 4), w.current.precip)
    if (stop === -1)
      return { raining, bars, headline: `${intensity(peak)} for the next few hours`, detail: 'No dry gap in sight. Rain gear on.' }
    return {
      raining,
      bars,
      headline: `${intensity(peak)} · stops around ${fmtHour(slots[stop].time)}`,
      detail: `Dry in about ${fmtDuration(slots[stop].time - now)}`,
    }
  }

  const start = slots.findIndex((m) => m.precip >= WET)
  if (start !== -1) {
    const rate = slots[start].precip * 4
    return {
      raining,
      bars,
      headline: `${intensity(rate)} starts ~${fmtHour(slots[start].time)}`,
      detail: `Dry for ${fmtDuration(slots[start].time - now)}. Head out now or wait it out.`,
    }
  }

  // Nothing in the 6 h nowcast: look further with hourly data
  const next = w.hours.find((h) => h.time > now && h.precip >= 0.2 && h.prob >= 40)
  if (next && next.time - now < 24 * 3600e3) {
    const tomorrow = new Date(next.time).getDate() !== new Date(now).getDate()
    return {
      raining,
      bars,
      headline: 'Dry for the next 6 hours',
      detail: `Next rain likely ${tomorrow ? 'tomorrow ' : ''}around ${fmtHour(next.time)}`,
    }
  }
  return { raining, bars, headline: 'Dry all day', detail: 'No rain expected in the next 24 hours' }
}
