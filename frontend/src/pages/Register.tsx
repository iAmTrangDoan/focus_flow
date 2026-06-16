import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Leaf, Loader2, CheckCircle2 } from 'lucide-react'
import authService from '../services/auth.service'
import useAuthStore from '../store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<typeof formData>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    if (error) setError(null)
  }

  const validate = () => {
    const errs: Partial<typeof formData> = {}
    if (!formData.displayName.trim()) errs.displayName = 'Vui lòng nhập tên của bạn.'
    if (!formData.email) errs.email = 'Vui lòng nhập email.'
    if (formData.password.length < 6) errs.password = 'Mật khẩu phải có ít nhất 6 ký tự.'
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName.trim(),
      })
      authService.saveSession(response)
      setUser(response.user)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Đăng ký thất bại. Vui lòng thử lại.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength =
    formData.password.length === 0 ? 0
    : formData.password.length < 6 ? 1
    : formData.password.length < 10 ? 2
    : 3

  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Mạnh'][passwordStrength]
  const strengthColor = ['', 'bg-[#E8745B]', 'bg-[#F7B536]', 'bg-[#5FAF6E]'][passwordStrength]

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
          <h2 className="text-2xl font-bold text-center text-[#243024] mb-1">Đăng ký</h2>
          <p className="text-center text-body-sm mb-8">Bắt đầu hành trình tập trung của bạn 🚀</p>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-[12px] bg-red-50 border border-red-200 text-sm text-[#E8745B]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-[#243024] mb-2">Tên của bạn</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6E5F]" size={18} />
                <input
                  id="register-name"
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className={`input-field pl-10 w-full ${fieldErrors.displayName ? 'input-error' : ''}`}
                  autoComplete="name"
                />
              </div>
              {fieldErrors.displayName && (
                <p className="mt-1 text-xs text-[#E8745B]">{fieldErrors.displayName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[#243024] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6E5F]" size={18} />
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className={`input-field pl-10 w-full ${fieldErrors.email ? 'input-error' : ''}`}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-[#E8745B]">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[#243024] mb-2">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6E5F]" size={18} />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Ít nhất 6 ký tự"
                  className={`input-field pl-10 pr-10 w-full ${fieldErrors.password ? 'input-error' : ''}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6E5F] hover:text-[#243024]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {/* Strength bar */}
              {formData.password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength ? strengthColor : 'bg-[#D9E6D9]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#5F6E5F]">{strengthLabel}</span>
                </div>
              )}
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-[#E8745B]">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-[#243024] mb-2">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F6E5F]" size={18} />
                <input
                  id="register-confirm"
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`input-field pl-10 pr-10 w-full ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                  autoComplete="new-password"
                />
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <CheckCircle2
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5FAF6E]"
                  />
                )}
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-[#E8745B]">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </form>

          {/* Switch to Login */}
          <p className="text-center text-sm text-[#5F6E5F] mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-[#5FAF6E] font-semibold hover:text-[#4a9354]">
              Đăng nhập
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-body-sm mt-6">
          Bằng cách đăng ký, bạn đồng ý với{' '}
          <a href="#" className="text-[#5FAF6E]">Điều khoản dịch vụ</a>
          {' '}và{' '}
          <a href="#" className="text-[#5FAF6E]">Chính sách bảo mật</a>
        </p>
      </div>
    </div>
  )
}
