import { useState } from 'react'
import type { Weather } from '../lib/weather'
import { dress, walkingAge, type Mode } from '../lib/dressing'
import type { FeedbackEntry, Tuning } from '../lib/learning'
import { fmtHour } from '../lib/format'
import { FAMILY_SHARING } from '../lib/features'

const STARTS = [0, 1, 2, 3]

export default function Dress({
  weather,
  tuning,
  onFeedback,
  onShare,
  ageMonths,
}: {
  weather: Weather
  tuning: Tuning
  onFeedback: (e: Omit<FeedbackEntry, 'at'>) => void
  onShare: () => void
  ageMonths: number
}) {
  // Not walking yet → mostly in the stroller or carrier
  const [mode, setMode] = useState<Mode>(walkingAge(ageMonths) ? 'playing' : 'stroller')
  const [start, setStart] = useState(0)
  const [sent, setSent] = useState<string | null>(null)

  const from = Date.now() + start * 3600e3 - 3600e3
  const hours = weather.hours.filter((h) => h.time > from).slice(0, 2) // ~1.5 h outing
  if (!hours.length) return null
  const outfit = dress(hours, mode, tuning.warmthOffset, ageMonths)
  const off = tuning.warmthOffset

  const send = (value: string) => {
    onFeedback({
      kind: 'dress',
      value,
      context: { feels: Math.round(outfit.window.feels), mode, effective: Math.round(outfit.effective) },
    })
    setSent(value)
    setTimeout(() => setSent(null), 2500)
  }

  return (
    <div className="space-y-4">
      <section className="glass animate-fade-up space-y-3 rounded-[28px] p-4">
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { v: 'playing', l: '🏃‍♀️ Playing' },
            { v: 'stroller', l: '👶 In stroller' },
          ]}
        />
        <Segmented
          value={String(start)}
          onChange={(v) => setStart(+v)}
          options={STARTS.map((s) => ({ v: String(s), l: s === 0 ? 'Now' : fmtHour(Math.floor(Date.now() / 3600e3) * 3600e3 + s * 3600e3) }))}
        />
      </section>

      <section className="glass-deep animate-fade-up rounded-[28px] p-5" key={`${mode}-${start}`}>
        <div className="text-[11px] font-bold tracking-widest text-white/55 uppercase">
          Feels {Math.round(outfit.window.feels)}° · dressing for {Math.round(outfit.effective)}°
        </div>
        <div className="mt-1 text-2xl font-extrabold">{outfit.summary}</div>
        {outfit.window.rain && <div className="mt-1 text-sm font-bold text-sky-200">☔ Rain expected during this outing</div>}

        <ol className="mt-5 space-y-2.5">
          {outfit.layers.map((l, i) => (
            <li key={l.slot} className="flex items-center gap-3 rounded-2xl bg-white/8 px-3 py-2.5" style={{ animation: `fade-up .4s ease-out ${i * 60}ms both` }}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#b98cff]/50 to-[#5a2fb8]/60 text-xl">
                {l.emoji}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-widest text-white/50 uppercase">{l.slot}</div>
                <div className="text-[15px] leading-snug font-bold">{l.items.join(' · ')}</div>
              </div>
            </li>
          ))}
        </ol>

        {outfit.extras.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-white/80">
            {outfit.extras.map((e) => (
              <li key={e} className="flex gap-2">
                <span className="text-[#c9a6ff]">•</span>
                {e}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass animate-fade-up rounded-[28px] p-5">
        <div className="text-base font-extrabold">After the walk: how was it?</div>
        <p className="mt-1 text-sm text-white/65">
          Your answers tune the advice to your child.{' '}
          {!FAMILY_SHARING ? null : tuning.shared ? (
            'Shared with your family space.'
          ) : (
            <button onClick={onShare} className="font-bold text-white underline underline-offset-2">
              Share with your partner
            </button>
          )}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { v: 'too-cold', l: '🥶', t: 'Too cold' },
            { v: 'just-right', l: '😊', t: 'Just right' },
            { v: 'too-warm', l: '🥵', t: 'Too warm' },
          ].map((b) => (
            <button
              key={b.v}
              onClick={() => send(b.v)}
              className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-sm font-bold transition active:scale-95 ${
                sent === b.v ? 'bg-white text-[#3a1d8a]' : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <span className="text-2xl">{b.l}</span>
              {b.t}
            </button>
          ))}
        </div>
        <div className="mt-3 text-center text-xs text-white/60">
          {sent
            ? 'Thanks, noted!'
            : off === 0
              ? 'Using the standard toddler guide so far'
              : `Tuned to your child: dressing ${Math.abs(off)}° ${off > 0 ? 'warmer' : 'cooler'} than the standard guide`}
        </div>
      </section>
    </div>
  )
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="flex rounded-full bg-black/15 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-full py-2 text-sm font-bold transition ${value === o.v ? 'bg-white text-[#3a1d8a] shadow' : 'text-white/70'}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}
