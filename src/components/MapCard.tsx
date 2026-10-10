import { useEffect, useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Rectangle, TileLayer, WMSTileLayer, useMap } from 'react-leaflet'
import { fetchGrid, type GridForecast } from '../lib/weather'
import { fmtHour } from '../lib/format'

type Layer = 'radar' | 'satellite' | 'forecast'

const ZOOM: Record<Layer, number> = { radar: 11, satellite: 7, forecast: 12 }
// Radar: past hour + DWD's 2 h nowcast, in 15-min steps
const RADAR_STEPS = Array.from({ length: 13 }, (_, i) => -60 + i * 15)

function radarBase() {
  // DWD publishes every 5 min with a small delay; anchor "now" on the latest safe frame
  const t = Date.now() - 10 * 60e3
  return Math.floor(t / (5 * 60e3)) * 5 * 60e3
}

function satTime() {
  // Meteosat scans every 10 min and appears ~20 min later
  const t = Date.now() - 30 * 60e3
  return new Date(Math.floor(t / (10 * 60e3)) * 10 * 60e3).toISOString()
}

function ZoomTo({ layer, center }: { layer: Layer; center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    // animated zoom across many levels is silently dropped by Leaflet, so jump instead
    map.setView(center, ZOOM[layer], { animate: false })  }, [layer, center, map])
  return null
}

function rainColor(mm: number) {
  if (mm < 0.1) return null
  if (mm < 0.5) return '#9cc8ff'
  if (mm < 2) return '#4f86ff'
  if (mm < 5) return '#7a4dff'
  return '#e04ad8'
}

export default function MapCard({ lat, lon }: { lat: number; lon: number }) {
  const [layer, setLayer] = useState<Layer>('radar')
  const [step, setStep] = useState(4) // index of "now" in RADAR_STEPS
  const [hour, setHour] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [grid, setGrid] = useState<GridForecast | null>(null)
  const center = useMemo<[number, number]>(() => [lat, lon], [lat, lon])
  const base = useMemo(radarBase, [layer, lat, lon])

  useEffect(() => {
    if (layer !== 'forecast') return
    let cancelled = false
    fetchGrid(lat, lon)
      .then((g) => !cancelled && setGrid(g))
      .catch(() => !cancelled && setGrid(null))
    return () => {
      cancelled = true
    }
  }, [layer, lat, lon])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      if (layer === 'radar') setStep((s) => (s + 1) % RADAR_STEPS.length)
      if (layer === 'forecast') setHour((h) => (h + 1) % 13)
    }, 900)
    return () => clearInterval(id)
  }, [playing, layer])

  useEffect(() => {
    setPlaying(false)
  }, [layer])

  const radarTime = new Date(base + RADAR_STEPS[step] * 60e3)
  const label =
    layer === 'radar'
      ? `${RADAR_STEPS[step] === 0 ? 'Now' : fmtHour(radarTime.getTime())}${RADAR_STEPS[step] > 0 ? ' · forecast' : RADAR_STEPS[step] < 0 ? ' · past' : ''}`
      : layer === 'forecast'
        ? hour === 0
          ? 'Now'
          : `+${hour} h · ${fmtHour(grid?.times[hour] ?? Date.now() + hour * 3600e3)}`
        : `Satellite · ${fmtHour(Date.parse(satTime()))}`

  return (
    <section className="glass overflow-hidden rounded-[28px]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-base font-extrabold">Around you</h2>
        <div className="flex gap-1 rounded-full bg-black/15 p-1 text-[11px] font-bold">
          {(['radar', 'satellite', 'forecast'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className={`rounded-full px-2.5 py-1 capitalize transition ${layer === l ? 'bg-white text-[#3a1d8a]' : 'text-white/70'}`}
            >
              {l === 'forecast' ? '12 h rain' : l}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-72">
        <MapContainer center={center} zoom={ZOOM.radar} zoomControl={false} scrollWheelZoom={false} attributionControl className="h-full w-full">
          <ZoomTo layer={layer} center={center} />
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="tiles-dark"
            maxZoom={18}
          />
          {layer === 'radar' && (
            <WMSTileLayer
              key="radar"
              url="https://maps.dwd.de/geoserver/dwd/wms"
              params={{ layers: 'dwd:Radar_rv_product_1x1km_ger', format: 'image/png', transparent: true, time: radarTime.toISOString() } as never}
              opacity={0.75}
              attribution="Radar &copy; DWD"
            />
          )}
          {layer === 'satellite' && (
            <WMSTileLayer
              key="sat"
              url="https://view.eumetsat.int/geoserver/wms"
              // Pin one timestamp so every tile shows the same image (EUMETSAT snaps to the nearest scan)
              params={{ layers: 'mtg_fd:rgb_geocolour', format: 'image/png', transparent: true, time: satTime() } as never}
              opacity={0.85}
              attribution="Satellite &copy; EUMETSAT"
            />
          )}
          {layer === 'forecast' &&
            grid?.points.map((p, i) => {
              const color = rainColor(grid.precip[i][hour])
              if (!color) return null
              return (
                <Rectangle
                  key={i}
                  bounds={[
                    [p.lat - grid.step.lat / 2, p.lon - grid.step.lon / 2],
                    [p.lat + grid.step.lat / 2, p.lon + grid.step.lon / 2],
                  ]}
                  pathOptions={{ stroke: false, fillColor: color, fillOpacity: 0.5 }}
                />
              )
            })}
          <Circle center={center} radius={1000} pathOptions={{ color: '#ffffff', weight: 1.5, dashArray: '4 6', fillOpacity: 0.04 }} />
          <CircleMarker center={center} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#b98cff', fillOpacity: 1 }} />
        </MapContainer>
        <div className="pointer-events-none absolute top-3 left-3 z-[400] rounded-full bg-[#1a0c48]/70 px-3 py-1 text-xs font-bold backdrop-blur">
          {label}
        </div>
        {layer === 'forecast' && grid && grid.precip.every((row) => row.every((v) => v < 0.1)) && (
          <div className="pointer-events-none absolute right-3 bottom-8 left-3 z-[400] rounded-2xl bg-[#1a0c48]/70 px-3 py-2 text-center text-xs font-bold backdrop-blur">
            ☀️ No rain forecast within 4 km for the next 12 hours
          </div>
        )}
      </div>

      {layer !== 'satellite' && (
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#3a1d8a] shadow"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>
            )}
          </button>
          <input
            type="range"
            className="slider w-full"
            min={0}
            max={layer === 'radar' ? RADAR_STEPS.length - 1 : 12}
            value={layer === 'radar' ? step : hour}
            onChange={(e) => (layer === 'radar' ? setStep(+e.target.value) : setHour(+e.target.value))}
          />
        </div>
      )}
      {layer === 'satellite' && <p className="px-5 py-3 text-xs text-white/60">Live Meteosat cloud image, refreshed every ~10 minutes.</p>}
    </section>
  )
}
