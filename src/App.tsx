import { useEffect, useState } from 'react'
import Background from './components/Background'
import LocationToggle from './components/LocationToggle'
import ScenePreview from './components/ScenePreview'
import TabBar, { type Tab } from './components/TabBar'
import HouseholdSheet, { AccountButton } from './components/HouseholdSheet'
import InstallCard from './components/InstallCard'
import { useInstall } from './lib/install'
import { useLocation } from './lib/location'
import { useHousehold } from './lib/household'
import { useTuning } from './lib/learning'
import { useSettings } from './lib/settings'
import { useLandmark } from './lib/landmarks'
import { usePlaceInfo, type SceneKind } from './lib/place'
import { sceneFromWeather, type Scene } from './lib/scene'
import { useWeather } from './lib/weather'
import { fmtDate, fmtDay } from './lib/format'
import Now from './tabs/Now'
import ThreeDays from './tabs/ThreeDays'
import Dress from './tabs/Dress'
import Tips from './tabs/Tips'

const FALLBACK_SCENE: Scene = { phase: 'day', kind: 'partly', cloud: 40, precip: 0, wind: 8, arc: 0.4 }
const showPreview = new URLSearchParams(location.search).has('preview')

export default function App() {
  const [tab, setTab] = useState<Tab>('now')
  const { mode, setMode, place, gpsError, home, setHome, locateOnce } = useLocation()
  const { weather, error } = useWeather(place?.lat ?? null, place?.lon ?? null)
  const hh = useHousehold()
  const { tuning, giveFeedback, localTuning } = useTuning(hh)
  const { settings, ageMonths, update: updateSettings } = useSettings(hh)
  const [sheetOpen, setSheetOpen] = useState(false)
  const install = useInstall()
  const [override, setOverride] = useState<Scene | null>(null)
  const [placeOverride, setPlaceOverride] = useState<SceneKind | null>(null)
  const { landmark, next: nextLandmark } = useLandmark()
  const info = usePlaceInfo(place?.lat ?? null, place?.lon ?? null, weather?.elevation)
  // No home yet → the Home button opens Settings to set one
  const chooseMode = (m: typeof mode) => (m === 'home' && !home ? setSheetOpen(true) : setMode(m))

  // Re-derive the scene every minute so the sun/moon moves and phases change on their own.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60e3)
    return () => clearInterval(id)
  }, [])
  const live = weather ? sceneFromWeather(weather) : FALLBACK_SCENE
  void tick
  const scene = override ?? live

  // Berlin → rotating landmarks; anywhere else → a generic scene that fits the landscape.
  const kind: SceneKind = placeOverride ?? info?.kind ?? 'berlin'
  const inBerlin = kind === 'berlin'
  const backdrop = inBerlin ? landmark.id : kind
  const chip = inBerlin ? { name: landmark.name, area: landmark.area } : { name: info?.name ?? 'Here', area: info?.region ?? '' }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  const title =
    mode === 'home' ? (place?.name ?? 'Home') : info && info.name !== 'Here' ? info.name : place ? 'Here' : gpsError ? 'Weather' : 'Locating…'
  const subtitle = mode === 'home' ? place?.sub : place ? `Current location${info?.region ? ` · ${info.region}` : ''}` : ''

  return (
    <>
      <Background scene={scene} landmark={backdrop} />
      {showPreview && (
        <ScenePreview
          scene={scene}
          onChange={setOverride}
          onReset={() => {
            setOverride(null)
            setPlaceOverride(null)
          }}
          onNextLandmark={nextLandmark}
          place={kind}
          onPlace={setPlaceOverride}
        />
      )}

      <main className="mx-auto max-w-md px-4 pb-32" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
        <header className="flex items-start justify-between gap-3 pt-4 pb-2">
          <div className="min-w-0">
            <h1 className="text-shadow truncate text-[28px] leading-tight font-extrabold">{title}</h1>
            <p className="text-shadow text-[15px] text-white/75">
              {fmtDate(Date.now())}, <span className="font-extrabold text-white">{fmtDay(Date.now())}</span>
            </p>
            <p className="text-shadow truncate text-xs text-white/55">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <LocationToggle mode={mode} onChange={chooseMode} />
            <AccountButton hh={hh} onClick={() => setSheetOpen(true)} />
          </div>
        </header>

        {((gpsError && place) || error) && (
          <div className="glass mb-3 rounded-2xl px-4 py-2 text-sm text-amber-100">
            {gpsError ?? `Couldn't refresh: ${error}${weather ? ' (showing last saved forecast)' : ''}`}
          </div>
        )}

        {!place && gpsError ? (
          <section className="glass mt-6 rounded-[28px] p-6 text-center">
            <div className="text-4xl">📍</div>
            <h2 className="mt-2 text-xl font-extrabold">Where are you?</h2>
            <p className="mt-1 text-sm text-white/70">Allow location access, or set your home address to see the weather around you.</p>
            <button onClick={() => setSheetOpen(true)} className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-extrabold text-[#3a1d8a]">
              Set home
            </button>
          </section>
        ) : !weather || !place ? (
          <div className="grid h-[50vh] place-items-center text-white/70">{place ? 'Loading the sky…' : 'Finding your location…'}</div>
        ) : (
          <div key={tab}>
            {tab === 'now' && place && (
              <Now weather={weather} lat={place.lat} lon={place.lon} landmark={chip} onNextLandmark={inBerlin ? nextLandmark : undefined} />
            )}
            {tab === 'days' && <ThreeDays weather={weather} />}
            {tab === 'dress' && (
              <Dress weather={weather} tuning={tuning} onFeedback={giveFeedback} onShare={() => setSheetOpen(true)} ageMonths={ageMonths} />
            )}
            {tab === 'tips' && place && (
              <Tips
                weather={weather}
                tuning={tuning}
                onFeedback={giveFeedback}
                ageMonths={ageMonths}
                radiusKm={settings.radiusKm}
                lat={place.lat}
                lon={place.lon}
                scene={kind}
                onSettings={() => setSheetOpen(true)}
              />
            )}
          </div>
        )}
      </main>

      {install.available && !install.dismissed && (
        <div className="fixed inset-x-0 z-20 mx-auto max-w-md px-4" style={{ bottom: 'calc(max(10px, env(safe-area-inset-bottom)) + 84px)' }}>
          <InstallCard api={install} compact />
        </div>
      )}
      <TabBar tab={tab} onChange={setTab} />
      {sheetOpen && (
        <HouseholdSheet
          hh={hh}
          tuning={tuning}
          localTuning={localTuning}
          settings={settings}
          ageMonths={ageMonths}
          onSettings={updateSettings}
          install={install}
          home={home}
          onSetHome={setHome}
          locateOnce={locateOnce}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
