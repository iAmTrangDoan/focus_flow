import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import authService from '../services/auth.service';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const setError = useAuthStore((s) => s.setError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const emailError = submitted && !email.trim();
  const passwordError = submitted && !password.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      authService.saveSession(response);
      setUser(response.user);
      if (response.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setServerError(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const heatmapColors = ['#DDF3DF', '#9BD4A5', '#5FAF6E', '#3D8B50'];
  const heatmapData = Array.from({ length: 21 }, (_, i) => heatmapColors[i % 4]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4FAF4' }}>
      {/* Floating top navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid #F4FAF4',
        }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 32, background: '#5FAF6E' }}
          >
            <Leaf size={16} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="text-base font-bold" style={{ color: '#243024' }}>
            FocusFlow
          </span>
        </Link>
        <a
          href="#"
          className="text-sm font-medium transition-colors duration-150 hover:opacity-80"
          style={{ color: '#5F6E5F' }}
        >
          Need help?
        </a>
      </nav>

      {/* Split screen */}
      <div className="flex flex-1 pt-12">
        {/* LEFT PANEL */}
        <div
          className="hidden lg:flex flex-col items-center justify-center w-1/2 p-12"
          style={{ background: '#DDF3DF' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: '#5FAF6E' }}
            >
              <Leaf size={20} color="#fff" strokeWidth={2.2} />
            </div>
            <span className="text-2xl font-bold" style={{ color: '#243024' }}>
              FocusFlow
            </span>
          </div>

          {/* Stat card */}
          <div
            className="mt-12 p-8"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 4px 24px 0 rgba(36,48,36,0.10)',
              maxWidth: 320,
              width: '100%',
            }}
          >
            <p className="text-base font-semibold mb-5" style={{ color: '#243024' }}>
              Your Focus, This Week
            </p>
            <div className="grid grid-cols-7 gap-2 mb-5">
              {heatmapData.map((c, i) => (
                <div
                  key={i}
                  className="rounded-md"
                  style={{ width: 32, height: 32, background: c }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: '🔥', text: '5-day streak' },
                { icon: '⏱', text: '18.5 hrs focused' },
                { icon: '✅', text: '24 tasks done' },
              ].map((chip) => (
                <span
                  key={chip.text}
                  className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{ background: '#F4FAF4', color: '#5F6E5F' }}
                >
                  {chip.icon} {chip.text}
                </span>
              ))}
            </div>
          </div>

          <p
            className="mt-10 text-sm italic text-center leading-relaxed max-w-xs"
            style={{ color: '#5F6E5F' }}
          >
            "The secret of getting ahead is getting started." — Mark Twain
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-1 items-center justify-center p-6 lg:p-8">
          <div
            className="w-full max-w-md p-8 lg:p-10"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 8px 40px 0 rgba(36,48,36,0.10)',
            }}
          >
            <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>
              Welcome back 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
              Log in to continue your focus journey.
            </p>

            {serverError && (
              <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: '#F6D8C7', color: '#C1644C' }}>
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
              {/* Email */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#243024' }}
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#9CA3AF' }}
                  />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border py-3 pr-4 pl-10 text-sm transition-all duration-150 outline-none"
                    style={{
                      borderColor: emailError ? '#C1644C' : '#D1D5DB',
                      color: '#243024',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#5FAF6E';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(95,175,110,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = emailError ? '#C1644C' : '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {emailError && (
                  <p className="text-xs mt-1.5" style={{ color: '#C1644C' }}>
                    This field is required.
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: '#243024' }}>
                    Password
                  </label>
                  <a
                    href="#"
                    className="text-xs transition-colors duration-150 hover:underline"
                    style={{ color: '#5FAF6E' }}
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#9CA3AF' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border py-3 pr-10 pl-10 text-sm transition-all duration-150 outline-none"
                    style={{
                      borderColor: passwordError ? '#C1644C' : '#D1D5DB',
                      color: '#243024',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#5FAF6E';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(95,175,110,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = passwordError ? '#C1644C' : '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#9CA3AF' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs mt-1.5" style={{ color: '#C1644C' }}>
                    This field is required.
                  </p>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setRemember((r) => !r)}
                  className="flex items-center justify-center rounded-md border transition-colors duration-150"
                  style={{
                    width: 20,
                    height: 20,
                    background: remember ? '#5FAF6E' : '#FFFFFF',
                    borderColor: remember ? '#5FAF6E' : '#D1D5DB',
                  }}
                >
                  {remember && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span className="text-sm" style={{ color: '#5F6E5F' }}>
                  Remember me
                </span>
              </div>

              {/* CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-sm font-semibold py-3 rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                style={{ background: '#5FAF6E', color: '#fff' }}
              >
                {loading ? 'Đang đăng nhập...' : 'Log In'}
              </button>
            </form>

            <p className="text-sm text-center mt-6" style={{ color: '#5F6E5F' }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold transition-colors duration-150 hover:opacity-80"
                style={{ color: '#5FAF6E' }}
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
