import type { LocMode } from '../lib/location'

export default function LocationToggle({ mode, onChange }: { mode: LocMode; onChange: (m: LocMode) => void }) {
  return (
    <div className="glass flex rounded-full p-1 text-xs font-bold">
      {(['home', 'gps'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
            mode === m ? 'bg-white text-[#3a1d8a] shadow' : 'text-white/75'
          }`}
        >
          {m === 'home' ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
          )}
          {m === 'home' ? 'Home' : 'GPS'}
        </button>
      ))}
    </div>
  )
}
