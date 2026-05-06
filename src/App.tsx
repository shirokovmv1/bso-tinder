import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { api } from '@/api/client'

import LoginPage      from '@/pages/LoginPage'
import OnboardingPage from '@/pages/OnboardingPage'
import FeedPage       from '@/pages/FeedPage'
import MatchPage      from '@/pages/MatchPage'
import ProfilePage    from '@/pages/ProfilePage'
import AdminPage      from '@/pages/AdminPage'

// ── Magic-Link interceptor ───────────────────────────────────────────────────
// Срабатывает при наличии ?magic=<token> в URL — ДО рендера любой страницы.
function MagicLinkHandler({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(false)
  const { setToken } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const magic = params.get('magic')
    if (!magic) return

    setChecking(true)
    api.magicLogin(magic)
      .then(({ token, user }) => {
        setToken(token, user)
        navigate('/feed', { replace: true })
      })
      .catch(() => navigate('/login?magic_error=1', { replace: true }))
      .finally(() => setChecking(false))
  // Запускаем только один раз при монтировании
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-page)' }}
      >
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Вход по ссылке…
        </span>
      </div>
    )
  }

  return <>{children}</>
}

function SessionBootstrap() {
  const { token, setCurrentUser, logout } = useAppStore()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!token || params.get('magic')) return

    api.getMe()
      .then((user) => setCurrentUser(user))
      .catch(() => logout())
  }, [location.search, logout, setCurrentUser, token])

  return null
}

// ── AuthGuard ────────────────────────────────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, currentUser } = useAppStore()
  const location = useLocation()

  if (!token) return <Navigate to="/login" replace />

  const onboardingDone = Boolean(currentUser?.onboarding_done)
  const isOnboardingRoute = location.pathname === '/onboarding'

  if (!onboardingDone && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

// ── AdminGuard ───────────────────────────────────────────────────────────────
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { token, isAdmin } = useAppStore()

  if (!token)   return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/feed"  replace />

  return <>{children}</>
}

// ── Root redirect ─────────────────────────────────────────────────────────────
function RootRedirect() {
  const { token, currentUser } = useAppStore()

  if (!token)                           return <Navigate to="/login"      replace />
  if (!currentUser?.onboarding_done)    return <Navigate to="/onboarding" replace />
  return                                       <Navigate to="/feed"       replace />
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <MagicLinkHandler>
        <SessionBootstrap />
        <Routes>
          <Route path="/"           element={<RootRedirect />} />
          <Route path="/login"      element={<LoginPage />} />

          <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />
          <Route path="/feed"       element={<AuthGuard><FeedPage /></AuthGuard>} />
          <Route path="/match"      element={<AuthGuard><MatchPage /></AuthGuard>} />
          <Route path="/profile"    element={<AuthGuard><ProfilePage /></AuthGuard>} />
          <Route path="/admin"      element={<AdminGuard><AdminPage /></AdminGuard>} />

          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </MagicLinkHandler>
    </BrowserRouter>
  )
}
