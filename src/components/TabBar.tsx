import type { ReactNode } from 'react'

export type Tab = 'now' | 'days' | 'dress' | 'tips'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: 'now',
    label: 'Now',
    icon: (
      <path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M17 7l1.4-1.4M8.5 13.5a4 4 0 1 1 7.6-1.8 3.5 3.5 0 0 1 .4 7H9a3 3 0 0 1-.5-5.2z" />
    ),
  },
  {
    id: 'days',
    label: '3 days',
    icon: <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2" />,
  },
  {
    id: 'dress',
    label: 'Dress',
    icon: <path d="M9 3l-5 3 2 4 2-1v11h8V9l2 1 2-4-5-3a3 3 0 0 1-6 0z" />,
  },
  {
    id: 'tips',
    label: 'Tips',
    icon: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
  },
]

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="glass-deep fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-[28px] px-4 pt-2"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
    >
      <ul className="flex justify-around">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <li key={t.id}>
              <button
                onClick={() => onChange(t.id)}
                className={`flex min-w-16 flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-xs transition ${
                  active ? 'font-extrabold text-white' : 'font-semibold text-white/55 hover:text-white/80'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full transition ${
                    active ? 'bg-white/20 shadow-[0_0_20px_rgba(200,170,255,0.45)]' : ''
                  }`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {t.icon}
                  </svg>
                </span>
                {t.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
