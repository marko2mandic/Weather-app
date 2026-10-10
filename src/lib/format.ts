export const fmtHour = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export const fmtDay = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { weekday: 'long' })

export const fmtShortDay = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { weekday: 'short' })

export const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export const round = (n: number) => Math.round(n)

export function fmtDuration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function fmtAgo(ms: number) {
  const h = (Date.now() - ms) / 3600e3
  if (h < 1) return 'less than an hour ago'
  if (h < 1.5) return 'about an hour ago'
  if (h < 24) return `${Math.round(h)} hours ago`
  return `${Math.round(h / 24)} day${h >= 36 ? 's' : ''} ago`
}
