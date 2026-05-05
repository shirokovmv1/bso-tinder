import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/feed',    label: 'Лента',   icon: TabFeed },
  { to: '/match',   label: 'Мэтч',    icon: TabMatch },
  { to: '/profile', label: 'Профиль', icon: TabProfile },
]

function TabFeed({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" fill={active ? '#FF6B00' : 'currentColor'} />
      <rect x="13" y="3" width="8" height="8" rx="2" fill={active ? '#FF6B00' : 'currentColor'} opacity="0.5" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill={active ? '#FF6B00' : 'currentColor'} opacity="0.5" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill={active ? '#FF6B00' : 'currentColor'} />
    </svg>
  )
}

function TabMatch({ active }: { active: boolean }) {
  const c = active ? '#FF6B00' : 'currentColor'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 21C12 21 3 15.5 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-9 12-9 12z" fill={c} />
    </svg>
  )
}

function TabProfile({ active }: { active: boolean }) {
  const c = active ? '#FF6B00' : 'currentColor'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill={c} />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-graphite-800 border-t border-graphite-700 safe-bottom">
      <div className="flex">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center gap-1 pt-3 pb-2 transition-colors"
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span
                  className={`text-[10px] font-body font-medium transition-colors ${
                    isActive ? 'text-orange-500' : 'text-graphite-400'
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-500 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
