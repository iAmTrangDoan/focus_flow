import { useState } from 'react';
import { Leaf, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  const emailError = submitted && !email.trim();
  const passwordError = submitted && !password.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!email.trim() || !password.trim()) return;
    // login logic here
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
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 32, background: '#5FAF6E' }}
          >
            <Leaf size={16} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="text-base font-bold" style={{ color: '#243024' }}>
            FocusFlow
          </span>
        </div>
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
                      setTouched((t) => ({ ...t, email: true }));
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
                      setTouched((t) => ({ ...t, password: true }));
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
                className="w-full text-sm font-semibold py-3 rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ background: '#5FAF6E', color: '#fff' }}
              >
                Log In
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
                <span className="text-xs whitespace-nowrap" style={{ color: '#9CA3AF' }}>
                  or continue with
                </span>
                <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
              </div>

              {/* Social buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl border transition-colors duration-150 hover:bg-gray-50"
                  style={{ borderColor: '#E5E7EB', color: '#243024' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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
                  Google
                </button>
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl border transition-colors duration-150 hover:bg-gray-50"
                  style={{ borderColor: '#E5E7EB', color: '#243024' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#181717">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  GitHub
                </button>
              </div>
            </form>

            <p className="text-sm text-center mt-6" style={{ color: '#5F6E5F' }}>
              Don't have an account?{' '}
              <a
                href="#"
                className="font-semibold transition-colors duration-150 hover:opacity-80"
                style={{ color: '#5FAF6E' }}
              >
                Sign up for free
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
