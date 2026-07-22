import { useEffect, useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

// Pages
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import Dashboard from './pages/Dashboard'
import LandingPage from './pages/Landing'
import TaskBoardPage from './pages/TaskBoard'
import ProfilePage from './pages/Profile'
import AIInsightsPage from './pages/AIInsights'
import FocusSessionsPage from './pages/FocusSession'
import AnalyticsPage from './pages/Analytics'
import SchedulePage from './pages/Schedule'
import SettingsPage from './pages/Settings'
import NotificationsPage from './pages/Notifications'

// Components
import ProtectedRoute from './components/common/ProtectedRoute'
import DashboardLayout from './components/common/Sidebar'
import { ToastContainer, type ToastMessage } from './components/common/Toast'
import type { UserProfile } from './types'
import { HelpCircle } from 'lucide-react'

import socketService from './services/socket.service'
import { createToast } from './components/common/Toast'

export default function App() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUser = useAuthStore((s) => s.user)
  const setUserInStore = useAuthStore((s) => s.setUser)

  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((t: ToastMessage) => {
    setToasts((prev) => [...prev, t])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Hydrate auth state from localStorage on first mount
  useEffect(() => {
    initFromStorage()
  }, [initFromStorage])

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('accessToken')
      if (token) {
        socketService.connect(token)
        // Lắng nghe realtime notifications
        socketService.onNotification((data: any) => {
          addToast(createToast('success', `🔔 ${data.title}: ${data.description}`))
        })
      }
    } else {
      socketService.disconnect()
    }

    return () => {
      socketService.disconnect()
    }
  }, [isAuthenticated, addToast])


  // Adapter for UserProfile
  const profileUser: UserProfile = {
    name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User',
    email: currentUser?.email || '',
    avatarUrl: null,
    streak: 5,
  }

  const handleUserChange = (updated: UserProfile) => {
    if (currentUser) {
      setUserInStore({
        ...currentUser,
        displayName: updated.name,
      })
    }
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LandingPage />
              )
            }
          />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <RegisterPage />
              )
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TaskBoardPage onToast={addToast} />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProfilePage
                    user={profileUser}
                    onUserChange={handleUserChange}
                    onToast={addToast}
                  />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Schedule */}
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SchedulePage onToast={addToast} />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Keep /calendar as alias for schedule for backward compat */}
          <Route path="/calendar" element={<Navigate to="/schedule" replace />} />

          {/* Focus (Pomodoro) */}
          <Route
            path="/focus"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FocusSessionsPage onToast={addToast} />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* AI Insights */}
          <Route
            path="/ai-insights"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AIInsightsPage onToast={addToast} />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Keep /ai-planner as alias */}
          <Route path="/ai-planner" element={<Navigate to="/ai-insights" replace />} />

          {/* Analytics */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AnalyticsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Notifications */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NotificationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage onToast={addToast} />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Help & Support Placeholder */}
          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                    <div
                      className="flex items-center justify-center rounded-3xl mb-5"
                      style={{ width: 72, height: 72, background: '#DDF3DF' }}
                    >
                      <HelpCircle size={36} style={{ color: '#5FAF6E' }} />
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: '#243024' }}>Trợ giúp & Hỗ trợ</h2>
                    <p className="text-sm max-w-md" style={{ color: '#5F6E5F' }}>
                      Cảm ơn bạn đã sử dụng FocusFlow. Nếu bạn gặp bất kỳ khó khăn nào hoặc có góp ý, xin vui lòng gửi email về <a href="mailto:support@focusflow.com" className="font-semibold underline" style={{ color: '#5FAF6E' }}>support@focusflow.com</a>.
                    </p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-[#F4FAF4]">
                <div className="text-center">
                  <p className="text-6xl font-bold text-[#5FAF6E] mb-4">404</p>
                  <p className="text-xl font-semibold mb-6">Không tìm thấy trang</p>
                  <a href="/dashboard" className="px-6 py-2.5 bg-[#5FAF6E] text-white rounded-[14px] font-medium hover:bg-[#4a9354] transition-colors">
                    Quay về Dashboard
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
