import { useId } from 'react'
import { describe, type Kind } from '../lib/wmo'

/** Round illustrated icon in the style of the reference: a sky disc with sun / clouds / rain. */
export default function WeatherIcon({ code, isDay = true, size = 48 }: { code: number; isDay?: boolean; size?: number }) {
  const kind = describe(code).kind
  const id = useId().replace(/:/g, '')
  const sky = skyFor(kind, isDay)

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0 drop-shadow-[0_6px_10px_rgba(20,0,60,0.35)]">
      <defs>
        <radialGradient id={`sky${id}`} cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor={sky[0]} />
          <stop offset="100%" stopColor={sky[1]} />
        </radialGradient>
        <radialGradient id={`sun${id}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fffbe0" />
          <stop offset="100%" stopColor="#ffd25e" />
        </radialGradient>
        <linearGradient id={`cl${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={kind === 'rain' || kind === 'storm' ? '#ffffff' : '#fff4ec'} />
          <stop offset="100%" stopColor={kind === 'rain' || kind === 'storm' ? '#c9c4ea' : '#f5b7a0'} />
        </linearGradient>
        <clipPath id={`clip${id}`}>
          <circle cx="32" cy="32" r="29" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill="rgba(255,255,255,0.18)" />
      <circle cx="32" cy="32" r="29" fill={`url(#sky${id})`} />
      <g clipPath={`url(#clip${id})`}>
        {(kind === 'clear' || kind === 'partly') &&
          (isDay ? (
            <circle cx={kind === 'clear' ? 32 : 36} cy={kind === 'clear' ? 32 : 28} r={kind === 'clear' ? 13 : 12} fill={`url(#sun${id})`} />
          ) : (
            <path d={kind === 'clear' ? 'M38 18a14 14 0 1 0 8 25a12 12 0 1 1-8-25z' : 'M40 14a12 12 0 1 0 7 21a10 10 0 1 1-7-21z'} fill="#efeaff" />
          ))}
        {kind !== 'clear' && <Cloud kind={kind} fill={`url(#cl${id})`} />}
        {(kind === 'rain' || kind === 'drizzle' || kind === 'storm') && <Rain heavy={kind !== 'drizzle'} />}
        {kind === 'snow' && <Snow />}
        {kind === 'storm' && <path d="M33 38 L27 48 L32 48 L29 58 L38 45 L33 45 L36 38 Z" fill="#ffd25e" />}
        {kind === 'fog' && (
          <g stroke="#f4eeff" strokeWidth="3" strokeLinecap="round" opacity="0.9">
            <line x1="14" y1="44" x2="44" y2="44" />
            <line x1="20" y1="51" x2="50" y2="51" />
          </g>
        )}
      </g>
    </svg>
  )
}

function skyFor(kind: Kind, isDay: boolean): [string, string] {
  if (!isDay) return ['#3b2c86', '#160c44']
  if (kind === 'rain' || kind === 'drizzle' || kind === 'storm') return ['#3a6fd8', '#18267a']
  if (kind === 'snow') return ['#8fb5ff', '#3e4fae']
  if (kind === 'cloudy' || kind === 'fog') return ['#9a86d6', '#4b3592']
  return ['#b77ce8', '#5a2fb8']
}

function Cloud({ kind, fill }: { kind: Kind; fill: string }) {
  const y = kind === 'partly' ? 38 : kind === 'rain' || kind === 'drizzle' || kind === 'storm' || kind === 'snow' ? 26 : 34
  return (
    <g fill={fill} transform={`translate(0 ${y - 34})`}>
      <circle cx="22" cy="38" r="10" />
      <circle cx="33" cy="31" r="13" />
      <circle cx="45" cy="37" r="10" />
      <rect x="12" y="36" width="44" height="12" rx="6" />
    </g>
  )
}

function Rain({ heavy }: { heavy: boolean }) {
  const lines = heavy ? [18, 26, 34, 42, 50] : [22, 34, 46]
  return (
    <g stroke="#bcd3ff" strokeWidth="2" strokeLinecap="round" opacity="0.9">
      {lines.map((x, i) => (
        <line key={x} x1={x} y1={42 + (i % 2) * 4} x2={x - 3} y2={50 + (i % 2) * 4} />
      ))}
    </g>
  )
}

function Snow() {
  return (
    <g fill="#ffffff">
      {[
        [20, 46],
        [32, 50],
        [44, 46],
        [26, 56],
        [38, 57],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.4" />
      ))}
    </g>
  )
}
