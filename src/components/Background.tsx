import { useEffect, useMemo, useRef, useState } from 'react'
import { SKY, skyGroup, type Phase, type Scene, type SkyGroup } from '../lib/scene'
import type { SceneId } from '../lib/landmarks'
import Skyline from './Skyline'

/** Deterministic pseudo-random so clouds/stars stay put between renders. */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

const PHASES: Phase[] = ['night', 'dawn', 'day', 'dusk']
const GROUPS: SkyGroup[] = ['clear', 'cloudy', 'wet', 'snow']

export default function Background({ scene, landmark }: { scene: Scene; landmark: SceneId }) {
  const group = skyGroup(scene)
  const dark = scene.phase === 'night'

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Sky: every palette is mounted, the active one fades in so weather changes cross-dissolve */}
      {PHASES.flatMap((p) =>
        GROUPS.map((g) => {
          const [a, b, c] = SKY[p][g]
          return (
            <div
              key={`${p}-${g}`}
              className="sky-layer absolute inset-0"
              style={{
                // horizon colour sits on the skyline's ground line (50vh)
                background: `linear-gradient(180deg, ${a} 0%, ${b} 28%, ${c} 50%)`,
                opacity: p === scene.phase && g === group ? 1 : 0,
              }}
            />
          )
        }),
      )}

      <Stars visible={dark ? 1 - scene.cloud / 100 : scene.phase === 'day' ? 0 : 0.25 * (1 - scene.cloud / 100)} />
      <Celestial scene={scene} />
      <Clouds scene={scene} />
      {scene.kind === 'fog' && <Fog />}
      <Skyline scene={scene} active={landmark} />
      <Precipitation scene={scene} />
      {scene.kind === 'storm' && <Lightning />}

      {/* Bottom vignette keeps the cards readable over the scene */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(16,6,48,0.55))' }}
      />
    </div>
  )
}

function Stars({ visible }: { visible: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: rand(i) * 100,
        y: rand(i + 100) * 42,
        r: 0.6 + rand(i + 200) * 1.4,
        d: 2 + rand(i + 300) * 4,
        delay: rand(i + 400) * -6,
      })),
    [],
  )
  return (
    <div className="sky-layer absolute inset-0" style={{ opacity: Math.max(0, visible) }}>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r * 2,
            height: s.r * 2,
            boxShadow: '0 0 6px rgba(255,255,255,0.8)',
            animation: `twinkle ${s.d}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function Celestial({ scene }: { scene: Scene }) {
  const isSun = scene.phase !== 'night'
  const group = skyGroup(scene)
  // Sun/moon follows an arc: rises bottom-left, peaks top-centre, sets bottom-right.
  const x = 8 + scene.arc * 84
  const y = 47 - Math.sin(scene.arc * Math.PI) * 38
  const veil = group === 'wet' || group === 'snow' ? 0.12 : Math.max(0.2, 1 - scene.cloud / 120)
  const size = isSun ? 120 : 70

  return (
    <div
      className="sky-layer absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        opacity: veil,
        transition: 'left 3s ease, top 3s ease, opacity 2.5s ease',
      }}
    >
      {/* glow */}
      <div
        className="absolute rounded-full"
        style={{
          inset: isSun ? -140 : -70,
          background: isSun
            ? `radial-gradient(circle, rgba(255,226,160,0.55) 0%, rgba(255,170,140,0.25) 35%, transparent 70%)`
            : `radial-gradient(circle, rgba(220,215,255,0.35) 0%, transparent 65%)`,
          animation: isSun ? 'sun-pulse 7s ease-in-out infinite' : undefined,
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: isSun
            ? 'radial-gradient(circle at 40% 38%, #fffbe0 0%, #ffe68a 45%, #ffbe6b 100%)'
            : 'radial-gradient(circle at 38% 35%, #ffffff 0%, #e9e4ff 55%, #bdb3ea 100%)',
          boxShadow: isSun ? '0 0 60px rgba(255,214,120,0.8)' : '0 0 40px rgba(220,215,255,0.6)',
        }}
      >
        {!isSun && (
          <>
            <span className="absolute rounded-full" style={{ left: '22%', top: '30%', width: 14, height: 14, background: 'rgba(150,140,200,0.35)' }} />
            <span className="absolute rounded-full" style={{ left: '55%', top: '55%', width: 10, height: 10, background: 'rgba(150,140,200,0.3)' }} />
            <span className="absolute rounded-full" style={{ left: '60%', top: '24%', width: 7, height: 7, background: 'rgba(150,140,200,0.3)' }} />
          </>
        )}
      </div>
    </div>
  )
}

function cloudColors(phase: Phase, group: SkyGroup): [string, string] {
  if (group === 'wet') return phase === 'night' ? ['#2c2850', '#1c1938'] : ['#7c78a0', '#4e4a74']
  if (phase === 'night') return ['#3b3270', '#241c4e']
  if (phase === 'dawn' || phase === 'dusk') return ['#ffd9cc', '#b47aa8']
  if (group === 'cloudy' || group === 'snow') return ['#e6defa', '#9d8fc6']
  return ['#ffffff', '#d7c6f2']
}

function Clouds({ scene }: { scene: Scene }) {
  const group = skyGroup(scene)
  const wetOrSnow = group === 'wet' || group === 'snow'
  const count = Math.round((wetOrSnow ? Math.max(scene.cloud, 85) : scene.cloud) / 100 * 11)
  const [light, shade] = cloudColors(scene.phase, group)
  // Wind speeds clouds up: 0 km/h → slow drift, 40 km/h → ~4× faster
  const windFactor = 1 + Math.min(scene.wind, 50) / 13

  const clouds = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        y: 4 + rand(i + 10) * (i % 3 === 0 ? 20 : 42),
        scale: 0.6 + rand(i + 20) * 1.1,
        dur: 90 + rand(i + 30) * 120,
        delay: rand(i + 40),
        depth: rand(i + 50),
        shape: i % 3,
      })),
    [],
  )

  return (
    <div className="absolute inset-0">
      {clouds.map((c, i) => {
        const duration = c.dur / windFactor
        return (
          <div
            key={i}
            className="sky-layer absolute left-0"
            style={{
              top: `${c.y}%`,
              opacity: i < count ? 0.55 + c.depth * 0.4 : 0,
              animation: `drift ${duration}s linear ${-c.delay * duration}s infinite`,
              filter: `blur(${c.depth < 0.35 ? 3 : 0.5}px)`,
            }}
          >
            <CloudShape shape={c.shape} scale={c.scale} light={light} shade={shade} id={i} />
          </div>
        )
      })}
    </div>
  )
}

function CloudShape({ shape, scale, light, shade, id }: { shape: number; scale: number; light: string; shade: string; id: number }) {
  const w = 220 * scale
  const gid = `cg-${id}`
  const blobs =
    shape === 0
      ? [[50, 62, 34], [92, 46, 44], [140, 56, 36], [176, 70, 24], [30, 76, 20]]
      : shape === 1
        ? [[60, 60, 30], [100, 50, 38], [145, 62, 28]]
        : [[40, 70, 22], [78, 56, 34], [122, 48, 40], [166, 62, 30], [196, 76, 18]]
  return (
    <svg width={w} height={w * 0.5} viewBox="0 0 220 110">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={shade} />
        </linearGradient>
      </defs>
      <g fill={`url(#${gid})`}>
        {blobs.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
        <rect x="24" y="66" width="176" height="30" rx="15" />
      </g>
    </svg>
  )
}

function Fog() {
  return (
    <div className="absolute inset-0">
      {[28, 40, 50].map((top, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: `${top}%`,
            left: '-20%',
            width: '160%',
            height: '18%',
            background: 'linear-gradient(90deg, transparent, rgba(230,222,250,0.45), rgba(230,222,250,0.25), transparent)',
            filter: 'blur(18px)',
            animation: `fog-roll ${30 + i * 12}s ease-in-out ${i * -7}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

/** Rain / drizzle / snow particles on a canvas, slanted by the wind. */
function Precipitation({ scene }: { scene: Scene }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { kind, precip, wind, phase } = scene

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const snow = kind === 'snow'
    const raining = kind === 'rain' || kind === 'storm' || kind === 'drizzle' || snow
    const intensity = raining ? Math.max(precip, kind === 'drizzle' ? 0.3 : 0.8) : 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let count = snow ? 60 + intensity * 50 : kind === 'drizzle' ? 90 : 60 + intensity * 90
    count = Math.min(reduced ? 60 : 420, raining ? count : 0)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.clientWidth
    const H = () => canvas.clientHeight
    const slant = Math.min(wind, 60) / 60 // 0..1
    const drops = Array.from({ length: count }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      len: snow ? 1.5 + Math.random() * 2.5 : kind === 'drizzle' ? 6 + Math.random() * 6 : 12 + Math.random() * 14,
      v: snow ? 0.6 + Math.random() * 0.9 : kind === 'drizzle' ? 7 + Math.random() * 3 : 12 + Math.random() * 8,
      phase: Math.random() * Math.PI * 2,
    }))
    const color = phase === 'night' ? 'rgba(190,200,255,' : 'rgba(235,235,255,'

    let raf = 0
    const tick = () => {
      ctx.clearRect(0, 0, W(), H())
      for (const d of drops) {
        if (snow) {
          d.phase += 0.02
          d.x += Math.sin(d.phase) * 0.6 + slant * 1.5
          d.y += d.v
          ctx.beginPath()
          ctx.fillStyle = `${color}0.85)`
          ctx.arc(d.x, d.y, d.len, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const dx = slant * d.len * 0.8
          d.x += slant * d.v * 0.6
          d.y += d.v
          ctx.beginPath()
          ctx.strokeStyle = `${color}${kind === 'drizzle' ? 0.35 : 0.5})`
          ctx.lineWidth = kind === 'drizzle' ? 1 : 1.3
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - dx, d.y - d.len)
          ctx.stroke()
        }
        if (d.y > H() + 20) {
          d.y = -20
          d.x = Math.random() * (W() + 100) - 50
        }
        if (d.x > W() + 50) d.x = -50
      }
      raf = requestAnimationFrame(tick)
    }
    if (count > 0) tick()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [kind, precip, wind, phase])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />
}

function Lightning() {
  const [flash, setFlash] = useState(0)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const schedule = () => {
      t = setTimeout(() => {
        setFlash(1)
        setTimeout(() => setFlash(0.3), 90)
        setTimeout(() => setFlash(0.9), 160)
        setTimeout(() => setFlash(0), 320)
        schedule()
      }, 5000 + Math.random() * 9000)
    }
    schedule()
    return () => clearTimeout(t)
  }, [])
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ background: 'rgba(230,225,255,0.55)', opacity: flash, transition: 'opacity 80ms' }}
    />
  )
}
