import type { Hour } from './weather'

export type Mode = 'stroller' | 'playing'

export interface Outfit {
  effective: number // °C the advice is based on
  summary: string
  layers: { slot: string; emoji: string; items: string[] }[]
  extras: string[]
  window: { feels: number; rain: boolean; wind: number; uv: number }
}

/** Layering advice for the hours of the outing, adjusted for the child's age. */
export function dress(hours: Hour[], mode: Mode, warmthOffset: number, ageMonths: number): Outfit {
  const feels = avg(hours.map((h) => h.feels))
  const wind = Math.max(...hours.map((h) => h.wind))
  const uv = Math.max(...hours.map((h) => (h.isDay ? h.uv : 0)))
  const rain = hours.some((h) => h.precip >= 0.2 || h.prob >= 50)

  // Babies lose heat faster (≈ one extra layer); bigger kids run around and warm up.
  const ageAdjust = ageMonths < 6 ? -3 : ageMonths < 12 ? -1.5 : ageMonths >= 36 && mode === 'playing' ? 1 : 0
  // Sitting still in a stroller ≈ 3 °C colder; personal offset from feedback on top.
  const effective = feels - (mode === 'stroller' ? 3 : 0) - warmthOffset + ageAdjust
  const baby = ageMonths < 24
  const body = baby ? 'body' : 'top'

  const base: string[] = []
  const mid: string[] = []
  const outer: string[] = []
  const head: string[] = []
  const hands: string[] = []
  const feet: string[] = []
  const extras: string[] = []
  let summary: string

  if (effective >= 24) {
    summary = 'Hot: one thin, loose layer'
    base.push(baby ? 'Short-sleeve body' : 'T-shirt', 'Light shorts or a thin dress')
    head.push('Wide-brim sun hat')
    feet.push(walkingAge(ageMonths) ? 'Sandals or barefoot shoes' : 'Bare feet or thin socks')
  } else if (effective >= 19) {
    summary = 'Warm: T-shirt weather'
    base.push('T-shirt', 'Light trousers or leggings')
    mid.push('Thin cardigan in the bag, for shade')
    feet.push('Light socks + sneakers')
  } else if (effective >= 14) {
    summary = 'Mild: two light layers'
    base.push('Long-sleeve top', 'Trousers')
    outer.push('Light jacket or hoodie')
    feet.push('Socks + sneakers')
  } else if (effective >= 9) {
    summary = 'Cool: three layers'
    base.push(`Long-sleeve ${body}`, 'Trousers')
    mid.push('Sweater or fleece')
    outer.push('Transitional jacket')
    head.push('Thin beanie')
    feet.push('Socks + closed shoes')
  } else if (effective >= 4) {
    summary = 'Cold: warm layers + hat'
    base.push(`Long-sleeve ${body}`, 'Leggings under trousers')
    mid.push('Fleece')
    outer.push('Padded jacket')
    head.push('Warm hat covering ears')
    hands.push(ageMonths < 36 ? 'Thin mittens' : 'Light gloves')
    feet.push('Warm socks + lined shoes')
  } else if (effective >= -1) {
    summary = 'Very cold: winter gear'
    base.push('Wool or merino base layer')
    mid.push('Fleece top + fleece trousers')
    outer.push('Winter jacket or one-piece overall')
    head.push('Warm hat', 'Snood or neck warmer')
    hands.push('Mittens')
    feet.push('Wool socks + winter boots')
  } else {
    summary = 'Freezing: full snowsuit'
    base.push('Merino base layer, top and bottom')
    mid.push('Fleece one-piece')
    outer.push('Snowsuit')
    head.push('Lined hat', 'Snood')
    hands.push('Waterproof mittens')
    feet.push('Wool socks + lined winter boots')
  }

  // Not walking yet: no shoes, just warm feet
  if (!walkingAge(ageMonths)) feet.splice(0, feet.length, effective < 9 ? 'Wool socks + padded booties' : effective < 19 ? 'Socks or soft booties' : 'Bare feet or thin socks')

  if (rain) {
    outer.unshift(effective >= 14 ? 'Rain jacket' : 'Rain jacket over the layers')
    outer.push(mode === 'playing' && walkingAge(ageMonths) ? 'Puddle pants / rain overall' : '')
    if (walkingAge(ageMonths)) feet.splice(0, feet.length, effective < 4 ? 'Warm rain boots' : 'Rain boots + socks')
    if (mode === 'stroller') extras.push('Stroller rain cover')
  }
  if (wind >= 25 && effective < 19) extras.push('Wind is strong: choose a windproof outer shell')
  if (mode === 'stroller' && effective < 10) extras.push('Footmuff or blanket in the stroller')
  if (uv >= 3) {
    if (ageMonths < 6) extras.push(`UV ${Math.round(uv)}: stay in the shade with a sun canopy (no sunscreen under 6 months)`)
    else extras.push(`UV ${Math.round(uv)}: sunscreen on face and hands`)
    if (!head.length) extras.push('Sun hat')
  }
  if (mode === 'playing' && walkingAge(ageMonths) && effective >= 9 && effective < 19)
    extras.push('Running around warms little ones up: pack the mid layer instead of wearing it')
  if (walkingAge(ageMonths)) extras.push('Spare clothes for the sandbox')

  const layers = [
    { slot: 'Base', emoji: '👕', items: base },
    { slot: 'Mid', emoji: '🧶', items: mid },
    { slot: 'Outer', emoji: '🧥', items: outer.filter(Boolean) },
    { slot: 'Head', emoji: '🧢', items: head },
    { slot: 'Hands', emoji: '🧤', items: hands },
    { slot: 'Feet', emoji: '👟', items: feet },
  ].filter((l) => l.items.length)

  return { effective, summary, layers, extras, window: { feels, rain, wind, uv } }
}

export const walkingAge = (ageMonths: number) => ageMonths >= 12

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
