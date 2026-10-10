import { useEffect, useState } from 'react'

export interface Hour {
  time: number // ms epoch
  temp: number
  feels: number
  precip: number // mm in the hour
  prob: number // %
  code: number // WMO weather code
  wind: number // km/h
  gusts: number
  windDir: number
  uv: number
  humidity: number
  cloud: number // %
  sunshine: number // seconds of sun in the hour
  et0: number // mm reference evapotranspiration
  isDay: boolean
}

export interface Day {
  time: number
  code: number
  tmax: number
  tmin: number
  precipSum: number
  probMax: number
  sunrise: number
  sunset: number
  uvMax: number
  windMax: number
}

export interface Current {
  time: number
  temp: number
  feels: number
  precip: number
  code: number
  cloud: number
  wind: number
  windDir: number
  humidity: number
  isDay: boolean
}

export interface Weather {
  current: Current
  hours: Hour[] // includes past 2 days (for the sand model) + 4 days ahead
  minutely: { time: number; precip: number }[] // 15-min steps, next 6 h
  days: Day[] // today onwards
  elevation?: number // m above sea level (absent in caches from older versions)
  fetchedAt: number
}

const HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'precipitation_probability',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'uv_index',
  'relative_humidity_2m',
  'cloud_cover',
  'sunshine_duration',
  'et0_fao_evapotranspiration',
  'is_day',
]
const DAILY = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'sunrise',
  'sunset',
  'uv_index_max',
  'wind_speed_10m_max',
]
const CURRENT = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
  'relative_humidity_2m',
  'is_day',
]

export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: HOURLY.join(','),
    daily: DAILY.join(','),
    current: CURRENT.join(','),
    minutely_15: 'precipitation',
    forecast_minutely_15: '24',
    past_days: '2',
    forecast_days: '4',
    timezone: 'auto',
    timeformat: 'unixtime',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`)
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const j = await res.json()

  const h = j.hourly
  const hours: Hour[] = h.time.map((t: number, i: number) => ({
    time: t * 1000,
    temp: h.temperature_2m[i],
    feels: h.apparent_temperature[i],
    precip: h.precipitation[i] ?? 0,
    prob: h.precipitation_probability[i] ?? 0,
    code: h.weather_code[i],
    wind: h.wind_speed_10m[i],
    gusts: h.wind_gusts_10m[i],
    windDir: h.wind_direction_10m[i],
    uv: h.uv_index[i] ?? 0,
    humidity: h.relative_humidity_2m[i],
    cloud: h.cloud_cover[i],
    sunshine: h.sunshine_duration[i] ?? 0,
    et0: h.et0_fao_evapotranspiration[i] ?? 0,
    isDay: h.is_day[i] === 1,
  }))

  const d = j.daily
  const days: Day[] = d.time
    .map((t: number, i: number) => ({
      time: t * 1000,
      code: d.weather_code[i],
      tmax: d.temperature_2m_max[i],
      tmin: d.temperature_2m_min[i],
      precipSum: d.precipitation_sum[i] ?? 0,
      probMax: d.precipitation_probability_max[i] ?? 0,
      sunrise: d.sunrise[i] * 1000,
      sunset: d.sunset[i] * 1000,
      uvMax: d.uv_index_max[i] ?? 0,
      windMax: d.wind_speed_10m_max[i],
    }))
    .filter((day: Day) => day.time >= startOfDay(Date.now()))

  const m = j.minutely_15
  const minutely = m.time.map((t: number, i: number) => ({ time: t * 1000, precip: m.precipitation[i] ?? 0 }))

  const c = j.current
  const current: Current = {
    time: c.time * 1000,
    temp: c.temperature_2m,
    feels: c.apparent_temperature,
    precip: c.precipitation ?? 0,
    code: c.weather_code,
    cloud: c.cloud_cover,
    wind: c.wind_speed_10m,
    windDir: c.wind_direction_10m,
    humidity: c.relative_humidity_2m,
    isDay: c.is_day === 1,
  }

  return { current, hours, minutely, days, elevation: j.elevation, fetchedAt: Date.now() }
}

/** Hourly precipitation (mm) on a grid around a point, for the forecast map overlay. */
export interface GridForecast {
  points: { lat: number; lon: number }[]
  times: number[]
  precip: number[][] // [point][hour]
  step: { lat: number; lon: number }
}

export async function fetchGrid(lat: number, lon: number, size = 7, spanKm = 9): Promise<GridForecast> {
  const dLat = spanKm / 111 / (size - 1)
  const dLon = spanKm / (111 * Math.cos((lat * Math.PI) / 180)) / (size - 1)
  const points: { lat: number; lon: number }[] = []
  const half = (size - 1) / 2
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) points.push({ lat: lat + (r - half) * dLat, lon: lon + (c - half) * dLon })

  const q = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(4)).join(','),
    longitude: points.map((p) => p.lon.toFixed(4)).join(','),
    hourly: 'precipitation',
    forecast_hours: '13',
    timeformat: 'unixtime',
    timezone: 'auto',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`)
  if (!res.ok) throw new Error(`Open-Meteo grid ${res.status}`)
  const arr = await res.json()
  const list = Array.isArray(arr) ? arr : [arr]
  return {
    points,
    times: list[0].hourly.time.map((t: number) => t * 1000),
    precip: list.map((x: { hourly: { precipitation: number[] } }) => x.hourly.precipitation.map((v) => v ?? 0)),
    step: { lat: dLat, lon: dLon },
  }
}

export function startOfDay(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const CACHE_KEY = 'weather-cache-v1'
const REFRESH_MS = 10 * 60 * 1000

export function useWeather(lat: number | null, lon: number | null) {
  const [weather, setWeather] = useState<Weather | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      return raw ? (JSON.parse(raw) as Weather) : null
    } catch {
      return null
    }
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lat == null || lon == null) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const w = await fetchWeather(lat, lon)
        if (cancelled) return
        setWeather(w)
        setError(null)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(w))
        } catch {
          /* storage full or blocked: fine, we just don't cache */
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load weather')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [lat, lon])

  return { weather, error, loading }
}

/** Hours from the current hour forward. */
export function upcomingHours(w: Weather, count: number) {
  const now = Date.now() - 60 * 60 * 1000
  return w.hours.filter((h) => h.time > now).slice(0, count)
}
