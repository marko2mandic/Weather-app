import type { Weather } from '../lib/weather'
import { upcomingHours } from '../lib/weather'
import { nowcast } from '../lib/nowcast'
import { describe } from '../lib/wmo'
import { fmtHour } from '../lib/format'
import HourRow from '../components/HourRow'
import MapCard from '../components/MapCard'
import WeatherIcon from '../components/WeatherIcon'

export default function Now({
  weather,
  lat,
  lon,
  landmark,
  onNextLandmark,
}: {
  weather: Weather
  lat: number
  lon: number
  landmark: { name: string; area: string }
  onNextLandmark?: () => void // only Berlin has several landmarks to flip through
}) {
  const c = weather.current
  const nc = nowcast(weather)
  const hours = upcomingHours(weather, 13)
  const label = describe(c.code).label
  const maxBar = Math.max(2, ...nc.bars.map((b) => b.rate))

  return (
    <div className="space-y-4">
      {/* Hero: giant temperature floating over the live scene, as in the reference */}
      {/* Tall enough that the rain card starts at the horizon, leaving the landmark in view */}
      <section className="animate-fade-up flex flex-col pt-2 pb-3" style={{ minHeight: 'calc(50vh - 128px)' }}>
        <div className="flex items-start">
          <span className="text-shadow text-[120px] leading-[0.9] font-black tracking-tighter">{Math.round(c.temp)}</span>
          <span className="text-shadow mt-3 text-5xl font-black">°</span>
        </div>
        <div className="text-shadow mt-2 text-xl font-extrabold">{label}</div>
        <div className="text-shadow mt-1 flex gap-4 text-sm font-semibold text-white/80">
          <span>Feels {Math.round(c.feels)}°</span>
          <span className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" />
            </svg>
            {Math.round(c.wind)} km/h
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z" /></svg>
            {c.humidity}%
          </span>
        </div>
        <button
          onClick={onNextLandmark}
          disabled={!onNextLandmark}
          className={`glass mt-auto ml-auto flex items-center gap-1.5 rounded-full py-1 text-[11px] font-bold text-white/85 ${onNextLandmark ? 'pr-2 pl-3' : 'px-3'}`}
          title={onNextLandmark ? 'Show another Berlin landmark' : undefined}
        >
          <span key={landmark.name} className="animate-fade-up">
            {landmark.name} {landmark.area && <span className="font-semibold text-white/55">· {landmark.area}</span>}
          </span>
          {onNextLandmark && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </section>

      {/* Rain headline: the one thing that matters most before heading out */}
      <section className={`glass animate-fade-up rounded-[28px] p-5 ${nc.raining ? 'ring-1 ring-sky-300/40' : ''}`} style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-4">
          <WeatherIcon code={nc.raining ? 63 : c.code} isDay={c.isDay} size={54} />
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-widest text-white/55 uppercase">Rain in the next hours</div>
            <div className="text-lg leading-tight font-extrabold">{nc.headline}</div>
            <div className="text-sm text-white/70">{nc.detail}</div>
          </div>
        </div>
        {nc.bars.length > 0 && (
          <div className="mt-4">
            <div className="flex h-14 items-end gap-1.5">
              {nc.bars.map((b) => (
                <div key={b.time} className="flex h-full flex-1 flex-col justify-end">
                  <div
                    className="rounded-t-md"
                    style={{
                      height: `${Math.max(6, (b.rate / maxBar) * 100)}%`,
                      background: b.rate >= 0.4 ? 'linear-gradient(180deg,#9fc4ff,#4f7bff)' : 'rgba(255,255,255,0.16)',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-bold text-white/50">
              <span>Now</span>
              <span>{fmtHour(nc.bars[Math.min(3, nc.bars.length - 1)].time)}</span>
              <span>{fmtHour(nc.bars[nc.bars.length - 1].time + 15 * 60e3)}</span>
            </div>
          </div>
        )}
      </section>

      <section className="glass-deep animate-fade-up overflow-hidden rounded-[28px]" style={{ animationDelay: '160ms' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-extrabold">Next 12 hours</h2>
          <span className="text-[11px] font-bold text-white/50">rain · wind · temp</span>
        </div>
        {hours.map((h, i) => (
          <HourRow key={h.time} h={h} now={i === 0} />
        ))}
      </section>

      <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
        <MapCard lat={lat} lon={lon} />
      </div>
    </div>
  )
}
