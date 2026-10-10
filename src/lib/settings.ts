import { useCallback, useEffect, useRef, useState } from 'react'
import type { HouseholdApi } from './household'

/**
 * Child + activity settings. Shared through the household when signed in, otherwise kept on this device.
 * We store the birth month rather than an age so the advice grows up with the child automatically.
 */
export interface Settings {
  birth: string // 'YYYY-MM'
  radiusKm: number
}

const KEY = 'settings-v1'
// Until the age is set in Settings, assume a 2-year-old (it's a toddler app)
function defaultBirth() {
  const d = new Date()
  d.setMonth(d.getMonth() - 24)
  return d.toISOString().slice(0, 7)
}
const DEFAULTS: Settings = { birth: defaultBirth(), radiusKm: 3 }

export function ageInMonths(birth: string, now = new Date()) {
  const [y, m] = birth.split('-').map(Number)
  if (!y || !m) return 21
  return Math.max(0, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m))
}

export function fmtAge(months: number) {
  if (months < 24) return `${months} month${months === 1 ? '' : 's'} old`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m ? `${y} years ${m} month${m === 1 ? '' : 's'} old` : `${y} years old`
}

export function useSettings(hh: HouseholdApi) {
  const [local, setLocal] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(local))
    } catch {
      /* ignore */
    }
  }, [local])

  const { household, updateSettings } = hh

  // A household created before these settings existed: seed it from this device, once per household.
  const seeded = useRef<string | null>(null)
  useEffect(() => {
    if (household && household.child_birth == null && seeded.current !== household.id) {
      seeded.current = household.id
      updateSettings({ child_birth: `${local.birth}-01`, places_radius_km: local.radiusKm })
    }
  }, [household, local, updateSettings])

  const settings: Settings =
    household && household.child_birth
      ? { birth: household.child_birth.slice(0, 7), radiusKm: household.places_radius_km }
      : local

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setLocal((s) => ({ ...s, ...patch }))
      if (household) {
        updateSettings({
          ...(patch.birth ? { child_birth: `${patch.birth}-01` } : {}),
          ...(patch.radiusKm != null ? { places_radius_km: patch.radiusKm } : {}),
        })
      }
    },
    [household, updateSettings],
  )

  return { settings, ageMonths: ageInMonths(settings.birth), update }
}
