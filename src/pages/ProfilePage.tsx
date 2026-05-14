import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import BottomNav from '@/components/ui/BottomNav'

const TONES: Record<string, string> = {
  team_player:    '#FF6B00',
  digital_artist: '#9B59B6',
  wild_tracker:   '#27AE60',
  life_of_party:  '#E74C3C',
  eco_hacker:     '#16A085',
  cybersportsman: '#2980B9',
  explorer:       '#F39C12',
  romantic:       '#E91E63',
  networker:      '#3498DB',
  allrounder:     '#8E44AD',
}

export default function ProfilePage() {
  const { currentUser, logout, isAdmin } = useAppStore()
  const navigate = useNavigate()

  if (!currentUser) return null

  const badgeColor = TONES[currentUser.badge_id ?? 'allrounder'] ?? '#FF6B00'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-full flex flex-col bg-radial-orange pb-28 overflow-y-auto scrollbar-none">
      <div className="mx-auto w-full max-w-md px-5 pt-14">
        <h1 className="text-[34px] font-black leading-tight tracking-tight mb-8 fade-up">Профиль</h1>

        {/* Аватар */}
        <div className="flex flex-col items-center gap-4 mb-8 fade-up" style={{ animationDelay: '60ms' }}>
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 bg-graphite-700 grid place-items-center"
            style={{ background: `linear-gradient(135deg, ${badgeColor}66, ${badgeColor}33)` }}>
            {currentUser.avatar_url && !currentUser.avatar_url.includes('dicebear.com') ? (
              <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/60 text-sm font-medium">Фото</span>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-[22px] font-black tracking-tight">{currentUser.name ?? '—'}</h2>
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/50 mt-1">{currentUser.department ?? '—'}</p>
            <p className="text-[13px] font-medium text-white/40 mt-0.5">{currentUser.email}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 fade-up" style={{ animationDelay: '120ms' }}>
          {isAdmin && (
            <button onClick={() => navigate('/admin')}
              className="w-full glass-2 rounded-2xl p-4 flex items-center gap-3 press-shrink ease-spring transition">
              <span className="text-xl">🔧</span>
              <div className="text-left">
                <div className="font-bold text-[15px]">Админ-панель</div>
                <div className="text-[12px] text-white/50">Пользователи, логи, настройки</div>
              </div>
              <span className="ml-auto text-white/30 text-xl">›</span>
            </button>
          )}

          <button onClick={() => navigate('/onboarding')}
            className="w-full glass-1 rounded-2xl p-4 flex items-center gap-3 press-shrink ease-spring transition hover:bg-white/10">
            <span className="text-xl">✏️</span>
            <div className="text-left">
              <div className="font-bold text-[15px]">Редактировать профиль</div>
              <div className="text-[12px] text-white/50">Имя, хобби, фото</div>
            </div>
            <span className="ml-auto text-white/30 text-xl">›</span>
          </button>

          <button onClick={handleLogout}
            className="w-full glass-1 rounded-2xl p-4 flex items-center gap-3 press-shrink ease-spring transition hover:bg-white/10">
            <span className="text-xl">🚪</span>
            <div className="font-bold text-[15px] text-danger">Выйти</div>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
