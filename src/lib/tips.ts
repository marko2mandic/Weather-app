import type { Day, Hour } from './weather'

/** Longest stretch of dry daylight hours (07–19) on a given day. */
export function bestWindow(hours: Hour[], day: Day, now = Date.now()) {
  const from = Math.max(day.time + 7 * 3600e3, now - 3600e3)
  const to = day.time + 19 * 3600e3
  const slice = hours.filter((h) => h.time >= from && h.time < to)
  let best: { start: number; end: number; feels: number } | null = null
  let runStart = -1
  const dry = (h: Hour) => h.precip < 0.1 && h.prob < 35
  for (let i = 0; i <= slice.length; i++) {
    if (i < slice.length && dry(slice[i])) {
      if (runStart === -1) runStart = i
      continue
    }
    if (runStart !== -1) {
      const run = slice.slice(runStart, i)
      const len = run.length
      const bestLen: number = best ?(best.end - best.start) / 3600e3 : 0
      const feels = Math.max(...run.map((h) => h.feels))
      if (len > bestLen || (len === bestLen && best && feels > best.feels))
        best = { start: run[0].time, end: run[len - 1].time + 3600e3, feels }
      runStart = -1
    }
  }
  return best
}
