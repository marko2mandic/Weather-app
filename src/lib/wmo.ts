export type Kind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

/** WMO weather interpretation codes → a short label and a visual kind. */
export function describe(code: number): { label: string; kind: Kind } {
  if (code === 0) return { label: 'Clear sky', kind: 'clear' }
  if (code === 1) return { label: 'Mostly clear', kind: 'partly' }
  if (code === 2) return { label: 'Partly cloudy', kind: 'partly' }
  if (code === 3) return { label: 'Overcast', kind: 'cloudy' }
  if (code === 45 || code === 48) return { label: 'Foggy', kind: 'fog' }
  if (code >= 51 && code <= 57) return { label: 'Drizzle', kind: 'drizzle' }
  if (code === 61 || code === 80) return { label: 'Light rain', kind: 'rain' }
  if (code === 63 || code === 81) return { label: 'Rain', kind: 'rain' }
  if (code === 65 || code === 82) return { label: 'Heavy rain', kind: 'rain' }
  if (code === 66 || code === 67) return { label: 'Freezing rain', kind: 'rain' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', kind: 'snow' }
  if (code >= 95) return { label: 'Thunderstorm', kind: 'storm' }
  return { label: 'Cloudy', kind: 'cloudy' }
}

export const isWet = (k: Kind) => k === 'drizzle' || k === 'rain' || k === 'storm' || k === 'snow'
