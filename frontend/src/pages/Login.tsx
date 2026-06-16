import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Leaf, Loader2 } from 'lucide-react'
import authService from '../services/auth.service'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await authService.login(formData)
      authService.saveSession(response)
      setUser(response.user)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Email hoặc mật khẩu không đúng. Vui lòng thử lại.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4FAF4] via-white to-[#DDF3DF] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] flex items-center justify-center text-white shadow-sm">
              <Leaf size={20} />
            </div>
            <h1 className="text-3xl font-bold text-[#243024]">FocusFlow</h1>
          </div>
        </Link>

        {/* Card */}
        <div className="card-lg p-8 shadow-md">
          <h2 className="text-2xl font-bold text-center text-[#243024] mb-1">Đăng nhập</h2>
          <p className="text-center text-body-sm mb-8">Chào mừng quay lại FocusFlow 👋</p>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-[12px] bg-red-50 border border-red-200 text-sm text-[#E8745B]">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#243024] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6E5F]" size={18} />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="input-field pl-10 w-full"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[#243024] mb-2">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6E5F]" size={18} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10 w-full"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6E5F] hover:text-[#243024]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#5FAF6E]" />
                <span className="text-sm text-[#5F6E5F]">Nhớ mật khẩu</span>
              </label>
              <a href="#" className="text-sm text-[#5FAF6E] hover:text-[#4a9354]">
                Quên mật khẩu?
              </a>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D9E6D9]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-[#5F6E5F]">hoặc</span>
            </div>
          </div>

          {/* Switch to Register */}
          <p className="text-center text-sm text-[#5F6E5F]">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-[#5FAF6E] font-semibold hover:text-[#4a9354]">
              Đăng ký ngay
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-body-sm mt-6">
          Bằng cách đăng nhập, bạn đồng ý với{' '}
          <a href="#" className="text-[#5FAF6E]">Điều khoản dịch vụ</a>
          {' '}và{' '}
          <a href="#" className="text-[#5FAF6E]">Chính sách bảo mật</a>
        </p>
      </div>
    </div>
  )
}
