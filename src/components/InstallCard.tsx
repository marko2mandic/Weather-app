import type { InstallApi } from '../lib/install'

/** "Add to home screen": one-tap on Android, step-by-step on iPhone. */
export default function InstallCard({ api, compact = false }: { api: InstallApi; compact?: boolean }) {
  if (!api.available) return null

  return (
    <div className={`flex items-start gap-3 rounded-2xl ${compact ? 'glass-deep p-3 shadow-xl' : 'bg-white/8 px-4 py-3'}`}>
      <img src={`${import.meta.env.BASE_URL}pwa-64x64.png`} alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-extrabold">Install the app</div>
        {api.canPrompt ? (
          <p className="text-white/70">Opens full screen from your home screen, and works offline with the last forecast.</p>
        ) : (
          <p className="text-white/70">
            In Safari, tap <ShareIcon /> <b className="text-white">Share</b>, then <b className="text-white">Add to Home Screen</b>.
          </p>
        )}
        {api.canPrompt && (
          <button onClick={api.install} className="mt-2 rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-[#3a1d8a]">
            Install
          </button>
        )}
      </div>
      {compact && (
        <button onClick={api.dismiss} className="-m-1 p-1 text-white/50 hover:text-white" aria-label="Dismiss">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  )
}

function ShareIcon() {
  return (
    <svg className="inline -translate-y-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}
