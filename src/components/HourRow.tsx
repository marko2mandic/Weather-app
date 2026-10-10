import type { Hour } from '../lib/weather'
import { fmtHour } from '../lib/format'
import WeatherIcon from './WeatherIcon'

/** One reference-style row: icon · time · rain · wind · temp. */
export default function HourRow({ h, now = false, highlight = false }: { h: Hour; now?: boolean; highlight?: boolean }) {
  const wet = h.precip >= 0.1
  return (
    <div
      className={`flex items-center gap-3 border-t border-white/8 px-4 py-2.5 first:border-t-0 ${
        highlight ? 'bg-emerald-300/10' : ''
      }`}
    >
      <WeatherIcon code={h.code} isDay={h.isDay} size={40} />
      <div className="w-14 text-[15px] font-extrabold">{now ? 'Now' : fmtHour(h.time)}</div>

      {/* rain: probability bar + mm */}
      <div className="flex flex-1 items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(h.prob, wet ? 15 : 0)}%`,
              background: wet ? 'linear-gradient(90deg,#7fb2ff,#4f7bff)' : 'rgba(170,190,255,0.55)',
            }}
          />
        </div>
        <div className={`w-14 text-right text-xs font-bold ${wet ? 'text-sky-200' : 'text-white/60'}`}>
          {wet ? `${h.precip.toFixed(1)} mm` : `${h.prob}%`}
        </div>
      </div>

      <div className="flex w-12 items-center justify-end gap-1 text-xs text-white/65" title={`${Math.round(h.wind)} km/h`}>
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ transform: `rotate(${h.windDir + 180}deg)` }}>
          <path d="M12 2 19 20 12 16 5 20z" fill="#a3e8c8" />
        </svg>
        {Math.round(h.wind)}
      </div>
      <div className="w-10 text-right text-[15px] font-extrabold">{Math.round(h.temp)}°</div>
    </div>
  )
}
