import { useCallback, useEffect, useMemo, useState } from 'react'
import type { HouseholdApi } from './household'

/**
 * Personal comfort tuning.
 * Signed in with a household → the shared row in Supabase is the source of truth (both parents train it).
 * Otherwise → stored on this device, and used to seed the household when one is created.
 *
 * warmthOffset (°C): positive = the child needs warmer clothes than the standard guide.
 * sandFactor: multiplier on the sand drying speed (1 = model default).
 */
export interface Tuning {
  warmthOffset: number
  sandFactor: number
  history: FeedbackEntry[]
  shared: boolean
}

export interface FeedbackEntry {
  at: number
  kind: 'dress' | 'sand' | 'tip'
  value: string
  context?: Record<string, number | string>
  by?: string
}

type Numbers = Pick<Tuning, 'warmthOffset' | 'sandFactor'>

const KEY = 'tuning-v1'
const DEFAULT = { warmthOffset: 0, sandFactor: 1, history: [] as FeedbackEntry[] }
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The learning rule. Mirrored in SQL by public.apply_feedback(); keep the two in sync. */
export function nextTuning(t: Numbers, kind: FeedbackEntry['kind'], value: string): Numbers {
  let { warmthOffset, sandFactor } = t
  if (kind === 'dress') {
    // Each "too cold" nudges toward dressing ~1 °C warmer
    if (value === 'too-cold') warmthOffset = clamp(warmthOffset + 1, -5, 5)
    if (value === 'too-warm') warmthOffset = clamp(warmthOffset - 1, -5, 5)
  }
  if (kind === 'sand') {
    // Predicted dry but it was wet → sand dries slower than we think, and vice versa
    if (value === 'wetter') sandFactor = clamp(sandFactor * 0.8, 0.3, 3)
    if (value === 'drier') sandFactor = clamp(sandFactor * 1.25, 0.3, 3)
  }
  return { warmthOffset, sandFactor }
}

export function useTuning(hh: HouseholdApi) {
  const [local, setLocal] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
    } catch {
      return DEFAULT
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(local))
    } catch {
      /* ignore */
    }
  }, [local])

  const { household, members, feedback, applyFeedback } = hh

  const tuning: Tuning = useMemo(() => {
    if (!household) return { ...local, shared: false }
    const who = new Map(members.map((m) => [m.user_id, m.email.split('@')[0]]))
    return {
      warmthOffset: household.warmth_offset,
      sandFactor: household.sand_factor,
      shared: true,
      history: feedback.map((f) => ({
        at: Date.parse(f.created_at),
        kind: f.kind,
        value: f.value,
        context: f.context,
        by: (f.user_id && who.get(f.user_id)) || undefined,
      })),
    }
  }, [household, members, feedback, local])

  const giveFeedback = useCallback(
    (entry: Omit<FeedbackEntry, 'at'>) => {
      if (household) {
        const n = nextTuning({ warmthOffset: household.warmth_offset, sandFactor: household.sand_factor }, entry.kind, entry.value)
        applyFeedback(entry.kind, entry.value, entry.context ?? {}, { warmth_offset: n.warmthOffset, sand_factor: n.sandFactor })
        return
      }
      setLocal((t: typeof DEFAULT) => ({
        ...nextTuning(t, entry.kind, entry.value),
        history: [{ ...entry, at: Date.now() }, ...t.history].slice(0, 200),
      }))
    },
    [household, applyFeedback],
  )

  return { tuning, giveFeedback, localTuning: local as Numbers }
}
