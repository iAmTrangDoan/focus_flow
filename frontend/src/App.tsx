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

// Components
import ProtectedRoute from './components/common/ProtectedRoute'
import DashboardLayout from './components/common/Sidebar'
import { ToastContainer, type ToastMessage } from './components/common/Toast'
import type { UserProfile } from './types'

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

          {/* Placeholder routes for future pages */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                    <div
                      className="flex items-center justify-center rounded-3xl mb-5"
                      style={{ width: 72, height: 72, background: '#DDF3DF' }}
                    >
                      <span className="text-3xl">🚧</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: '#243024' }}>Lịch trình</h2>
                    <p className="text-sm" style={{ color: '#5F6E5F' }}>Tính năng này đang được phát triển.</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/focus"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                    <div
                      className="flex items-center justify-center rounded-3xl mb-5"
                      style={{ width: 72, height: 72, background: '#DDF3DF' }}
                    >
                      <span className="text-3xl">🚧</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: '#243024' }}>Pomodoro Sessions</h2>
                    <p className="text-sm" style={{ color: '#5F6E5F' }}>Tính năng này đang được phát triển.</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-planner"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                    <div
                      className="flex items-center justify-center rounded-3xl mb-5"
                      style={{ width: 72, height: 72, background: '#DDF3DF' }}
                    >
                      <span className="text-3xl">🚧</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: '#243024' }}>AI Insights</h2>
                    <p className="text-sm" style={{ color: '#5F6E5F' }}>Tính năng này đang được phát triển.</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                    <div
                      className="flex items-center justify-center rounded-3xl mb-5"
                      style={{ width: 72, height: 72, background: '#DDF3DF' }}
                    >
                      <span className="text-3xl">🚧</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: '#243024' }}>Analytics</h2>
                    <p className="text-sm" style={{ color: '#5F6E5F' }}>Tính năng này đang được phát triển.</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                    <div
                      className="flex items-center justify-center rounded-3xl mb-5"
                      style={{ width: 72, height: 72, background: '#DDF3DF' }}
                    >
                      <span className="text-3xl">🚧</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: '#243024' }}>Cài đặt</h2>
                    <p className="text-sm" style={{ color: '#5F6E5F' }}>Tính năng này đang được phát triển.</p>
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
