import { useState, type ReactNode } from 'react'
import type { Weather } from '../lib/weather'
import type { FeedbackEntry, Tuning } from '../lib/learning'
import { rainLast, sandState, slideState, type Wetness } from '../lib/sand'
import { dayPlan, ideas, type Idea, type Verdict } from '../lib/activities'
import { CAT, fmtDist, mapsLink, usePlaces, type KidPlace } from '../lib/places'
import type { SceneKind } from '../lib/place'
import { fmtAge } from '../lib/settings'
import { fmtAgo, fmtHour } from '../lib/format'

const VERDICT: Record<Verdict, { emoji: string; label: string; bg: string }> = {
  outdoors: { emoji: '🌳', label: 'Outdoors', bg: 'from-emerald-300/25 to-purple-500/10' },
  both: { emoji: '🌤️', label: 'Both', bg: 'from-amber-300/20 to-purple-500/10' },
  indoors: { emoji: '🏠', label: 'Indoors', bg: 'from-sky-400/25 to-indigo-500/15' },
}

const WET_STYLE: Record<Wetness, { label: string; color: string; bg: string }> = {
  wet: { label: 'Wet', color: '#9cc8ff', bg: 'from-sky-400/30 to-indigo-500/20' },
  damp: { label: 'Damp', color: '#ffd59a', bg: 'from-amber-300/25 to-purple-500/15' },
  dry: { label: 'Dry', color: '#a3f0c8', bg: 'from-emerald-300/25 to-purple-500/15' },
}

export default function Tips({
  weather,
  tuning,
  onFeedback,
  ageMonths,
  radiusKm,
  lat,
  lon,
  scene,
  onSettings,
}: {
  weather: Weather
  tuning: Tuning
  onFeedback: (e: Omit<FeedbackEntry, 'at'>) => void
  ageMonths: number
  radiusKm: number
  lat: number
  lon: number
  scene: SceneKind
  onSettings: () => void
}) {
  const sand = sandState(weather.hours, tuning.sandFactor)
  const slide = slideState(weather.hours, tuning.sandFactor)
  const today = weather.days[0]
  const plan = dayPlan(weather, ageMonths)
  const idea = ideas(weather, ageMonths, scene)
  const { places, error: placesError } = usePlaces(lat, lon, radiusKm)
  const rain12 = rainLast(weather.hours, 12)
  const nextHours = weather.hours.filter((h) => h.time > Date.now() - 3600e3).slice(0, 10)
  const maxGust = Math.max(...nextHours.map((h) => h.gusts))
  const uvMax = today?.uvMax ?? 0
  const uvHours = weather.hours.filter((h) => today && h.time >= today.time && h.time < today.time + 86400e3 && h.uv >= 3)

  const v = VERDICT[plan.verdict]

  return (
    <div className="space-y-4">
      {/* Indoors, outdoors or both: the headline call for the day */}
      <section className={`glass animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br ${v.bg} p-5`}>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/15 text-3xl">{v.emoji}</div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-widest text-white/55 uppercase">
              {plan.when === 'today' ? 'Today' : 'Tomorrow'} · {v.label}
            </div>
            <div className="text-xl leading-tight font-black">{plan.headline}</div>
            <div className="mt-0.5 text-sm text-white/75">{plan.reason}</div>
          </div>
        </div>
        {plan.windows.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.windows.map((w) => (
              <span key={w.start} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                🌳 Outside {fmtHour(w.start)}–{fmtHour(w.end)}
              </span>
            ))}
          </div>
        )}
      </section>

      <Activities
        verdict={plan.verdict}
        outside={idea.outside}
        home={idea.home}
        places={places}
        placesError={placesError}
        ageMonths={ageMonths}
        radiusKm={radiusKm}
        onSettings={onSettings}
      />

      {/* Sand */}
      <section className={`glass animate-fade-up overflow-hidden rounded-[28px] bg-gradient-to-br ${WET_STYLE[sand.state].bg}`}>
        <div className="flex items-center gap-4 p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/15 text-3xl">🏖️</div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-widest text-white/55 uppercase">Sandbox right now</div>
            <div className="text-2xl font-black" style={{ color: WET_STYLE[sand.state].color }}>
              {WET_STYLE[sand.state].label}
            </div>
            <div className="text-sm text-white/75">
              {sand.state === 'dry'
                ? 'Good to dig. Normal clothes are fine.'
                : sand.dryAt
                  ? `Should be dry by ~${fmtHour(sand.dryAt)}`
                  : 'Will stay wet for a while. Rain pants for digging.'}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-3 text-xs text-white/65">
          {sand.lastRain
            ? `Last rain ${fmtAgo(sand.lastRain.time)} (${sand.lastRain.mm.toFixed(1)} mm that hour) · ${rain12.toFixed(1)} mm in the last 12 h`
            : 'No rain in the last 2 days'}
        </div>
        <Calibrate
          question="Was the sand like this?"
          options={[
            { v: 'wetter', l: 'It was wetter' },
            { v: 'right', l: 'Spot on' },
            { v: 'drier', l: 'It was drier' },
          ]}
          onPick={(v) => onFeedback({ kind: 'sand', value: v, context: { predicted: sand.state } })}
        />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Tip emoji="🛝" title="Slides & benches" tone={slide.state === 'dry' ? 'good' : 'warn'}>
          {slide.state === 'dry' ? 'Dry. Slide away!' : slide.dryAt ? `Wet, dry by ~${fmtHour(slide.dryAt)}. Bring a towel.` : 'Wet. Bring a towel to wipe.'}
        </Tip>
        <Tip emoji="🥾" title="Puddles" tone={rain12 >= 2 ? 'warn' : 'good'}>
          {rain12 >= 2 ? `${rain12.toFixed(0)} mm fell recently: rain boots + puddle pants.` : 'Mostly dry paths. Sneakers OK.'}
        </Tip>
        <Tip emoji="🧴" title="Sun" tone={uvHours.some((h) => h.time + 3600e3 > Date.now()) ? 'warn' : 'good'}>
          {uvMax >= 3 && uvHours.length
            ? uvHours[uvHours.length - 1].time + 3600e3 < Date.now()
              ? 'Strong sun is over for today.'
              : `UV ${Math.round(uvMax)}. ${ageMonths < 6 ? 'Shade + canopy (no sunscreen yet)' : 'Sunscreen + hat'} ${fmtHour(uvHours[0].time)}–${fmtHour(uvHours[uvHours.length - 1].time + 3600e3)}.`
            : `UV ${Math.round(uvMax)}. No sunscreen needed.`}
        </Tip>
        <Tip emoji="🌬️" title="Wind" tone={maxGust >= 40 ? 'warn' : 'good'}>
          {maxGust >= 40 ? `Gusts up to ${Math.round(maxGust)} km/h. Windproof layer, avoid tall trees.` : `Gusts up to ${Math.round(maxGust)} km/h. Calm enough.`}
        </Tip>
      </div>
    </div>
  )
}

type ActTab = 'outside' | 'indoor' | 'home'

function Activities({
  verdict,
  outside,
  home,
  places,
  placesError,
  ageMonths,
  radiusKm,
  onSettings,
}: {
  verdict: Verdict
  outside: Idea[]
  home: Idea[]
  places: KidPlace[] | null
  placesError: string | null
  ageMonths: number
  radiusKm: number
  onSettings: () => void
}) {
  const [tab, setTab] = useState<ActTab>(verdict === 'indoors' ? 'indoor' : 'outside')
  // Only places that suit the child's age (and open-air pools only in summer)
  const month = new Date().getMonth() + 1
  const fit = places?.filter((p) => ageMonths >= CAT[p.cat].minAge && (p.cat !== 'outdoor_pool' || (month >= 6 && month <= 8))) ?? null
  const outdoorPlaces = fit?.filter((p) => !p.indoor) ?? null
  const indoorPlaces = fit?.filter((p) => p.indoor) ?? null

  return (
    <section className="glass-deep animate-fade-up overflow-hidden rounded-[28px]">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-base font-extrabold">Activity ideas</h2>
        <button onClick={onSettings} className="text-[11px] font-bold text-white/55 hover:text-white/80">
          {fmtAge(ageMonths)} · {radiusKm} km ›
        </button>
      </div>
      <div className="mx-4 mt-3 flex rounded-full bg-black/15 p-1">
        {(
          [
            ['outside', '🌳 Outside'],
            ['indoor', '🏛️ Indoor places'],
            ['home', '🏠 At home'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${tab === id ? 'bg-white text-[#3a1d8a] shadow' : 'text-white/70'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4" key={tab}>
        {tab === 'outside' && (
          <>
            <IdeaList list={outside} />
            <PlaceList title="Nearby outdoor spots" places={outdoorPlaces} error={placesError} />
          </>
        )}
        {tab === 'indoor' && <PlaceList places={indoorPlaces} error={placesError} empty={`No indoor family places mapped within ${radiusKm} km. Try a bigger radius.`} />}
        {tab === 'home' && <IdeaList list={home} />}
      </div>
    </section>
  )
}

function IdeaList({ list }: { list: Idea[] }) {
  return (
    <ul className="space-y-2">
      {list.map((i, n) => (
        <li key={i.text} className="flex items-center gap-3 rounded-2xl bg-white/8 px-3 py-2.5 text-sm font-semibold" style={{ animation: `fade-up .35s ease-out ${n * 50}ms both` }}>
          <span className="text-xl">{i.emoji}</span>
          {i.text}
        </li>
      ))}
    </ul>
  )
}

function PlaceList({ title, places, error, empty }: { title?: string; places: KidPlace[] | null; error: string | null; empty?: string }) {
  return (
    <div className={title ? 'mt-4' : ''}>
      {title && <h3 className="mb-2 text-[11px] font-bold tracking-widest text-white/55 uppercase">{title}</h3>}
      {error ? (
        <p className="text-sm text-white/60">{error}</p>
      ) : !places ? (
        <p className="animate-pulse text-sm text-white/60">Finding places nearby…</p>
      ) : places.length === 0 ? (
        <p className="text-sm text-white/60">{empty ?? 'Nothing mapped nearby.'}</p>
      ) : (
        <ul className="space-y-1.5">
          {places.map((p) => (
            <li key={p.id}>
              <a
                href={mapsLink(p)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/8"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/12 text-lg">{CAT[p.cat].emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="text-xs text-white/55">{p.name === CAT[p.cat].label ? 'Tap for directions' : CAT[p.cat].label}</span>
                </span>
                <span className="text-right text-xs font-bold text-white/70">
                  {fmtDist(p.dist)}
                  <span className="block text-[10px] font-semibold text-white/45">{p.dir}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {places && places.length > 0 && <p className="mt-2 text-[10px] text-white/40">Places © OpenStreetMap contributors · tap to open in maps</p>}
    </div>
  )
}

function Tip({ emoji, title, tone, children }: { emoji: string; title: string; tone: 'good' | 'warn'; children: ReactNode }) {
  return (
    <section className="glass animate-fade-up rounded-[24px] p-4">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${tone === 'good' ? 'bg-emerald-300' : 'bg-amber-300'} shadow-[0_0_10px_currentColor]`} />
      </div>
      <div className="mt-2 text-sm font-extrabold">{title}</div>
      <div className="mt-0.5 text-[13px] leading-snug text-white/75">{children}</div>
    </section>
  )
}

function Calibrate({ question, options, onPick }: { question: string; options: { v: string; l: string }[]; onPick: (v: string) => void }) {
  const [done, setDone] = useState(false)
  if (done) return <div className="border-t border-white/10 px-5 py-3 text-center text-xs font-bold text-white/70">Thanks! The sand model will adjust.</div>
  return (
    <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
      <span className="text-xs font-bold text-white/60">{question}</span>
      <div className="ml-auto flex gap-1">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => {
              onPick(o.v)
              setDone(true)
            }}
            className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold hover:bg-white/20"
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  )
}
