import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Bảo vệ route: nếu chưa đăng nhập → redirect về /login.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
