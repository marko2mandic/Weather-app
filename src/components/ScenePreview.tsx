import type { Phase, Scene } from '../lib/scene'
import type { Kind } from '../lib/wmo'
import type { SceneKind } from '../lib/place'

/** Hidden helper (open the app with ?preview) to flip through background weathers. */
export default function ScenePreview({
  scene,
  onChange,
  onReset,
  onNextLandmark,
  place,
  onPlace,
}: {
  scene: Scene
  onChange: (s: Scene) => void
  onReset: () => void
  onNextLandmark: () => void
  place: SceneKind
  onPlace: (k: SceneKind) => void
}) {
  const places: SceneKind[] = ['berlin', 'city', 'town', 'countryside', 'mountains', 'seaside']
  const kinds: Kind[] = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'storm', 'snow']
  const phases: Phase[] = ['dawn', 'day', 'dusk', 'night']
  const presets: Record<Kind, Partial<Scene>> = {
    clear: { cloud: 5, precip: 0 },
    partly: { cloud: 45, precip: 0 },
    cloudy: { cloud: 95, precip: 0 },
    fog: { cloud: 100, precip: 0 },
    drizzle: { cloud: 100, precip: 0.3 },
    rain: { cloud: 100, precip: 2.5 },
    storm: { cloud: 100, precip: 6 },
    snow: { cloud: 100, precip: 1 },
  }
  const arcFor: Record<Phase, number> = { dawn: 0.02, day: 0.45, dusk: 0.98, night: 0.5 }

  return (
    <div className="glass-deep fixed top-3 right-3 z-50 w-56 space-y-2 rounded-2xl p-3 text-[11px] font-bold">
      <div className="flex items-center justify-between">
        <span>Preview weather</span>
        <span className="flex gap-1">
          <button onClick={onNextLandmark} className="rounded-full bg-white/15 px-2 py-0.5 whitespace-nowrap">Landmark ›</button>
          <button onClick={onReset} className="rounded-full bg-white/15 px-2 py-0.5">Live</button>
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {phases.map((p) => (
          <button
            key={p}
            onClick={() => onChange({ ...scene, phase: p, arc: arcFor[p] })}
            className={`rounded-full px-2 py-0.5 capitalize ${scene.phase === p ? 'bg-white text-[#3a1d8a]' : 'bg-white/10'}`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => onChange({ ...scene, kind: k, ...presets[k] })}
            className={`rounded-full px-2 py-0.5 capitalize ${scene.kind === k ? 'bg-white text-[#3a1d8a]' : 'bg-white/10'}`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {places.map((p) => (
          <button
            key={p}
            onClick={() => onPlace(p)}
            className={`rounded-full px-2 py-0.5 capitalize ${place === p ? 'bg-white text-[#3a1d8a]' : 'bg-white/10'}`}
          >
            {p}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        Wind
        <input type="range" min={0} max={60} value={scene.wind} onChange={(e) => onChange({ ...scene, wind: +e.target.value })} className="slider flex-1" />
      </label>
    </div>
  )
}
