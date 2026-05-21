import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import POSPage from './pages/POSPage'
import EnrollPage from './pages/EnrollPage'
import { usePosStore } from './store/posStore'
import { getEnrollment } from './lib/device'

const qc = new QueryClient()

function RequireEnrollment({ children }) {
  const enrollment = getEnrollment()
  if (!enrollment) return <Navigate to="/enroll" replace />
  return children
}

function RequireAuth({ children }) {
  const cashier = usePosStore(s => s.cashier)
  if (!cashier) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
