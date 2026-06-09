import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLoader } from './components/AppLoader'
import { NotificationContainer } from './components/Notification'
import { PlanModal } from './components/PlanModal'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { VerifyEmail } from './pages/VerifyEmail'
import { Dashboard } from './pages/Dashboard'
import { Ingredients } from './pages/Ingredients'
import { Recipes } from './pages/Recipes'
import { RecipeDetail } from './pages/RecipeDetail'
import { Stock } from './pages/Stock'
import { NotFound } from './pages/NotFound'
import { isAuthenticated, isEmailVerified } from './lib/auth'
import { subscribeLoading, subscribePlanUpgrade } from './lib/api'
import { useAppStore } from './store/useAppStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (!isEmailVerified()) return <Navigate to="/verify-email" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  return !isAuthenticated() ? <>{children}</> : <Navigate to="/dashboard" replace />
}

function UnverifiedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (isEmailVerified()) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function App() {
  const setLoading = useAppStore(s => s.setLoading)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [planModalMessage, setPlanModalMessage] = useState<string | null>(null)

  useEffect(() => subscribeLoading(setLoading), [setLoading])
  useEffect(() => subscribePlanUpgrade(msg => {
    setPlanModalMessage(msg)
    setPlanModalOpen(true)
  }), [])

  return (
    <BrowserRouter>
      <AppLoader />
      <NotificationContainer />
      <PlanModal visible={planModalOpen} message={planModalMessage} onClose={() => { setPlanModalOpen(false); setPlanModalMessage(null) }} />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        <Route path="/verify-email" element={<UnverifiedRoute><VerifyEmail /></UnverifiedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/ingredients" element={<ProtectedRoute><Ingredients /></ProtectedRoute>} />
        <Route path="/recipes" element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
        <Route path="/recipes/:id" element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
