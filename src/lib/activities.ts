import type { Hour, Weather } from './weather'
import type { SceneKind } from './place'
import { fmtHour } from './format'

export type Verdict = 'outdoors' | 'both' | 'indoors'

export interface DayPlan {
  verdict: Verdict
  when: 'today' | 'tomorrow'
  headline: string
  reason: string
  windows: { start: number; end: number }[] // good outdoor stretches
}

/** Comfortable feels-like range for being outside, by age. Babies get cold/hot sooner. */
function comfort(ageMonths: number) {
  if (ageMonths < 12) return { cold: 0, hot: 28 }
  if (ageMonths < 36) return { cold: -6, hot: 30 }
  return { cold: -8, hot: 32 }
}

type Problem = 'rain' | 'cold' | 'heat' | 'wind' | 'storm' | 'sun'

function problem(h: Hour, ageMonths: number): Problem | null {
  const { cold, hot } = comfort(ageMonths)
  const hour = new Date(h.time).getHours()
  if (h.code >= 95) return 'storm'
  if (h.precip >= 0.2 || h.prob >= 45) return 'rain'
  if (h.feels < cold) return 'cold'
  if (h.feels > hot) return 'heat'
  if (h.gusts >= 55) return 'wind'
  // Midday sun is too strong for little ones when UV is very high
  if (h.uv >= 7 && ageMonths < 36 && hour >= 11 && hour < 15) return 'sun'
  return null
}

const REASON: Record<Problem, string> = {
  rain: 'rain',
  cold: 'too cold for little ones',
  heat: 'too hot for little ones',
  wind: 'strong gusts',
  storm: 'thunderstorms',
  sun: 'very strong midday sun',
}

export function dayPlan(w: Weather, ageMonths: number, now = Date.now()): DayPlan {
  const today = w.days[0]
  const sunset = today?.sunset ?? now + 6 * 3600e3
  // After ~18:00 (or once it's dark) planning today is pointless: plan tomorrow instead.
  const late = new Date(now).getHours() >= 18 || now > sunset - 30 * 60e3
  const day = late ? w.days[1] ?? today : today
  const when = late ? 'tomorrow' : 'today'
  const dayStart = day ? day.time : now
  const from = Math.max(dayStart + 8 * 3600e3, late ? 0 : now - 3600e3)
  const to = Math.min(dayStart + 19 * 3600e3, (day?.sunset ?? sunset) + 30 * 60e3)
  const hours = w.hours.filter((h) => h.time >= from && h.time < to)

  if (!hours.length) return { verdict: 'indoors', when, headline: 'Cosy time inside', reason: 'It is getting dark', windows: [] }

  const problems = hours.map((h) => problem(h, ageMonths))
  const ok = problems.filter((p) => !p).length
  const share = ok / hours.length

  const windows: DayPlan['windows'] = []
  hours.forEach((h, i) => {
    if (problems[i]) return
    const last = windows[windows.length - 1]
    if (last && last.end === h.time) last.end = h.time + 3600e3
    else windows.push({ start: h.time, end: h.time + 3600e3 })
  })
  windows.sort((a, b) => b.end - b.start - (a.end - a.start))

  const counts = new Map<Problem, number>()
  problems.forEach((p) => p && counts.set(p, (counts.get(p) ?? 0) + 1))
  const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const best = windows[0]
  const span = (x: { start: number; end: number }) => `${fmtHour(x.start)}–${fmtHour(x.end)}`

  if (share >= 0.75)
    return {
      verdict: 'outdoors',
      when,
      headline: 'Outdoor day',
      reason: main ? `Mostly great outside. Watch for ${REASON[main]} later.` : 'Good weather all day. Get out and play!',
      windows: windows.slice(0, 2),
    }
  if (share >= 0.3 && best)
    return {
      verdict: 'both',
      when,
      headline: `Outside ${span(best)}, inside the rest`,
      reason: `${capital(REASON[main ?? 'rain'])} the rest of the day.`,
      windows: windows.slice(0, 2),
    }
  return {
    verdict: 'indoors',
    when,
    headline: 'Indoor day',
    reason: best && best.end - best.start >= 3600e3 ? `${capital(REASON[main ?? 'rain'])} most of the day. Short dry spell ${span(best)} for a quick walk.` : `${capital(REASON[main ?? 'rain'])} most of the day.`,
    windows: best ? [best] : [],
  }
}

const capital = (s: string) => s[0].toUpperCase() + s.slice(1)

export interface Idea {
  emoji: string
  text: string
}

type Band = 'baby' | 'young' | 'toddler' | 'preschool' | 'kid'
function band(m: number): Band {
  if (m < 12) return 'baby'
  if (m < 24) return 'young'
  if (m < 36) return 'toddler'
  if (m < 60) return 'preschool'
  return 'kid'
}

const OUTSIDE: Record<Band, Idea[]> = {
  baby: [
    { emoji: '🌳', text: 'Stroller walk under the trees. Leaves and light are fascinating at this age' },
    { emoji: '🧺', text: 'Blanket on the grass: tummy time with a view' },
    { emoji: '🎠', text: 'Baby swing (bucket seat) at the playground' },
    { emoji: '🦆', text: 'Watch ducks and dogs in the park' },
  ],
  young: [
    { emoji: '🏖️', text: 'Sandbox: bucket, spade and a little sieve' },
    { emoji: '🎠', text: 'Toddler swing and the small slide' },
    { emoji: '🍂', text: 'Collect leaves, sticks and stones in a little bag' },
    { emoji: '🛒', text: 'Push-along walk: their own stroller or a push toy' },
    { emoji: '🦆', text: 'Feed or watch the ducks' },
    { emoji: '🧗', text: 'Practise climbing steps and low ramps' },
  ],
  toddler: [
    { emoji: '🚲', text: 'Balance bike or ride-on loop around the block' },
    { emoji: '🖍️', text: 'Chalk drawing on the pavement' },
    { emoji: '🔎', text: 'Treasure hunt: find something red, round, soft…' },
    { emoji: '🧗', text: 'Low climbing frames and wobbly bridges' },
    { emoji: '⚽', text: 'Kick and chase a big soft ball' },
  ],
  preschool: [
    { emoji: '🛴', text: 'Scooter or balance bike adventure' },
    { emoji: '🙈', text: 'Hide and seek in the park' },
    { emoji: '🐞', text: 'Bug hunt with a magnifying glass' },
    { emoji: '🧗', text: 'Bigger climbing frames and slides' },
  ],
  kid: [
    { emoji: '🚴', text: 'Bike ride' },
    { emoji: '⚽', text: 'Ball games in the park' },
    { emoji: '🌲', text: 'Nature walk with a mission: spot five birds' },
  ],
}

const HOME: Record<Band, Idea[]> = {
  baby: [
    { emoji: '🪞', text: 'Tummy time in front of a mirror' },
    { emoji: '🧺', text: 'Treasure basket: wooden spoon, soft cloth, whisk' },
    { emoji: '📖', text: 'Board books with big pictures' },
    { emoji: '🫧', text: 'Bubbles and songs' },
  ],
  young: [
    { emoji: '🧱', text: 'Stacking cups and big blocks: build and knock down' },
    { emoji: '💧', text: 'Water play in the tub or sink with cups and a funnel' },
    { emoji: '🛋️', text: 'Pillow obstacle course on the floor' },
    { emoji: '💃', text: 'Dance party with favourite songs' },
    { emoji: '📦', text: 'Posting game: drop things through a box lid slot' },
    { emoji: '🍝', text: 'Sensory bin with dry pasta or oats (supervised)' },
  ],
  toddler: [
    { emoji: '🎨', text: 'Finger painting on big paper (or in the bath)' },
    { emoji: '⛺', text: 'Build a blanket fort and read in it' },
    { emoji: '🧩', text: 'Chunky puzzles' },
    { emoji: '🧁', text: 'Baking helper: pouring and stirring' },
    { emoji: '🍳', text: 'Pretend kitchen or tea party' },
  ],
  preschool: [
    { emoji: '✂️', text: 'Crafts: cutting, gluing, sticker collages' },
    { emoji: '🎲', text: 'First board games (colours, memory)' },
    { emoji: '🚀', text: 'Cardboard box rocket or car' },
    { emoji: '🗺️', text: 'Indoor treasure hunt with picture clues' },
  ],
  kid: [
    { emoji: '🧱', text: 'Lego building challenge' },
    { emoji: '📚', text: 'Make your own picture book' },
    { emoji: '🧪', text: 'Kitchen science: baking soda volcano' },
  ],
}

/** Ideas for outside and at home, picked for the child's age, today's weather, the season and the landscape. */
export function ideas(w: Weather, ageMonths: number, scene: SceneKind, now = new Date()) {
  const b = band(ageMonths)
  const month = now.getMonth() + 1
  const next = w.hours.filter((h) => h.time > now.getTime() - 3600e3).slice(0, 8)
  const rainedRecently = w.hours.filter((h) => h.time <= now.getTime() && h.time > now.getTime() - 12 * 3600e3).some((h) => h.precip >= 0.5)
  const feels = next.length ? next.reduce((a, h) => a + h.feels, 0) / next.length : 15
  const breezy = next.some((h) => h.wind >= 15 && h.wind < 35)
  // WMO 71–77 snow, 85–86 snow showers (80–82 are rain showers)
  const snowy = next.some((h) => (h.code >= 71 && h.code <= 77) || h.code === 85 || h.code === 86)
  const walking = ageMonths >= 13

  const special: Idea[] = []
  if (snowy) special.push({ emoji: '⛄', text: walking ? 'Snow play: little snowman, footprints, sledge ride' : 'Sledge or stroller ride through the snow' })
  if (rainedRecently && walking) special.push({ emoji: '🥾', text: 'Puddle jumping in rain boots' })
  if (feels >= 25) special.push({ emoji: '💦', text: 'Water play in the shade: splash pad, paddling pool or watering can' })
  if (breezy && ageMonths >= 9) special.push({ emoji: '🫧', text: 'Blow bubbles and watch the wind carry them' })
  if (month >= 9 && month <= 11) special.push({ emoji: '🌰', text: walking ? 'Collect chestnuts and jump in leaf piles' : 'Crunchy leaf walk: leaves to hear, hold and wave' })
  if (month >= 4 && month <= 6) special.push({ emoji: '🌼', text: 'Flower spotting and smelling' })
  if (scene === 'seaside') special.push({ emoji: '🐚', text: 'Beach walk: shells and sandcastles' })
  if (scene === 'countryside') special.push({ emoji: '🐄', text: 'Visit the animals at a nearby farm or field' })
  if (scene === 'mountains') special.push({ emoji: '⛰️', text: 'Short, flat trail with a carrier or all-terrain stroller' })

  const rotate = <T,>(xs: T[]) => {
    const day = Math.floor(now.getTime() / 86400e3)
    return xs.map((_, i) => xs[(i + day) % xs.length])
  }

  return {
    outside: [...special, ...rotate(OUTSIDE[b])].slice(0, 5),
    home: rotate(HOME[b]).slice(0, 4),
  }
}
