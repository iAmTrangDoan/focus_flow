import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Calendar, Timer, BarChart2, Sparkles, Settings, HelpCircle } from 'lucide-react';
import { ToastContainer, type ToastMessage } from './components/ui';
import { Header } from './components/NotificationDropdown';

/* ─── Sidebar ─── */
type ViewType = 'dashboard' | 'tasks' | 'schedule' | 'focus' | 'analytics' | 'ai-insights' | 'settings' | 'help';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const navItems: { id: ViewType; icon: typeof Home; label: string; path: string }[] = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', path: '/dashboard' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { id: 'schedule', icon: Calendar, label: 'Schedule', path: '/schedule' },
    { id: 'focus', icon: Timer, label: 'Focus', path: '/focus-sessions' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics', path: '/analytics' },
    { id: 'ai-insights', icon: Sparkles, label: 'AI Insights', path: '/ai-insights' },
  ];

  const bottomItems: { id: ViewType; icon: typeof Settings; label: string; path: string }[] = [
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
    { id: 'help', icon: HelpCircle, label: 'Help', path: '/help' },
  ];

  return (
    <aside
      className="flex flex-col justify-between py-6"
      style={{
        width: 224,
        background: '#FFFFFF',
        borderRight: '1px solid #E8F5E8',
        height: '100vh',
      }}
    >
      {/* Logo */}
      <div>
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: '#DDF3DF' }}
            >
              <Timer size={20} style={{ color: '#5FAF6E' }} />
            </div>
            <div>
              <h1 className="font-bold text-lg" style={{ color: '#243024' }}>
                FocusFlow
              </h1>
            </div>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{
                  background: isActive ? '#DDF3DF' : 'transparent',
                  color: isActive ? '#5FAF6E' : '#5F6E5F',
                }}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Nav */}
      <nav className="space-y-1 px-3">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
              style={{
                background: isActive ? '#DDF3DF' : 'transparent',
                color: isActive ? '#5FAF6E' : '#5F6E5F',
              }}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

/* ─── Layout with Header ─── */
function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentView: ViewType = (() => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/tasks') return 'tasks';
    if (path === '/schedule') return 'schedule';
    if (path === '/focus-sessions') return 'focus';
    if (path === '/analytics') return 'analytics';
    if (path === '/ai-insights') return 'ai-insights';
    if (path === '/settings') return 'settings';
    if (path === '/help') return 'help';
    return 'dashboard';
  })();

  const handleViewChange = (view: ViewType) => {
    const paths: Record<ViewType, string> = {
      'dashboard': '/dashboard',
      'tasks': '/tasks',
      'schedule': '/schedule',
      'focus': '/focus-sessions',
      'analytics': '/analytics',
      'ai-insights': '/ai-insights',
      'settings': '/settings',
      'help': '/help',
    };
    navigate(paths[view]);
  };

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="flex" style={{ minHeight: '100vh' }}>
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />
      <div className="flex-1 flex flex-col">
        <Header
          onToast={() => {}}
          onNavigate={navigate}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ─── Placeholder Pages ─── */
function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>
        Dashboard
      </h1>
      <p className="mt-2" style={{ color: '#5F6E5F' }}>
        This is the dashboard page with header showcasing the notification dropdown.
      </p>
      <div className="mt-6 p-6 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E8F5E8' }}>
        <h2 className="font-semibold mb-2" style={{ color: '#243024' }}>Header Features</h2>
        <ul className="space-y-2 text-sm" style={{ color: '#5F6E5F' }}>
          <li>• Search bar with pill styling</li>
          <li>• Notification bell with unread dot</li>
          <li>• Notification dropdown panel with filters</li>
          <li>• User menu avatar dropdown</li>
          <li>• 10 mock notifications covering 7 categories</li>
        </ul>
      </div>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div
        className="flex items-center justify-center rounded-3xl mb-5"
        style={{ width: 72, height: 72, background: '#DDF3DF' }}
      >
        <Timer size={32} style={{ color: '#5FAF6E' }} />
      </div>
      <h1 className="text-xl font-semibold mb-2" style={{ color: '#243024' }}>
        {title}
      </h1>
      <p className="text-sm" style={{ color: '#9CA3AF' }}>
        Trang này đang được phát triển
      </p>
    </div>
  );
}

/* ─── Main App ─── */
function AppRoutes() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<ComingSoon title="Tasks" />} />
          <Route path="/schedule" element={<ComingSoon title="Schedule" />} />
          <Route path="/focus-sessions" element={<ComingSoon title="Focus Sessions" />} />
          <Route path="/analytics" element={<ComingSoon title="Analytics" />} />
          <Route path="/ai-insights" element={<ComingSoon title="AI Insights" />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
          <Route path="/help" element={<ComingSoon title="Help & Support" />} />
          <Route path="/profile" element={<ComingSoon title="Profile" />} />
        </Routes>
      </Layout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
