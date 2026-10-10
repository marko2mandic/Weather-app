import { useState } from 'react'
import type { Weather } from '../lib/weather'
import { describe } from '../lib/wmo'
import { bestWindow } from '../lib/tips'
import { fmtDate, fmtHour, fmtShortDay } from '../lib/format'
import HourRow from '../components/HourRow'
import WeatherIcon from '../components/WeatherIcon'

export default function ThreeDays({ weather }: { weather: Weather }) {
  const days = weather.days.slice(0, 3)
  const [sel, setSel] = useState(0)
  const day = days[sel]
  if (!day) return null

  const hours = weather.hours.filter(
    (h) => h.time >= day.time + 7 * 3600e3 && h.time <= day.time + 20 * 3600e3 && (sel > 0 || h.time > Date.now() - 3600e3),
  )
  const best = bestWindow(weather.hours, day)

  return (
    <div className="space-y-4">
      {/* Day picker, like the bottom strip of the reference */}
      <section className="glass-deep animate-fade-up flex justify-around rounded-[28px] px-2 py-4">
        {days.map((d, i) => (
          <button
            key={d.time}
            onClick={() => setSel(i)}
            className={`flex flex-col items-center gap-1.5 rounded-3xl px-4 py-2 transition ${
              sel === i ? 'bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' : 'opacity-70'
            }`}
          >
            <WeatherIcon code={d.code} size={46} />
            <span className={`text-sm ${sel === i ? 'font-extrabold' : 'font-semibold'}`}>
              {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtShortDay(d.time)}
            </span>
            <span className="text-xs font-bold text-white/70">
              {Math.round(d.tmax)}° <span className="text-white/45">{Math.round(d.tmin)}°</span>
            </span>
          </button>
        ))}
      </section>

      <section key={day.time} className="glass animate-fade-up rounded-[28px] p-5">
        <div className="text-[11px] font-bold tracking-widest text-white/55 uppercase">{fmtDate(day.time)}</div>
        <div className="mt-1 text-2xl font-extrabold">{describe(day.code).label}</div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Stat label="Rain" value={`${day.precipSum.toFixed(1)} mm`} sub={`${day.probMax}%`} />
          <Stat label="UV max" value={`${Math.round(day.uvMax)}`} sub={day.uvMax >= 3 ? 'sunscreen' : 'low'} />
          <Stat label="Wind" value={`${Math.round(day.windMax)}`} sub="km/h" />
          <Stat label="Sun" value={fmtHour(day.sunrise)} sub={fmtHour(day.sunset)} />
        </div>
        <div className="mt-4 rounded-2xl bg-emerald-300/12 px-4 py-3 text-sm">
          {best ? (
            <>
              <span className="font-extrabold text-emerald-200">Best time outside: </span>
              {fmtHour(best.start)}–{fmtHour(best.end)}, dry, feels up to {Math.round(best.feels)}°
            </>
          ) : (
            <span className="font-bold text-sky-200">No fully dry window during the day. Pack rain gear.</span>
          )}
        </div>
      </section>

      <section key={`h${day.time}`} className="glass-deep animate-fade-up overflow-hidden rounded-[28px]">
        <div className="px-5 pt-4 pb-2 text-base font-extrabold">Hour by hour · 07–20</div>
        {hours.map((h) => (
          <HourRow key={h.time} h={h} highlight={!!best && h.time >= best.start && h.time < best.end} />
        ))}
      </section>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white/8 px-1 py-2.5">
      <div className="text-[10px] font-bold tracking-wider text-white/50 uppercase">{label}</div>
      <div className="mt-0.5 text-sm font-extrabold">{value}</div>
      <div className="text-[10px] text-white/55">{sub}</div>
    </div>
  )
}
