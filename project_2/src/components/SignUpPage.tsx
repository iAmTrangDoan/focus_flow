import { useState, useMemo } from 'react';
import {
  Leaf,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  BookOpen,
  Briefcase,
  Heart,
} from 'lucide-react';

const benefits = [
  'AI-powered weekly schedule built for you',
  'Pomodoro timer with automatic behavior tracking',
  'Live Priority Score for every task',
  'Procrastination Score & weekly analytics',
  'Personalized AI insights every Monday',
];

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const goals = [
  { icon: BookOpen, label: 'Study & Learning' },
  { icon: Briefcase, label: 'Work & Career' },
  { icon: Heart, label: 'Personal Growth' },
];

function passwordStrength(pw: string): { level: number; label: string } {
  if (!pw) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return { level: score, label: labels[Math.min(score, 4) - 1] || 'Weak' };
}

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitted1, setSubmitted1] = useState(false);

  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('6:00 PM');
  const [selectedDays, setSelectedDays] = useState<string[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
  ]);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const pwStrength = useMemo(() => passwordStrength(password), [password]);
  const pwMatch = confirm && password === confirm;
  const pwMismatch = confirm && password !== confirm;

  const step1Valid =
    name.trim() && email.trim() && password.trim() && confirm.trim() && agreed && pwMatch;

  const handleContinue = () => {
    setSubmitted1(true);
    if (step1Valid) setStep(2);
  };

  const toggleDay = (d: string) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const strengthColors = ['#C1644C', '#B8860B', '#5FAF6E', '#3D8B50'];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4FAF4' }}>
      {/* Navbar */}
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
          Already have an account? Log in
        </a>
      </nav>

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

          <div
            className="mt-10 p-8"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 4px 24px 0 rgba(36,48,36,0.10)',
              maxWidth: 320,
              width: '100%',
            }}
          >
            <p className="text-base font-semibold mb-4" style={{ color: '#243024' }}>
              What you'll unlock:
            </p>
            <ul className="space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
                    style={{ width: 28, height: 28, background: '#5FAF6E' }}
                  >
                    <Check size={14} color="#fff" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm leading-snug" style={{ color: '#5F6E5F' }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex items-center gap-2">
            {['AK', 'MJ', 'SP'].map((initials, i) => (
              <div
                key={initials}
                className="flex items-center justify-center rounded-full text-xs font-bold border-2 border-white"
                style={{
                  width: 32,
                  height: 32,
                  background: '#9BD4A5',
                  color: '#fff',
                  marginLeft: i > 0 ? -8 : 0,
                  zIndex: i,
                }}
              >
                {initials}
              </div>
            ))}
            <span className="text-sm ml-1" style={{ color: '#5F6E5F' }}>
              Join 12,000+ focused professionals
            </span>
          </div>

          <p
            className="mt-8 text-sm italic text-center leading-relaxed max-w-xs"
            style={{ color: '#5F6E5F' }}
          >
            "Focus is not about saying yes. It's about saying no to everything else."
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
              Create your account
            </h1>
            <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
              Start your focus journey — free forever.
            </p>

            {/* Step Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                {[1, 2].map((s) => (
                  <div key={s} className="flex flex-col items-center">
                    <div
                      className="flex items-center justify-center rounded-full text-xs font-bold transition-all duration-300"
                      style={{
                        width: 28,
                        height: 28,
                        background: step >= s ? '#5FAF6E' : '#FFFFFF',
                        color: step >= s ? '#fff' : '#9CA3AF',
                        border: step >= s ? '2px solid #5FAF6E' : '2px solid #D1D5DB',
                      }}
                    >
                      {s}
                    </div>
                    <span
                      className="text-xs mt-1 font-medium"
                      style={{ color: step >= s ? '#5FAF6E' : '#9CA3AF' }}
                    >
                      {s === 1 ? 'Account' : 'Preferences'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: '#E5E7EB' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: step === 1 ? '50%' : '100%',
                    background: '#5FAF6E',
                  }}
                />
              </div>
            </div>

            {/* STEP 1 */}
            <div
              className={`mt-6 flex flex-col gap-5 transition-all duration-500 ${
                step === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none hidden'
              }`}
            >
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#243024' }}>
                  Full Name
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#9CA3AF' }}
                  />
                  <input
                    type="text"
                    placeholder="Alex Kim"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border py-3 pr-4 pl-10 text-sm outline-none transition-all duration-150"
                    style={{ borderColor: '#D1D5DB', color: '#243024' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#5FAF6E';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(95,175,110,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {submitted1 && !name.trim() && (
                  <p className="text-xs mt-1.5" style={{ color: '#C1644C' }}>
                    This field is required.
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#243024' }}>
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
                    className="w-full rounded-xl border py-3 pr-4 pl-10 text-sm outline-none transition-all duration-150"
                    style={{ borderColor: '#D1D5DB', color: '#243024' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#5FAF6E';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(95,175,110,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {submitted1 && !email.trim() && (
                  <p className="text-xs mt-1.5" style={{ color: '#C1644C' }}>
                    This field is required.
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#243024' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#9CA3AF' }}
                  />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border py-3 pr-10 pl-10 text-sm outline-none transition-all duration-150"
                    style={{ borderColor: '#D1D5DB', color: '#243024' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#5FAF6E';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(95,175,110,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#9CA3AF' }}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Strength bar */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-1.5 rounded-full transition-colors duration-300"
                        style={{
                          background:
                            i < pwStrength.level
                              ? strengthColors[Math.min(pwStrength.level - 1, 3)]
                              : '#E5E7EB',
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="text-xs font-medium whitespace-nowrap"
                    style={{
                      color:
                        pwStrength.level > 0
                          ? strengthColors[Math.min(pwStrength.level - 1, 3)]
                          : '#9CA3AF',
                    }}
                  >
                    {pwStrength.label}
                  </span>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#243024' }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#9CA3AF' }}
                  />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border py-3 pr-10 pl-10 text-sm outline-none transition-all duration-150"
                    style={{
                      borderColor: pwMismatch ? '#C1644C' : '#D1D5DB',
                      color: '#243024',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#5FAF6E';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(95,175,110,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = pwMismatch ? '#C1644C' : '#D1D5DB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#9CA3AF' }}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {pwMatch && confirm && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Check size={14} style={{ color: '#5FAF6E' }} strokeWidth={2.5} />
                    <span className="text-xs" style={{ color: '#5FAF6E' }}>
                      Passwords match
                    </span>
                  </div>
                )}
                {pwMismatch && (
                  <p className="text-xs mt-1.5" style={{ color: '#C1644C' }}>
                    Passwords do not match
                  </p>
                )}
                {submitted1 && !confirm.trim() && !pwMismatch && (
                  <p className="text-xs mt-1.5" style={{ color: '#C1644C' }}>
                    This field is required.
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setAgreed((a) => !a)}
                  className="flex items-center justify-center rounded-md border transition-colors duration-150"
                  style={{
                    width: 20,
                    height: 20,
                    background: agreed ? '#5FAF6E' : '#FFFFFF',
                    borderColor: agreed ? '#5FAF6E' : '#D1D5DB',
                  }}
                >
                  {agreed && (
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
                  I agree to the{' '}
                  <a href="#" className="underline" style={{ color: '#5FAF6E' }}>
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="underline" style={{ color: '#5FAF6E' }}>
                    Privacy Policy
                  </a>
                </span>
              </div>
              {submitted1 && !agreed && (
                <p className="text-xs -mt-3" style={{ color: '#C1644C' }}>
                  You must agree to continue.
                </p>
              )}

              <button
                type="button"
                onClick={handleContinue}
                className="w-full text-sm font-semibold py-3 rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: '#5FAF6E', color: '#fff' }}
              >
                Continue →
              </button>
            </div>

            {/* STEP 2 */}
            <div
              className={`mt-6 flex flex-col gap-6 transition-all duration-500 ${
                step === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none hidden'
              }`}
            >
              {/* Work hours */}
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: '#243024' }}>
                  When do you usually work?
                </p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs mb-1" style={{ color: '#5F6E5F' }}>
                      Start time
                    </label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-xl border py-2.5 px-3 text-sm outline-none transition-all duration-150"
                      style={{ borderColor: '#D1D5DB', color: '#243024' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#5FAF6E';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(95,175,110,0.15)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#D1D5DB';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'].map(
                        (t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs mb-1" style={{ color: '#5F6E5F' }}>
                      End time
                    </label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-xl border py-2.5 px-3 text-sm outline-none transition-all duration-150"
                      style={{ borderColor: '#D1D5DB', color: '#243024' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#5FAF6E';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(95,175,110,0.15)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#D1D5DB';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {['4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'].map(
                        (t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Days */}
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: '#243024' }}>
                  Which days do you work?
                </p>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((d) => {
                    const active = selectedDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
                        style={{
                          background: active ? '#DDF3DF' : '#FFFFFF',
                          color: active ? '#5FAF6E' : '#9CA3AF',
                          border: active ? '1.5px solid #5FAF6E' : '1.5px solid #E5E7EB',
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Goal */}
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: '#243024' }}>
                  What's your main goal?
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {goals.map((g) => {
                    const active = selectedGoal === g.label;
                    const Icon = g.icon;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        onClick={() => setSelectedGoal(g.label)}
                        className="flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-150"
                        style={{
                          borderColor: active ? '#5FAF6E' : '#E5E7EB',
                          background: active ? '#F0FBF0' : '#FFFFFF',
                        }}
                      >
                        <div
                          className="flex items-center justify-center rounded-lg"
                          style={{
                            width: 36,
                            height: 36,
                            background: active ? '#5FAF6E' : '#DDF3DF',
                          }}
                        >
                          <Icon
                            size={18}
                            style={{ color: active ? '#fff' : '#5FAF6E' }}
                            strokeWidth={2}
                          />
                        </div>
                        <span
                          className="text-sm font-medium"
                          style={{ color: '#243024' }}
                        >
                          {g.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                className="w-full text-sm font-semibold py-3 rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: '#5FAF6E', color: '#fff' }}
              >
                Create My Account 🎉
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSubmitted1(false);
                }}
                className="text-sm font-medium transition-colors duration-150 hover:opacity-80"
                style={{ color: '#5F6E5F' }}
              >
                ← Back
              </button>
            </div>

            {/* Divider + social */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
              <span className="text-xs whitespace-nowrap" style={{ color: '#9CA3AF' }}>
                or sign up with
              </span>
              <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
            </div>

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

            <p className="text-sm text-center mt-6" style={{ color: '#5F6E5F' }}>
              Already have an account?{' '}
              <a
                href="#"
                className="font-semibold transition-colors duration-150 hover:opacity-80"
                style={{ color: '#5FAF6E' }}
              >
                Log in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
