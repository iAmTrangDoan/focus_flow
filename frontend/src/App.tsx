import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

// Pages
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import Dashboard from './pages/Dashboard'

// Components
import ProtectedRoute from './components/common/ProtectedRoute'
import DashboardLayout from './components/common/Sidebar'

export default function App() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage)

  // Hydrate auth state from localStorage on first mount
  useEffect(() => {
    initFromStorage()
  }, [initFromStorage])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

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

        {/* Placeholder routes for future pages */}
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="card-lg p-8 text-center text-[#5F6E5F]">
                  <p className="text-h4 mb-2">Quản lý công việc</p>
                  <p>Trang đang phát triển...</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <div className="card-lg p-8 text-center text-[#5F6E5F]">
                  <p className="text-h4 mb-2">Lịch trình</p>
                  <p>Trang đang phát triển...</p>
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
                <div className="card-lg p-8 text-center text-[#5F6E5F]">
                  <p className="text-h4 mb-2">Focus Timer</p>
                  <p>Trang đang phát triển...</p>
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
                <div className="card-lg p-8 text-center text-[#5F6E5F]">
                  <p className="text-h4 mb-2">AI Planner</p>
                  <p>Trang đang phát triển...</p>
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
                <div className="card-lg p-8 text-center text-[#5F6E5F]">
                  <p className="text-h4 mb-2">Analytics</p>
                  <p>Trang đang phát triển...</p>
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
                <div className="card-lg p-8 text-center text-[#5F6E5F]">
                  <p className="text-h4 mb-2">Cài đặt</p>
                  <p>Trang đang phát triển...</p>
                </div>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Root → redirect to dashboard if logged in, else login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-[#F4FAF4]">
              <div className="text-center">
                <p className="text-6xl font-bold text-[#5FAF6E] mb-4">404</p>
                <p className="text-h4 mb-6">Không tìm thấy trang</p>
                <a href="/dashboard" className="btn-primary">
                  Quay về Dashboard
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
