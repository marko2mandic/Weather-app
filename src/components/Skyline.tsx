import { useMemo } from 'react'
import { LAND, skyGroup, type LandColors, type Scene } from '../lib/scene'
import { ALL_SCENES, type SceneId } from '../lib/landmarks'

/*
 * Berlin landmark scenes. Each landmark is its own SVG (viewBox 300×240, ground at y=236),
 * placed right of centre so the big temperature on the left doesn't collide with it.
 * All six stay mounted and cross-fade when the landmark rotates.
 * Colours come from LAND[phase][weather]; the "lit" gradient puts the bright edge
 * on whichever side the sun/moon currently is.
 */

const GLOW = '#ffd98a'
const GROUND_LINE = '50vh'

interface Look {
  c: LandColors
  lit: boolean // windows / floodlights on
  snow: boolean
  wet: boolean
  night: boolean
  id: string
}

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export default function Skyline({ scene, active }: { scene: Scene; active: SceneId }) {
  const group = skyGroup(scene)
  const c = LAND[scene.phase][group]
  const night = scene.phase === 'night'
  // Lights come on at dusk/night, and early on gloomy wet mornings
  const lit = night || scene.phase === 'dusk' || (group === 'wet' && scene.phase === 'dawn')
  const lightFromLeft = scene.arc < 0.5
  const river = ALL_SCENES.find((l) => l.id === active)?.river ?? false
  const snow = group === 'snow'
  const ground = snow ? (night ? '#3a3670' : '#d6cff0') : c.near

  return (
    <>
      {/* Far city: a full-width repeating band so wide screens have a skyline edge to edge */}
      <FarCity color={c.far} lit={lit} show={!RURAL.has(active)} />

      {/* Landmark stage */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: `calc(100vh - ${GROUND_LINE} - 2px)`, width: 'min(100vw, 520px)', height: '40vh' }}
      >
        {ALL_SCENES.map((l) => (
          <svg
            key={l.id}
            viewBox="0 0 300 240"
            preserveAspectRatio="xMidYMax meet"
            className="absolute inset-0 h-full w-full"
            style={{ opacity: l.id === active ? 1 : 0, transition: 'opacity 3s ease' }}
          >
            <defs>
              <linearGradient id={`lit-${l.id}`} x1={lightFromLeft ? 0 : 1} y1="0" x2={lightFromLeft ? 1 : 0} y2="0.3">
                {/* narrow rim of light on the sun side, solid silhouette elsewhere */}
                <stop offset="0%" stopColor={c.accent} stopOpacity={night ? 0.5 : 0.8} />
                <stop offset="22%" stopColor={c.mid} />
                <stop offset="100%" stopColor={c.mid} />
              </linearGradient>
              <linearGradient id={`gold-${l.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={night && !lit ? '#9c8448' : '#ffe08a'} />
                <stop offset="100%" stopColor={night && !lit ? '#5a4420' : '#c8902c'} />
              </linearGradient>
              <radialGradient id={`flood-${l.id}`}>
                <stop offset="0%" stopColor={GLOW} stopOpacity="0.55" />
                <stop offset="100%" stopColor={GLOW} stopOpacity="0" />
              </radialGradient>
            </defs>
            <Landmark id={l.id} look={{ c, lit, snow, wet: group === 'wet', night, id: l.id }} />
          </svg>
        ))}
      </div>

      {/* Ground (or the Spree) from the horizon down; the cards scroll over it */}
      <div className="absolute inset-x-0 bottom-0" style={{ top: GROUND_LINE, background: ground, transition: 'background 2.5s' }}>
        <div
          className="absolute inset-x-0 top-0 overflow-hidden"
          style={{
            height: '9vh',
            opacity: river ? 1 : 0,
            transition: 'opacity 3s ease, background 2.5s',
            background: `linear-gradient(180deg, ${c.water}, ${c.near})`,
          }}
        >
          {[18, 38, 58, 78].map((top, i) => (
            <span
              key={i}
              className="absolute h-[2px] rounded-full"
              style={{
                top: `${top}%`,
                left: `${10 + i * 17}%`,
                width: `${22 + (i % 2) * 14}%`,
                background: lit ? GLOW : c.accent,
                opacity: 0.35,
                animation: `shimmer ${3 + i}s ease-in-out ${-i}s infinite`,
              }}
            />
          ))}
        </div>
        {/* wet pavement sheen */}
        <div
          className="absolute inset-x-0 top-0 h-[6vh]"
          style={{
            opacity: group === 'wet' && !river ? 0.5 : 0,
            transition: 'opacity 2.5s',
            background: `linear-gradient(180deg, ${c.accent}55, transparent)`,
          }}
        />
      </div>
    </>
  )
}

// Scenes without a city behind them
const RURAL = new Set<SceneId>(['countryside', 'mountains', 'seaside'])

function FarCity({ color, lit, show }: { color: string; lit: boolean; show: boolean }) {
  const windows = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({ x: 4 + rand(i + 900) * 170, y: 44 + rand(i + 950) * 60, on: rand(i + 990) > 0.4 })),
    [],
  )
  return (
    <svg
      className="absolute inset-x-0 w-full"
      style={{ bottom: `calc(100vh - ${GROUND_LINE})`, height: 110, opacity: show ? 1 : 0, transition: 'opacity 3s ease' }}
    >
      <defs>
        <pattern id="farcity" width="180" height="110" patternUnits="userSpaceOnUse">
          <path
            d="M0 110 V62 H14 V50 H30 V70 H44 V40 H58 V56 H76 V66 H92 V46 H104 V58 H122 V36 H134 V60 H150 V52 H166 V68 H180 V110 Z"
            fill={color}
            style={{ transition: 'fill 2.5s' }}
          />
          {windows.map((w, i) => (
            <rect key={i} x={w.x} y={w.y} width="2.5" height="3" fill={GLOW} style={{ opacity: lit && w.on ? 0.7 : 0, transition: 'opacity 3s' }} />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="110" fill="url(#farcity)" opacity="0.85" />
    </svg>
  )
}

function Landmark({ id, look }: { id: SceneId; look: Look }) {
  switch (id) {
    case 'city':
      return <City {...look} />
    case 'town':
      return <Town {...look} />
    case 'countryside':
      return <Countryside {...look} />
    case 'mountains':
      return <Mountains {...look} />
    case 'seaside':
      return <Seaside {...look} />
    case 'tvtower':
      return <TvTower {...look} />
    case 'gate':
      return <Gate {...look} />
    case 'reichstag':
      return <Reichstag {...look} />
    case 'oberbaum':
      return <Oberbaum {...look} />
    case 'victory':
      return <Victory {...look} />
    case 'dom':
      return <Dom {...look} />
  }
}

/* ---------- shared bits ---------- */

const tr = { transition: 'fill 2.5s, opacity 2.5s' }

function Trees({ c, snow, list }: { c: LandColors; snow: boolean; list: [number, number, number][] }) {
  return (
    <g>
      {list.map(([cx, cy, r], i) => (
        <g key={i}>
          <rect x={cx - 1.5} y={cy} width="3" height={236 - cy} fill={c.near} style={tr} />
          <circle cx={cx} cy={cy - r * 0.5} r={r} fill={c.near} style={tr} />
          {snow && <path d={`M${cx - r * 0.8} ${cy - r * 0.9} Q${cx} ${cy - r * 1.6} ${cx + r * 0.8} ${cy - r * 0.9}`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
        </g>
      ))}
    </g>
  )
}

function Windows({ lit, list, w = 2.4, h = 3.2 }: { lit: boolean; list: [number, number][]; w?: number; h?: number }) {
  return (
    <g>
      {list.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="0.4" fill={GLOW} style={{ opacity: lit && rand(x * 7 + y) > 0.25 ? 0.9 : 0, transition: 'opacity 3s' }} />
      ))}
    </g>
  )
}

function Lamp({ x, lit, c }: { x: number; lit: boolean; c: LandColors }) {
  return (
    <g>
      <rect x={x - 0.6} y="210" width="1.2" height="26" fill={c.near} style={tr} />
      <circle cx={x} cy="209" r="2.2" fill={lit ? GLOW : c.near} style={tr} />
      {lit && <circle cx={x} cy="209" r="9" fill={GLOW} opacity="0.18" />}
    </g>
  )
}

/** White caps on roofs/ledges when it snows. */
function Snow({ show, d }: { show: boolean; d: string }) {
  if (!show) return null
  return <path d={d} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.95" />
}

const grid = (x0: number, x1: number, y0: number, y1: number, dx: number, dy: number) => {
  const out: [number, number][] = []
  for (let y = y0; y <= y1; y += dy) for (let x = x0; x <= x1; x += dx) out.push([x, y])
  return out
}

/* ---------- 1. Fernsehturm, Alexanderplatz ---------- */
function TvTower({ c, lit, snow, id }: Look) {
  const fill = `url(#lit-${id})`
  return (
    <g>
      {/* Park Inn tower */}
      <rect x="112" y="140" width="28" height="96" fill={fill} style={tr} />
      <Windows lit={lit} list={grid(116, 134, 146, 228, 6, 7)} />
      {/* Haus des Lehrers */}
      <rect x="250" y="196" width="46" height="40" fill={c.mid} style={tr} />
      <Windows lit={lit} list={grid(254, 290, 202, 226, 6, 8)} />
      {/* the tower */}
      <rect x="204" y="4" width="2" height="44" fill={fill} style={tr} />
      <rect x="204" y="4" width="2" height="7" fill="#e85a5a" opacity={lit ? 0 : 0.7} />
      <rect x="202.5" y="46" width="5" height="32" fill={fill} style={tr} />
      <circle cx="205" cy="92" r="15" fill={fill} style={tr} />
      <rect x="191" y="89" width="28" height="3" rx="1.5" fill={lit ? GLOW : c.accent} opacity={lit ? 0.9 : 0.45} style={tr} />
      <rect x="198" y="106" width="14" height="4" rx="1" fill={c.mid} style={tr} />
      <path d="M200 110 L210 110 L214 222 L196 222 Z" fill={fill} style={tr} />
      <path d="M168 236 L176 222 L184 236 L192 222 L200 236 L208 222 L216 236 L224 222 L232 236 L240 222 L248 236 Z" fill={c.mid} style={tr} />
      {lit && <circle cx="205" cy="4" r="2" fill="#ff5b6e" style={{ animation: 'twinkle 2s ease-in-out infinite' }} />}
      <Snow show={snow} d="M112 140 H140 M250 196 H296 M192 85 Q205 74 218 85" />
      <Trees c={c} snow={snow} list={[[150, 226, 9], [242, 228, 8], [286, 226, 9]]} />
    </g>
  )
}

/* ---------- 2. Brandenburger Tor ---------- */
function Gate({ c, lit, snow, id }: Look) {
  const fill = `url(#lit-${id})`
  const cols = [149, 169, 189, 213, 233, 253]
  return (
    <g>
      {lit && <ellipse cx="205" cy="190" rx="80" ry="55" fill={`url(#flood-${id})`} />}
      {/* guardhouses */}
      <rect x="120" y="202" width="22" height="34" fill={c.mid} style={tr} />
      <path d="M118 202 L131 194 L144 202 Z" fill={c.mid} style={tr} />
      <rect x="268" y="202" width="22" height="34" fill={c.mid} style={tr} />
      <path d="M266 202 L279 194 L292 202 Z" fill={c.mid} style={tr} />
      {/* gate */}
      <rect x="143" y="228" width="124" height="8" fill={fill} style={tr} />
      {cols.map((x) => (
        <rect key={x} x={x} y="184" width="7" height="44" fill={fill} style={tr} />
      ))}
      <rect x="143" y="172" width="124" height="12" fill={fill} style={tr} />
      <rect x="143" y="180" width="124" height="1.5" fill={c.accent} opacity="0.4" style={tr} />
      <path d="M160 172 L160 160 L168 156 L242 156 L250 160 L250 172 Z" fill={fill} style={tr} />
      {/* quadriga (copper green) */}
      <g fill="#5fae96" opacity={lit ? 0.9 : 0.75}>
        <rect x="191" y="150" width="28" height="6" fill={fill} style={tr} />
        {[192, 198, 204, 210].map((x, i) => (
          <path key={x} d={`M${x} 150 L${x} 142 L${x + 2.5} ${137 + (i % 2)} L${x + 6} 138.5 L${x + 5} 143 L${x + 5.5} 150 Z`} />
        ))}
        <rect x="203.5" y="124" width="3" height="18" />
        <path d="M204 128 L195 119 L203 132 Z M206 128 L215 119 L207 132 Z" />
        <line x1="206" y1="126" x2="212" y2="114" stroke="#5fae96" strokeWidth="1.2" />
        <circle cx="212.5" cy="113" r="2.4" fill="none" stroke="#5fae96" strokeWidth="1.1" />
      </g>
      <Snow show={snow} d="M160 156 H250 M143 172 H267 M120 202 L131 194 L142 202 M268 202 L279 194 L290 202" />
      <Lamp x={136} lit={lit} c={c} />
      <Lamp x={274} lit={lit} c={c} />
      <Trees c={c} snow={snow} list={[[104, 222, 13], [298, 224, 11]]} />
    </g>
  )
}

/* ---------- 3. Reichstag ---------- */
function Reichstag({ c, lit, snow, night, id }: Look) {
  const fill = `url(#lit-${id})`
  return (
    <g>
      {/* glass dome (glows at night) */}
      {lit && <circle cx="205" cy="166" r="34" fill={`url(#flood-${id})`} />}
      <path d="M183 186 Q183 150 205 147 Q227 150 227 186 Z" fill={lit ? GLOW : c.accent} opacity={lit ? 0.75 : 0.4} style={tr} />
      <g stroke={c.mid} strokeWidth="0.9" fill="none" style={tr}>
        <path d="M183 186 Q183 150 205 147 Q227 150 227 186" />
        <path d="M205 147 L190 186 M205 147 L198 186 M205 147 L212 186 M205 147 L220 186 M187 162 H223 M184 174 H226" />
      </g>
      {/* body + towers */}
      <rect x="134" y="186" width="142" height="50" fill={fill} style={tr} />
      <rect x="130" y="172" width="24" height="64" fill={fill} style={tr} />
      <rect x="256" y="172" width="24" height="64" fill={fill} style={tr} />
      <rect x="128" y="170" width="28" height="4" fill={c.mid} style={tr} />
      <rect x="254" y="170" width="28" height="4" fill={c.mid} style={tr} />
      {/* portico */}
      <path d="M177 190 L205 178 L233 190 Z" fill={c.mid} style={tr} />
      <rect x="179" y="190" width="52" height="6" fill={c.mid} style={tr} />
      {[183, 191, 199, 207, 215, 223].map((x) => (
        <rect key={x} x={x} y="196" width="4" height="32" fill={c.accent} opacity={night ? 0.25 : 0.45} style={tr} />
      ))}
      <rect x="180" y="228" width="50" height="8" fill={c.mid} style={tr} />
      <Windows lit={lit} list={[...grid(158, 174, 196, 214, 6, 14), ...grid(236, 252, 196, 214, 6, 14), ...grid(135, 149, 180, 222, 7, 12), ...grid(261, 275, 180, 222, 7, 12)]} />
      {/* flags */}
      <rect x="141" y="150" width="1.2" height="22" fill={c.mid} style={tr} />
      <rect x="268" y="150" width="1.2" height="22" fill={c.mid} style={tr} />
      {[142.2, 269.2].map((x) => (
        <g key={x} className="flag" style={{ transformOrigin: `${x}px 150px`, opacity: night && !lit ? 0.5 : 0.9 }}>
          <rect x={x} y="150" width="12" height="2.6" fill="#1a1a1a" />
          <rect x={x} y="152.6" width="12" height="2.6" fill="#d8352f" />
          <rect x={x} y="155.2" width="12" height="2.6" fill="#f2c218" />
        </g>
      ))}
      <Snow show={snow} d="M128 170 H156 M254 170 H282 M134 186 H183 M227 186 H276 M177 190 L205 178 L233 190" />
      <Trees c={c} snow={snow} list={[[114, 226, 10], [296, 226, 10]]} />
    </g>
  )
}

/* ---------- 4. Oberbaumbrücke (with the yellow U1) ---------- */
function Oberbaum({ c, lit, snow, night, id }: Look) {
  const fill = `url(#lit-${id})`
  const brick = night ? 0.18 : 0.42
  const pillars = Array.from({ length: 34 }, (_, i) => i * 9).filter((x) => x < 178 || x > 232)
  const arches = [18, 54, 90, 126, 162, 248, 284]
  return (
    <g>
      {/* U-Bahn on the upper deck (drawn first so the arcade pillars pass in front) */}
      <g className="ubahn">
        <rect x="0" y="191" width="34" height="9" rx="2" fill="#f6c23e" />
        <rect x="36" y="191" width="34" height="9" rx="2" fill="#f6c23e" />
        {[3, 10, 17, 24, 39, 46, 53, 60].map((x) => (
          <rect key={x} x={x} y="193" width="5" height="3" fill={lit ? '#fff4c0' : '#7a5a1a'} opacity="0.85" />
        ))}
      </g>
      {/* upper arcade */}
      <rect x="0" y="186" width="300" height="3" fill={fill} style={tr} />
      {pillars.map((x) => (
        <rect key={x} x={x} y="189" width="3" height="15" fill={fill} style={tr} />
      ))}
      {/* lower deck + arches into the water */}
      <rect x="0" y="204" width="300" height="32" fill={fill} style={tr} />
      <rect x="0" y="186" width="300" height="50" fill="#b8473f" opacity={brick} style={{ mixBlendMode: 'soft-light' }} />
      {arches.map((cx) => (
        <ellipse key={cx} cx={cx} cy="236" rx="14" ry="20" fill={c.water} style={tr} />
      ))}
      <ellipse cx="205" cy="236" rx="18" ry="24" fill={c.water} style={tr} />
      {/* the two towers */}
      {[184, 210].map((x) => (
        <g key={x}>
          <rect x={x} y="128" width="16" height="76" fill={fill} style={tr} />
          <rect x={x} y="128" width="16" height="76" fill="#b8473f" opacity={brick} style={{ mixBlendMode: 'soft-light' }} />
          <rect x={x - 2} y="122" width="20" height="6" fill={c.mid} style={tr} />
          <rect x={x - 2} y="114" width="3" height="8" fill={c.mid} style={tr} />
          <rect x={x + 15} y="114" width="3" height="8" fill={c.mid} style={tr} />
          <path d={`M${x} 122 L${x + 8} 100 L${x + 16} 122 Z`} fill={fill} style={tr} />
          <rect x={x + 6.5} y="138" width="3" height="10" rx="1.5" fill={lit ? GLOW : c.near} opacity={lit ? 0.9 : 0.5} style={tr} />
          <rect x={x + 6.5} y="160" width="3" height="10" rx="1.5" fill={lit ? GLOW : c.near} opacity={lit ? 0.9 : 0.5} style={tr} />
        </g>
      ))}
      <Snow show={snow} d="M0 186 H178 M232 186 H300 M182 122 H202 M208 122 H228" />
    </g>
  )
}

/* ---------- 5. Siegessäule, Tiergarten ---------- */
function Victory({ c, lit, snow, id }: Look) {
  const fill = `url(#lit-${id})`
  const gold = `url(#gold-${id})`
  return (
    <g>
      {/* Tiergarten tree line */}
      <path d="M90 236 V214 Q100 204 112 212 Q122 200 136 210 Q150 202 162 212 L248 212 Q262 200 276 210 Q290 202 300 210 V236 Z" fill={c.far} style={tr} />
      {lit && <ellipse cx="205" cy="80" rx="26" ry="30" fill={`url(#flood-${id})`} />}
      <rect x="183" y="222" width="44" height="14" fill={fill} style={tr} />
      <rect x="188" y="204" width="34" height="18" fill={fill} style={tr} />
      {[191, 197, 203, 209, 215].map((x) => (
        <rect key={x} x={x + 1.5} y="207" width="2.2" height="14" fill={c.near} opacity="0.55" style={tr} />
      ))}
      <rect x="199" y="106" width="12" height="98" fill={fill} style={tr} />
      {[128, 150, 172].map((y) => (
        <rect key={y} x="197" y={y} width="16" height="4" rx="1" fill={gold} />
      ))}
      <rect x="196" y="100" width="18" height="6" fill={c.mid} style={tr} />
      <rect x="198" y="96" width="14" height="4" fill={c.mid} style={tr} />
      {/* Goldelse */}
      <g fill={gold}>
        <path d="M202 96 L208 96 L207 78 L203 78 Z" />
        <circle cx="205" cy="75" r="2.4" />
        <path d="M203 82 L193 70 L202 86 Z M207 82 L217 70 L208 86 Z" />
      </g>
      <line x1="207" y1="78" x2="213" y2="66" stroke="#e8b84a" strokeWidth="1.2" />
      <circle cx="213.6" cy="65" r="2.2" fill="none" stroke="#e8b84a" strokeWidth="1.1" />
      <Snow show={snow} d="M196 100 H214 M188 204 H222 M183 222 H227" />
      <Trees c={c} snow={snow} list={[[118, 222, 14], [142, 226, 11], [162, 230, 8], [250, 228, 9], [270, 222, 14], [292, 226, 11]]} />
      {/* a little playground in the park */}
      <g fill={c.near} style={tr}>
        <path d="M40 236 L48 214 L49.5 214 L43 236 Z M74 236 L66 214 L67.5 214 L77 236 Z" />
        <rect x="47" y="212.5" width="21" height="2" rx="1" />
        <rect x="53" y="214.5" width="0.6" height="13" />
        <rect x="60" y="214.5" width="0.6" height="13" />
        <rect x="52" y="227" width="9" height="1.6" rx="0.8" />
      </g>
    </g>
  )
}

/* ---------- 6. Berliner Dom ---------- */
function Dom({ c, lit, snow, night, id }: Look) {
  const fill = `url(#lit-${id})`
  const copper = { fill: '#4fae8e', opacity: night ? 0.25 : 0.6, mixBlendMode: 'soft-light' as const }
  const dome = 'M182 152 Q182 116 205 112 Q228 116 228 152 Z'
  const left = 'M138 152 Q138 136 149 134 Q160 136 160 152 Z'
  const right = 'M250 152 Q250 136 261 134 Q272 136 272 152 Z'
  return (
    <g>
      {/* Fernsehturm far behind, left */}
      <g fill={c.far} style={tr}>
        <rect x="92" y="96" width="1.2" height="26" />
        <rect x="91" y="118" width="3" height="16" />
        <circle cx="92.5" cy="138" r="5.5" />
        <path d="M90.5 143 L94.5 143 L96 200 L89 200 Z" />
      </g>
      {lit && <ellipse cx="205" cy="150" rx="70" ry="50" fill={`url(#flood-${id})`} />}
      <rect x="140" y="180" width="130" height="56" fill={fill} style={tr} />
      <rect x="185" y="150" width="40" height="30" fill={fill} style={tr} />
      {[189, 196, 203, 210, 217].map((x) => (
        <rect key={x} x={x} y="156" width="3" height="18" rx="1.5" fill={lit ? GLOW : c.near} opacity={lit ? 0.7 : 0.45} style={tr} />
      ))}
      {[dome, left, right].map((d) => (
        <g key={d}>
          <path d={d} fill={fill} style={tr} />
          <path d={d} style={copper} />
        </g>
      ))}
      <rect x="140" y="150" width="18" height="30" fill={fill} style={tr} />
      <rect x="252" y="150" width="18" height="30" fill={fill} style={tr} />
      <rect x="201" y="96" width="8" height="16" fill={fill} style={tr} />
      <path d="M200 97 Q200 89 205 88 Q210 89 210 97 Z" fill={fill} style={tr} />
      <rect x="204.4" y="76" width="1.2" height="12" fill="#e8b84a" />
      <rect x="201.5" y="80" width="7" height="1.2" fill="#e8b84a" />
      <rect x="147.5" y="126" width="3" height="9" fill={fill} style={tr} />
      <rect x="259.5" y="126" width="3" height="9" fill={fill} style={tr} />
      <path d="M195 236 L195 212 Q205 200 215 212 L215 236 Z" fill={c.near} opacity="0.6" style={tr} />
      {[172, 180, 230, 238].map((x) => (
        <rect key={x} x={x} y="190" width="3" height="46" fill={c.accent} opacity={night ? 0.15 : 0.3} style={tr} />
      ))}
      <Windows lit={lit} list={[...grid(148, 164, 192, 216, 8, 12), ...grid(246, 262, 192, 216, 8, 12)]} w={3} h={6} />
      <Snow show={snow} d="M186 128 Q205 108 224 128 M141 142 Q149 132 157 142 M253 142 Q261 132 269 142 M140 180 H185 M225 180 H270" />
    </g>
  )
}

/* ================= Generic scenes (anywhere outside Berlin) ================= */

/* ---------- City: a cluster of towers ---------- */
function City({ c, lit, snow, id }: Look) {
  const fill = `url(#lit-${id})`
  const towers: [number, number, number][] = [
    [118, 168, 26],
    [146, 124, 26],
    [175, 84, 24],
    [202, 108, 32],
    [237, 146, 24],
    [264, 174, 30],
  ]
  return (
    <g>
      {towers.map(([x, y, w]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={236 - y} fill={fill} style={tr} />
          <Windows lit={lit} list={grid(x + 4, x + w - 6, y + 6, 228, 6, 7)} />
        </g>
      ))}
      {/* antenna + stepped crown */}
      <rect x="186" y="58" width="2" height="26" fill={fill} style={tr} />
      {lit && <circle cx="187" cy="58" r="1.8" fill="#ff5b6e" style={{ animation: 'twinkle 2s ease-in-out infinite' }} />}
      <path d="M206 108 L206 100 L214 100 L214 92 L226 92 L226 100 L234 100 L234 108 Z" fill={fill} style={tr} />
      <Snow show={snow} d="M118 168 H144 M146 124 H172 M175 84 H199 M206 100 H234 M237 146 H261 M264 174 H294" />
      <Trees c={c} snow={snow} list={[[108, 228, 8], [298, 228, 8]]} />
    </g>
  )
}

/* ---------- Town: church spire and gabled houses ---------- */
function Town({ c, lit, snow, id }: Look) {
  const fill = `url(#lit-${id})`
  const houses = [116, 142, 252, 276]
  return (
    <g>
      {houses.map((x, i) => {
        const h = i % 2 ? 30 : 36
        return (
          <g key={x}>
            <rect x={x} y={236 - h} width="22" height={h} fill={c.mid} style={tr} />
            <path d={`M${x - 2} ${238 - h} L${x + 11} ${222 - h} L${x + 24} ${238 - h} Z`} fill={fill} style={tr} />
            <Windows lit={lit} list={[[x + 5, 244 - h], [x + 14, 244 - h], [x + 5, 254 - h]]} w={3} h={4} />
            <Snow show={snow} d={`M${x - 1} ${237 - h} L${x + 11} ${223 - h} L${x + 23} ${237 - h}`} />
          </g>
        )
      })}
      {/* church */}
      <rect x="170" y="190" width="50" height="46" fill={fill} style={tr} />
      <path d="M166 192 L195 172 L224 192 Z" fill={c.mid} style={tr} />
      <rect x="220" y="140" width="20" height="96" fill={fill} style={tr} />
      <path d="M218 142 L230 92 L242 142 Z" fill={fill} style={tr} />
      <rect x="229.4" y="80" width="1.2" height="12" fill={c.mid} style={tr} />
      <rect x="226.5" y="84" width="7" height="1.2" fill={c.mid} style={tr} />
      <circle cx="230" cy="156" r="4.5" fill={lit ? GLOW : c.accent} opacity={lit ? 0.9 : 0.55} style={tr} />
      <Windows lit={lit} list={[[178, 204], [188, 204], [198, 204], [208, 204]]} w={4} h={10} />
      <Snow show={snow} d="M167 191 L195 173 L223 191 M219 141 L230 94 L241 141" />
      <Trees c={c} snow={snow} list={[[100, 226, 11], [168, 230, 7], [298, 226, 10]]} />
    </g>
  )
}

/* ---------- Countryside: hills, farm and a turning windmill ---------- */
function Countryside({ c, lit, snow, id }: Look) {
  const fill = `url(#lit-${id})`
  return (
    <g>
      <path d="M60 236 Q130 168 200 210 Q250 182 300 200 V236 Z" fill={snow ? '#e6e0f6' : c.far} opacity={snow ? 0.9 : 1} style={tr} />
      <path d="M90 236 Q190 204 300 220 V236 Z" fill={snow ? '#d6cff0' : c.near} style={tr} />
      {/* farmhouse + barn */}
      <rect x="150" y="206" width="34" height="24" fill={c.mid} style={tr} />
      <path d="M146 208 L167 192 L188 208 Z" fill={fill} style={tr} />
      <rect x="190" y="202" width="30" height="28" fill={c.mid} style={tr} />
      <path d="M186 204 L205 188 L224 204 Z" fill={fill} style={tr} />
      <rect x="200" y="214" width="10" height="16" fill={c.accent} opacity="0.35" style={tr} />
      <Windows lit={lit} list={[[156, 214], [170, 214]]} w={4} h={5} />
      <Snow show={snow} d="M147 207 L167 193 L187 207 M187 203 L205 189 L223 203" />
      {/* windmill */}
      <path d="M248 228 L252 172 L262 172 L266 228 Z" fill={fill} style={tr} />
      <rect x="249" y="166" width="16" height="8" rx="2" fill={c.mid} style={tr} />
      <g className="windmill" style={{ transformOrigin: '257px 170px' }}>
        {[0, 90, 180, 270].map((a) => (
          <g key={a} transform={`rotate(${a} 257 170)`}>
            <rect x="255.8" y="134" width="2.4" height="36" fill={c.mid} style={tr} />
            <rect x="258.2" y="136" width="6" height="28" fill={c.accent} opacity="0.45" style={tr} />
          </g>
        ))}
        <circle cx="257" cy="170" r="2.5" fill={c.mid} />
      </g>
      {/* fence */}
      <path d="M96 230 H146 M100 224 V234 M112 224 V234 M124 224 V234 M136 224 V234" stroke={c.near} strokeWidth="1.6" style={tr} />
      <Trees c={c} snow={snow} list={[[120, 214, 10], [290, 212, 9]]} />
    </g>
  )
}

/* ---------- Mountains: snowy peaks, pines and a chalet ---------- */
function Mountains({ c, lit, snow, id }: Look) {
  const fill = `url(#lit-${id})`
  const pine = (x: number, s: number) =>
    `M${x} ${236 - 34 * s} L${x - 9 * s} ${236 - 14 * s} L${x - 4 * s} ${236 - 14 * s} L${x - 11 * s} 236 L${x + 11 * s} 236 L${x + 4 * s} ${236 - 14 * s} L${x + 9 * s} ${236 - 14 * s} Z`
  return (
    <g>
      <path d="M70 236 L120 160 L150 196 L190 112 L232 178 L262 140 L300 186 V236 Z" fill={c.far} style={tr} />
      <path d="M190 112 L178 132 L186 128 L192 136 L200 128 L206 134 Z" fill="#fff" opacity="0.75" />
      <path d="M262 140 L254 152 L260 150 L265 155 L272 150 Z" fill="#fff" opacity="0.7" />
      <path d="M130 236 L212 118 L300 236 Z" fill={fill} style={tr} />
      {/* summits keep their snow all year */}
      <path d="M212 118 L195 143 L204 139 L211 148 L220 139 L230 145 Z" fill="#fff" opacity="0.95" />
      {snow && <path d="M150 210 L170 206 L190 214 L214 204 L240 212 L270 206" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />}
      {/* chalet */}
      <rect x="166" y="216" width="26" height="20" fill={c.mid} style={tr} />
      <path d="M162 218 L179 204 L196 218 Z" fill={c.near} style={tr} />
      <Windows lit={lit} list={[[171, 223], [182, 223]]} w={4} h={5} />
      <Snow show={snow} d="M163 217 L179 205 L195 217" />
      {[
        [120, 0.9],
        [140, 0.7],
        [250, 0.8],
        [272, 1],
        [292, 0.75],
      ].map(([x, s]) => (
        <g key={x}>
          <path d={pine(x, s)} fill={c.near} style={tr} />
          {snow && <path d={`M${x - 6 * s} ${236 - 18 * s} L${x} ${236 - 32 * s} L${x + 6 * s} ${236 - 18 * s}`} stroke="#fff" strokeWidth="2" fill="none" />}
        </g>
      ))}
    </g>
  )
}

/* ---------- Seaside: lighthouse, dunes and a bobbing sailboat ---------- */
function Seaside({ c, lit, snow, night, id }: Look) {
  const fill = `url(#lit-${id})`
  return (
    <g>
      {/* dunes */}
      <path d="M150 236 Q190 214 230 224 Q265 206 300 220 V236 Z" fill={snow ? '#e6e0f6' : c.far} style={tr} />
      <path d="M176 236 Q186 226 196 236 M260 236 Q268 224 276 236" stroke={c.near} strokeWidth="1.4" fill="none" style={tr} />
      {/* lighthouse beam at night */}
      {lit && (
        <g className="beam" style={{ transformOrigin: '232px 144px' }}>
          <path d="M232 144 L120 126 L120 162 Z" fill={GLOW} opacity="0.22" />
        </g>
      )}
      <path d="M222 226 L226 150 L238 150 L242 226 Z" fill={fill} style={tr} />
      <path d="M224.9 170 L239.1 170 L239.6 182 L224.4 182 Z M223.8 196 L240.2 196 L240.7 208 L223.3 208 Z" fill="#d8352f" opacity={night ? 0.35 : 0.7} />
      <rect x="224" y="138" width="16" height="12" fill={c.mid} style={tr} />
      <rect x="226.5" y="140" width="11" height="8" fill={lit ? GLOW : c.accent} opacity={lit ? 0.95 : 0.5} style={tr} />
      <path d="M222 138 L232 128 L242 138 Z" fill={c.mid} style={tr} />
      <rect x="218" y="226" width="28" height="10" fill={c.mid} style={tr} />
      <Snow show={snow} d="M223 137 L232 129 L241 137" />
      {/* sailboat */}
      <g className="bob">
        <path d="M118 230 L152 230 L146 237 L124 237 Z" fill={c.mid} style={tr} />
        <rect x="134" y="196" width="1.4" height="34" fill={c.mid} style={tr} />
        <path d="M136 198 L136 228 L156 228 Z" fill={c.accent} opacity="0.8" style={tr} />
        <path d="M133 202 L133 228 L118 228 Z" fill={c.accent} opacity="0.55" style={tr} />
      </g>
      {/* gulls */}
      <path d="M160 120 q4 -4 8 0 q4 -4 8 0 M186 106 q3 -3 6 0 q3 -3 6 0" stroke={c.mid} strokeWidth="1.4" fill="none" strokeLinecap="round" style={tr} />
    </g>
  )
}
