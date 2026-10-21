import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import POSPage from './pages/POSPage'
import EnrollPage from './pages/EnrollPage'
import CustomerDisplayPage from './pages/CustomerDisplayPage'
import LiteHomePage from './pages/lite/LiteHomePage'
import PosNotifyHost from './components/ui/PosNotifyHost'
import { usePosStore } from './store/posStore'
import { getEnrollment } from './lib/device'
import { posNotifyWarning } from './lib/posNotify'
import SingleTabGuard from './components/ui/SingleTabGuard'
import { useEffect } from 'react'

const qc = new QueryClient()

function RequireEnrollment({ children }) {
  const enrollment = getEnrollment()
  if (!enrollment) return <Navigate to="/enroll" replace />
  return children
}

/** API rejected our token (expired, or this staff logged in on another terminal). */
function SessionEndedListener() {
  useEffect(() => {
    const onEnded = (e) => {
      const { cashier, logout } = usePosStore.getState()
      if (!cashier) return
      logout()
      posNotifyWarning(
        /expired/i.test(e.detail || '')
          ? 'You were signed out — this staff logged in on another terminal, or the session expired.'
          : (e.detail || 'You were signed out.'),
        { title: 'Signed out' },
      )
    }
    window.addEventListener('pos-session-ended', onEnded)
    return () => window.removeEventListener('pos-session-ended', onEnded)
  }, [])
  return null
}

function RequireAuth({ children }) {
  const cashier = usePosStore(s => s.cashier)
  if (!cashier) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <PosNotifyHost />
      <SessionEndedListener />
      <SingleTabGuard>
      <BrowserRouter>
        <Routes>
          <Route path="/enroll" element={<EnrollPage />} />
          <Route path="/" element={
            <RequireEnrollment>
              <LoginPage />
            </RequireEnrollment>
          } />
          <Route path="/pos" element={
            <RequireAuth>
              <POSPage />
            </RequireAuth>
          } />
          {/* Customer display — no auth required; opened on second screen / tablet */}
          <Route path="/customer-display" element={<CustomerDisplayPage />} />
          {/* Lite POS — opened via LITE_VERSION_PIN on the login screen */}
          <Route path="/lite" element={<LiteHomePage />} />
<Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      </SingleTabGuard>
    </QueryClientProvider>
  )
}
