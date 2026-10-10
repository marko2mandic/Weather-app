import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import type { HouseholdApi } from '../lib/household'
import type { Tuning } from '../lib/learning'
import { fmtAge, type Settings } from '../lib/settings'
import type { InstallApi } from '../lib/install'
import InstallCard from './InstallCard'
import { FAMILY_SHARING } from '../lib/features'
import { labelFor, searchAddress, type Home } from '../lib/location'
import { fmtAgo } from '../lib/format'

const FEEDBACK_LABEL: Record<string, string> = {
  'too-cold': '🥶 Too cold',
  'just-right': '😊 Just right',
  'too-warm': '🥵 Too warm',
  wetter: '🏖️ Sand was wetter',
  right: '🏖️ Sand spot on',
  drier: '🏖️ Sand was drier',
}

/** Account button for the header: initials when signed in, a people icon otherwise. */
export function AccountButton({ hh, onClick }: { hh: HouseholdApi; onClick: () => void }) {
  const initial = hh.email?.[0]?.toUpperCase()
  return (
    <button
      onClick={onClick}
      className="glass relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full text-sm font-extrabold"
      aria-label="Settings and family"
    >
      {initial ?? (
        // gear: settings + family
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      )}
      {hh.household && <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[#2a1660] bg-emerald-300" />}
    </button>
  )
}

export default function HouseholdSheet({
  hh,
  tuning,
  localTuning,
  settings,
  ageMonths,
  onSettings,
  install,
  home,
  onSetHome,
  locateOnce,
  onClose,
}: {
  home: Home | null
  onSetHome: (h: Home | null) => void
  locateOnce: () => Promise<{ lat: number; lon: number }>
  hh: HouseholdApi
  tuning: Tuning
  localTuning: { warmthOffset: number; sandFactor: number }
  settings: Settings
  ageMonths: number
  onSettings: (patch: Partial<Settings>) => void
  install: InstallApi
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    // No backdrop-filter on the overlay: nested backdrop filters make the sheet disappear in Chromium
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c0428]/70" onClick={onClose}>
      <div
        className="animate-fade-up max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[32px] border border-white/10 px-5 pt-3 shadow-2xl"
        style={{
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          background: 'linear-gradient(180deg, #3a1f86 0%, #24105e 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25" />
        <ChildSettings settings={settings} ageMonths={ageMonths} onChange={onSettings} shared={!!hh.household} />
        <HomeSettings home={home} onSetHome={onSetHome} locateOnce={locateOnce} />
        {install.available && (
          <div className="mt-5">
            <InstallCard api={install} />
          </div>
        )}
        <div className="my-6 h-px bg-white/10" />
        {!FAMILY_SHARING ? (
          <Learned tuning={tuning} />
        ) : !hh.session ? (
          <SignIn hh={hh} />
        ) : !hh.household ? (
          <CreateHousehold hh={hh} localTuning={localTuning} />
        ) : (
          <Family hh={hh} tuning={tuning} />
        )}
        {hh.error && <p className="mt-3 rounded-2xl bg-rose-400/15 px-4 py-2 text-sm text-rose-100">{hh.error}</p>}
        {FAMILY_SHARING && hh.session && (
          <p className="mt-5 flex items-center justify-between text-xs text-white/50">
            <span>Signed in as {hh.email}</span>
            <button onClick={() => hh.signOut()} className="font-bold text-white/70 underline-offset-2 hover:underline">
              Sign out
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

function ChildSettings({
  settings,
  ageMonths,
  onChange,
  shared,
}: {
  settings: Settings
  ageMonths: number
  onChange: (patch: Partial<Settings>) => void
  shared: boolean
}) {
  const [radius, setRadius] = useState(settings.radiusKm)
  useEffect(() => setRadius(settings.radiusKm), [settings.radiusKm])
  const thisMonth = new Date().toISOString().slice(0, 7)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold">Settings</h2>
        <p className="mt-1 text-sm text-white/65">{shared ? 'Shared with your family space.' : 'Saved on this phone.'}</p>
      </div>
      <Section title="Your child">
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-4 py-3">
          <span>
            <span className="block text-sm font-bold">Born in</span>
            <span className="text-xs text-white/60">{fmtAge(ageMonths)}. Advice and ideas follow their age</span>
          </span>
          <input
            type="month"
            value={settings.birth}
            max={thisMonth}
            min="2010-01"
            onChange={(e) => e.target.value && onChange({ birth: e.target.value })}
            className="rounded-xl border border-white/15 bg-white/10 px-2 py-1.5 text-sm font-bold text-white [color-scheme:dark]"
          />
        </label>
      </Section>
      <Section title="Activity places">
        <div className="rounded-2xl bg-white/8 px-4 py-3">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Search radius</span>
            <span>{radius} km</span>
          </div>
          <input
            type="range"
            className="slider mt-3 w-full"
            min={1}
            max={5}
            step={0.5}
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            // save once the finger lifts, not on every step (each change re-queries OpenStreetMap)
            onPointerUp={() => radius !== settings.radiusKm && onChange({ radiusKm: radius })}
            onKeyUp={() => radius !== settings.radiusKm && onChange({ radiusKm: radius })}
          />
          <div className="mt-1 flex justify-between text-[10px] font-bold text-white/45">
            <span>1 km</span>
            <span>5 km</span>
          </div>
        </div>
      </Section>
    </div>
  )
}

function HomeSettings({
  home,
  onSetHome,
  locateOnce,
}: {
  home: Home | null
  onSetHome: (h: Home | null) => void
  locateOnce: () => Promise<{ lat: number; lon: number }>
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Home[] | null>(null)
  const [busy, setBusy] = useState<'search' | 'gps' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return
    setBusy('search')
    setError(null)
    try {
      const r = await searchAddress(q)
      setResults(r)
      if (!r.length) setError('No matches. Try street + city')
    } catch {
      setError('Search failed, check your connection')
    } finally {
      setBusy(null)
    }
  }

  const useHere = async () => {
    setBusy('gps')
    setError(null)
    try {
      const p = await locateOnce()
      onSetHome({ ...p, label: await labelFor(p.lat, p.lon) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get your location')
    } finally {
      setBusy(null)
    }
  }

  const pick = (h: Home) => {
    onSetHome(h)
    setResults(null)
    setQ('')
  }

  return (
    <div className="mt-5">
      <Section title="Home">
        <div className="space-y-2 rounded-2xl bg-white/8 px-4 py-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0">
              <span className="block font-bold">{home ? home.label : 'Not set yet'}</span>
              <span className="text-xs text-white/60">{home ? 'Your 1 km circle centres here' : 'Set it to get "Home" weather anywhere you are'}</span>
            </span>
            {home && (
              <button onClick={() => onSetHome(null)} className="shrink-0 text-xs font-bold text-white/55 hover:text-white">
                Remove
              </button>
            )}
          </div>
          <button
            onClick={useHere}
            disabled={busy !== null}
            className="w-full rounded-xl bg-white/12 py-2 text-sm font-bold transition hover:bg-white/20 disabled:opacity-60"
          >
            {busy === 'gps' ? 'Locating…' : '📍 Use my current location'}
          </button>
          <form onSubmit={search} className="flex gap-2">
            <Input placeholder="or search an address" value={q} onChange={setQ} className="flex-1 !py-2 text-sm" />
            <button disabled={busy !== null} className="rounded-xl bg-white px-3 text-sm font-extrabold text-[#3a1d8a] disabled:opacity-60">
              {busy === 'search' ? '…' : 'Find'}
            </button>
          </form>
          {error && <p className="text-xs text-amber-100">{error}</p>}
          {results && results.length > 0 && (
            <ul className="divide-y divide-white/10 overflow-hidden rounded-xl bg-black/15">
              {results.map((r) => (
                <li key={`${r.lat},${r.lon}`}>
                  <button onClick={() => pick(r)} className="w-full px-3 py-2 text-left text-sm hover:bg-white/10">
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  )
}

function SignIn({ hh }: { hh: HouseholdApi }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await hh.sendCode(email)
      setStep('code')
    } catch {
      /* error shown by the sheet */
    } finally {
      setBusy(false)
    }
  }
  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await hh.verifyCode(email, code)
    } catch {
      /* error shown by the sheet */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-extrabold">Share with your partner</h2>
      <p className="mt-1 text-sm text-white/70">
        Sign in so you both see the same advice, and every "too cold / too warm" tap trains one shared model for your child. No password: we email you a
        code.
      </p>
      {step === 'email' ? (
        <form onSubmit={submitEmail} className="mt-5 space-y-3">
          <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={setEmail} required />
          <Primary busy={busy}>Email me a code</Primary>
        </form>
      ) : (
        <form onSubmit={submitCode} className="mt-5 space-y-3">
          <p className="text-sm text-white/75">
            Enter the code we sent to <b>{email}</b>
          </p>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 10))}
            required
            minLength={6}
            className="text-center text-2xl tracking-[0.4em]"
          />
          <Primary busy={busy}>Sign in</Primary>
          <button type="button" onClick={() => setStep('email')} className="w-full text-center text-xs font-bold text-white/60">
            Use a different email
          </button>
        </form>
      )}
    </div>
  )
}

function CreateHousehold({ hh, localTuning }: { hh: HouseholdApi; localTuning: { warmthOffset: number; sandFactor: number } }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const learned = localTuning.warmthOffset !== 0 || localTuning.sandFactor !== 1

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await hh.create(name || 'Our family', localTuning.warmthOffset, localTuning.sandFactor)
    } catch {
      /* shown */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-extrabold">Create your family space</h2>
      <p className="mt-1 text-sm text-white/70">
        Then invite your partner's email. {learned && 'What this phone has learned so far comes along.'}
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <Input placeholder="Our family" value={name} onChange={setName} maxLength={60} />
        <Primary busy={busy}>Create</Primary>
      </form>
      <div className="mt-5 rounded-2xl bg-white/8 px-4 py-3 text-sm text-white/70">
        Was your partner first? Ask them to invite <b className="text-white">{hh.email}</b>, then{' '}
        <button onClick={() => hh.reload()} className="font-bold text-white underline underline-offset-2">
          check again
        </button>
        .
      </div>
    </div>
  )
}

function Family({ hh, tuning }: { hh: HouseholdApi; tuning: Tuning }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const off = tuning.warmthOffset
  const sandPct = Math.round((tuning.sandFactor - 1) * 100)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await hh.invite(email)
      setEmail('')
    } catch {
      /* shown */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-bold tracking-widest text-white/55 uppercase">Family space</div>
        <h2 className="text-2xl font-extrabold">{hh.household!.name}</h2>
      </div>

      <Section title="Learned so far">
        <div className="grid grid-cols-2 gap-2">
          <Stat
            emoji="🧥"
            value={off === 0 ? 'Standard' : `${Math.abs(off)}° ${off > 0 ? 'warmer' : 'cooler'}`}
            sub="dressing vs. the guide"
          />
          <Stat emoji="🏖️" value={sandPct === 0 ? 'Standard' : `${Math.abs(sandPct)}% ${sandPct > 0 ? 'faster' : 'slower'}`} sub="sand drying" />
        </div>
      </Section>

      <Section title="Members">
        <ul className="space-y-1.5">
          {hh.members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2 text-sm">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-xs font-extrabold">{m.email[0]?.toUpperCase()}</span>
              {m.email}
              {m.user_id === hh.userId && <span className="text-xs text-white/50">(you)</span>}
            </li>
          ))}
          {hh.invites.map((i) => (
            <li key={i.email} className="flex items-center gap-2 text-sm text-white/65">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-white/30 text-xs">✉️</span>
              {i.email}
              <span className="text-xs">invited</span>
              <button onClick={() => hh.cancelInvite(i.email)} className="ml-auto text-xs font-bold text-white/60 hover:text-white">
                Cancel
              </button>
            </li>
          ))}
        </ul>
        {hh.members.length < 2 && (
          <form onSubmit={submit} className="mt-3 flex gap-2">
            <Input type="email" placeholder="Partner's email" value={email} onChange={setEmail} required className="flex-1" />
            <button disabled={busy} className="rounded-2xl bg-white px-4 text-sm font-extrabold text-[#3a1d8a] disabled:opacity-60">
              Invite
            </button>
          </form>
        )}
        {hh.invites.length > 0 && <p className="mt-2 text-xs text-white/55">They open the app, sign in with that email, and join automatically.</p>}
      </Section>

      {tuning.history.length > 0 && (
        <Section title="Recent feedback">
          <ul className="space-y-1.5 text-sm">
            {tuning.history.slice(0, 6).map((f, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{FEEDBACK_LABEL[f.value] ?? f.value}</span>
                <span className="text-xs text-white/50">
                  {f.by ? `${f.by} · ` : ''}
                  {fmtAgo(f.at)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

/** What this phone has learned from the feedback buttons (when family sharing is off). */
function Learned({ tuning }: { tuning: Tuning }) {
  const off = tuning.warmthOffset
  const sandPct = Math.round((tuning.sandFactor - 1) * 100)
  return (
    <Section title="Learned so far">
      <div className="grid grid-cols-2 gap-2">
        <Stat emoji="🧥" value={off === 0 ? 'Standard' : `${Math.abs(off)}° ${off > 0 ? 'warmer' : 'cooler'}`} sub="dressing vs. the guide" />
        <Stat emoji="🏖️" value={sandPct === 0 ? 'Standard' : `${Math.abs(sandPct)}% ${sandPct > 0 ? 'faster' : 'slower'}`} sub="sand drying" />
      </div>
      <p className="mt-2 text-xs text-white/55">From your "too cold / too warm" and sand answers. Saved on this phone.</p>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold tracking-widest text-white/55 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Stat({ emoji, value, sub }: { emoji: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white/8 px-3 py-3">
      <div className="text-xl">{emoji}</div>
      <div className="mt-1 text-base font-extrabold">{value}</div>
      <div className="text-xs text-white/55">{sub}</div>
    </div>
  )
}

function Input({
  value,
  onChange,
  className = '',
  ...rest
}: { value: string; onChange: (v: string) => void; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-base font-semibold text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none ${className}`}
    />
  )
}

function Primary({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button disabled={busy} className="w-full rounded-2xl bg-white py-3 text-base font-extrabold text-[#3a1d8a] shadow-lg transition active:scale-[0.98] disabled:opacity-60">
      {busy ? 'One moment…' : children}
    </button>
  )
}
