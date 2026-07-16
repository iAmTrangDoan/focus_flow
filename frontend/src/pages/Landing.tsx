import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  CalendarCheck,
  Timer,
  TrendingUp,
  BarChart2,
  Sparkles,
  LayoutGrid,
  Play,
  Star,
} from 'lucide-react';

const navLinks = ['Features', 'How It Works', 'Pricing'];

const features = [
  {
    icon: CalendarCheck,
    title: 'Smart Task Scheduling',
    desc: 'AI automatically fills your week based on deadlines and energy patterns.',
  },
  {
    icon: Timer,
    title: 'Pomodoro Timer',
    desc: 'Built-in focus sessions with automatic behavior logging after each session.',
  },
  {
    icon: TrendingUp,
    title: 'Priority Scoring',
    desc: 'Every task gets a live Priority Score based on urgency, importance, and your procrastination risk.',
  },
  {
    icon: BarChart2,
    title: 'Procrastination Analytics',
    desc: 'Track your Procrastination Score daily and see exactly where you lose focus.',
  },
  {
    icon: Sparkles,
    title: 'AI Weekly Insights',
    desc: 'Get personalized productivity tips generated from your actual behavior data.',
  },
  {
    icon: LayoutGrid,
    title: 'Eisenhower Matrix',
    desc: 'Categorize tasks by urgency and importance with one click.',
  },
];

const steps = [
  {
    num: '1',
    title: 'Add Your Tasks',
    desc: 'Enter task names and let AI break them into subtasks with time estimates.',
  },
  {
    num: '2',
    title: 'Let AI Schedule',
    desc: 'FocusFlow fills your week automatically, avoiding your low-energy hours.',
  },
  {
    num: '3',
    title: 'Focus & Improve',
    desc: 'Run Pomodoro sessions, track your habits, and get smarter every week.',
  },
];

const testimonials = [
  {
    quote:
      '"I went from missing every deadline to finishing work early. The AI scheduling feels like magic."',
    name: 'Sarah Chen',
    role: 'Product Designer',
    initials: 'SC',
  },
  {
    quote:
      '"The Pomodoro timer + insights combo helped me understand when I actually work best. Game changer."',
    name: 'Marcus Johnson',
    role: 'Software Engineer',
    initials: 'MJ',
  },
  {
    quote:
      '"Finally, a productivity app that doesn\'t guilt-trip me. FocusFlow motivates me to do better every day."',
    name: 'Priya Patel',
    role: 'Graduate Student',
    initials: 'PP',
  },
];

const footerColumns = [
  {
    title: 'Product',
    links: ['Features', 'Pricing', 'Changelog'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers'],
  },
  {
    title: 'Support',
    links: ['Help Center', 'Contact', 'Privacy'],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#F4FAF4', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      {/* NAVBAR */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #D4E8D4' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: '#5FAF6E' }}
          >
            <Leaf size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: '#243024' }}>
            FocusFlow
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/\s/g, '-')}`}
              className="text-sm font-medium transition-colors duration-150 hover:opacity-80"
              style={{ color: '#5F6E5F' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#5FAF6E')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#5F6E5F')}
            >
              {l}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="hidden sm:block text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150 hover:opacity-80"
            style={{ color: '#5F6E5F' }}
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/register')}
            className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{ background: '#5FAF6E', color: '#fff', borderRadius: 10 }}
          >
            Get Started Free
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="flex flex-col items-center text-center px-6 py-24">
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full mb-6"
          style={{ background: '#DDF3DF', color: '#5FAF6E' }}
        >
          <Leaf size={14} />
          AI-Powered Focus
        </div>

        <h1
          className="text-4xl sm:text-5xl font-bold leading-tight mb-5 max-w-3xl"
          style={{ color: '#243024' }}
        >
          Stop Procrastinating.
          <br />
          Start Flowing.
        </h1>

        <p className="text-lg sm:text-xl max-w-2xl mb-8 leading-relaxed" style={{ color: '#5F6E5F' }}>
          FocusFlow uses AI and the Pomodoro technique to automatically schedule your tasks, track
          your focus, and give you weekly insights — so you always know what to do next.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <button
            onClick={() => navigate('/register')}
            className="text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{ background: '#5FAF6E', color: '#fff' }}
          >
            Start for Free
          </button>
          <button
            className="text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-150 hover:opacity-80 active:scale-95"
            style={{ border: '1.5px solid #5FAF6E', color: '#5FAF6E' }}
          >
            See How It Works
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-xs mb-16" style={{ color: '#5F6E5F' }}>
          <span className="flex items-center gap-1.5">
            <span style={{ color: '#5FAF6E' }}>✓</span> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: '#5FAF6E' }}>✓</span> Free forever plan
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: '#5FAF6E' }}>✓</span> Setup in 2 minutes
          </span>
        </div>

        {/* Hero mockup card */}
        <div
          className="w-full max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-8 px-8 py-8"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 8px 40px 0 rgba(36,48,36,0.10)',
            borderRadius: 20,
          }}
        >
          <div className="relative shrink-0 flex items-center justify-center" style={{ width: 148, height: 148 }}>
            <svg width={148} height={148} className="absolute inset-0 -rotate-90">
              <circle cx={74} cy={74} r={56} fill="none" stroke="#DDF3DF" strokeWidth={8} />
              <circle
                cx={74}
                cy={74}
                r={56}
                fill="none"
                stroke="#5FAF6E"
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={351.86}
                strokeDashoffset={0}
              />
            </svg>
            <div className="relative flex flex-col items-center justify-center">
              <span className="text-4xl font-bold tabular-nums" style={{ color: '#243024', letterSpacing: '-0.03em' }}>
                25:00
              </span>
              <span className="text-xs font-medium mt-0.5" style={{ color: '#5F6E5F' }}>
                ready
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#F6D8C7', color: '#C1644C' }}
              >
                High Priority
              </span>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: '#DCECF8', color: '#4A7FB8' }}
              >
                Design
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-1.5 leading-tight" style={{ color: '#243024' }}>
              Redesign onboarding flow
            </h2>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: '#5F6E5F' }}>
              Revamp the first-run experience to reduce drop-off. Wireframe screens 1–4, then prototype in Figma.
            </p>
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{ background: '#5FAF6E', color: '#fff' }}
            >
              <Play size={16} />
              Start Focus
            </button>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section
        className="py-8 text-center"
        style={{ background: '#FFFFFF', borderTop: '1px solid #F4FAF4', borderBottom: '1px solid #F4FAF4' }}
      >
        <p className="text-sm font-medium mb-5" style={{ color: '#5F6E5F' }}>
          Trusted by 12,000+ students and professionals
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 px-6">
          {['Stanford', 'Google', 'Notion', 'Figma', 'Spotify'].map((name) => (
            <div
              key={name}
              className="text-xs font-semibold px-4 py-2 rounded-full"
              style={{ background: '#F4FAF4', color: '#5F6E5F' }}
            >
              {name}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#5FAF6E', letterSpacing: '0.15em' }}
          >
            FEATURES
          </p>
          <h2 className="text-3xl font-bold mb-12" style={{ color: '#243024' }}>
            Everything you need to beat procrastination
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 transition-shadow duration-200 hover:shadow-md"
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  boxShadow: '0 2px 16px 0 rgba(36,48,36,0.07)',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl mb-4"
                  style={{ width: 44, height: 44, background: '#DDF3DF' }}
                >
                  <f.icon size={20} style={{ color: '#5FAF6E' }} strokeWidth={2} />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: '#243024' }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#5F6E5F' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-6 md:px-12" style={{ background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#5FAF6E', letterSpacing: '0.15em' }}
          >
            HOW IT WORKS
          </p>
          <h2 className="text-3xl font-bold mb-14" style={{ color: '#243024' }}>
            From chaos to clarity in 3 steps
          </h2>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {/* dashed connector line (desktop only) */}
            <div
              className="hidden md:block absolute top-6 left-[16.66%] right-[16.66%]"
              style={{ borderTop: '2px dashed #D4E8D4' }}
            />

            {steps.map((s) => (
              <div key={s.num} className="relative flex flex-col items-center text-center z-10">
                <div
                  className="flex items-center justify-center rounded-full text-lg font-bold mb-5"
                  style={{
                    width: 48,
                    height: 48,
                    background: '#DDF3DF',
                    color: '#5FAF6E',
                  }}
                >
                  {s.num}
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#243024' }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#5F6E5F' }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-6 md:px-12" style={{ background: '#F4FAF4' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center" style={{ color: '#243024' }}>
            What our users say
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-6"
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  boxShadow: '0 2px 16px 0 rgba(36,48,36,0.07)',
                }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill="#B8860B"
                      stroke="#B8860B"
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <p className="text-sm italic leading-relaxed mb-5" style={{ color: '#5F6E5F' }}>
                  {t.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-full text-xs font-bold"
                    style={{ width: 36, height: 36, background: '#DDF3DF', color: '#4A9459' }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#243024' }}>
                      {t.name}
                    </p>
                    <p className="text-xs" style={{ color: '#5F6E5F' }}>
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="px-6 md:px-12 pb-20">
        <div
          className="max-w-5xl mx-auto text-center px-6 py-16"
          style={{ background: '#DDF3DF', borderRadius: 24 }}
        >
          <h2 className="text-3xl font-bold mb-3" style={{ color: '#243024' }}>
            Ready to focus like never before?
          </h2>
          <p className="text-base mb-8" style={{ color: '#5F6E5F' }}>
            Join thousands who turned procrastination into productivity.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="text-lg font-semibold px-8 py-4 rounded-xl transition-all duration-150 hover:opacity-90 active:scale-95"
            style={{ background: '#5FAF6E', color: '#fff' }}
          >
            Get Started — It's Free
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="py-12 px-6 md:px-12"
        style={{ background: '#FFFFFF', borderTop: '1px solid #D4E8D4' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: 32, height: 32, background: '#5FAF6E' }}
              >
                <Leaf size={16} color="#fff" strokeWidth={2.2} />
              </div>
              <span className="text-base font-bold" style={{ color: '#243024' }}>
                FocusFlow
              </span>
            </div>
            <p className="text-sm" style={{ color: '#5F6E5F' }}>
              Work smarter, not harder.
            </p>
          </div>

          <div className="flex flex-wrap gap-10">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase mb-3" style={{ color: '#243024', letterSpacing: '0.08em' }}>
                  {col.title}
                </p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm transition-colors duration-150 hover:opacity-80"
                        style={{ color: '#5F6E5F' }}
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-xs" style={{ color: '#5F6E5F' }}>
            © 2025 FocusFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
