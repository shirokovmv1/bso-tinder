import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import OnboardingPage from '@/pages/OnboardingPage'
import FeedPage from '@/pages/FeedPage'
import MatchPage from '@/pages/MatchPage'
import ProfilePage from '@/pages/ProfilePage'

export default function App() {
  const currentUser = useAppStore((s) => s.currentUser)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={currentUser ? '/feed' : '/onboarding'} replace />}
        />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/match" element={<MatchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
