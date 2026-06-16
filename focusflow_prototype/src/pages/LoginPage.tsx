import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Leaf } from 'lucide-react'

interface LoginPageProps {
  onLoginSuccess: () => void
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: 'huyenT@example.com',
    password: 'password123',
    confirmPassword: '',
    name: 'Huyền Trang',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock login/signup
    onLoginSuccess()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4FAF4] via-white to-[#DDF3DF] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] flex items-center justify-center text-white">
              <Leaf size={20} />
            </div>
            <h1 className="text-3xl font-bold text-[#243024]">FocusFlow</h1>
          </div>
        </Link>

        {/* Card */}
        <div className="card-lg p-8">
          {/* Title */}
          <h2 className="text-h3 text-center text-[#243024] mb-2">{isLogin ? 'Đăng nhập' : 'Đăng ký'}</h2>
          <p className="text-center text-body-sm text-[#5F6E5F] mb-8">
            {isLogin ? 'Chào mừng quay lại FocusFlow' : 'Hãy bắt đầu hành trình tập trung của bạn'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-[#243024] mb-2">Tên của bạn</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nhập tên của bạn"
                  className="input-field w-full"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#243024] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5F6E5F]" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="input-field pl-10 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#243024] mb-2">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5F6E5F]" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10 w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#5F6E5F] hover:text-[#243024]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-[#243024] mb-2">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5F6E5F]" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="input-field pl-10 w-full"
                  />
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-[#5FAF6E]" />
                  <span className="text-sm text-[#5F6E5F]">Nhớ mật khẩu</span>
                </label>
                <a href="#" className="text-sm text-[#5FAF6E] hover:text-[#4a9354]">
                  Quên mật khẩu?
                </a>
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-6">
              {isLogin ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D9E6D9]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-[#5F6E5F]">hoặc</span>
            </div>
          </div>

          {/* OAuth */}
          <button
            type="button"
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            {/* Google Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Đăng {isLogin ? 'nhập' : 'ký'} với Google
          </button>

          {/* Toggle */}
          <p className="text-center text-body-sm text-[#6f6c69] mt-6">
            {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#e34432] font-medium hover:text-[#cf3520]"
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </div>

        {/* Footer Note */}
        <p className="text-center text-body-sm text-[#6f6c69] mt-8">
          Bằng cách {isLogin ? 'đăng nhập' : 'đăng ký'}, bạn đồng ý với{' '}
          <a href="#" className="text-[#e34432] hover:text-[#cf3520]">
            Điều khoản dịch vụ
          </a>{' '}
          và{' '}
          <a href="#" className="text-[#e34432] hover:text-[#cf3520]">
            Chính sách bảo mật
          </a>
        </p>
      </div>
    </div>
  )
}
