import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanSquare,
  CalendarDays,
  Timer,
  BarChart2,
  Sparkles,
  Settings,
  Leaf,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Bell,
  HelpCircle,
  Shield,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import notificationsService from '../../services/notifications.service';
import socketService from '../../services/socket.service';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
  dot?: boolean;
  action?: () => void;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewAiInsights, setHasNewAiInsights] = useState(false);

  const loadUnreadCounts = useCallback(async () => {
    try {
      const list = await notificationsService.getNotifications();
      const unread = list.filter((n) => !n.read);
      setUnreadCount(unread.length);
      setHasNewAiInsights(unread.some((n) => n.category === 'ai_insights'));
    } catch (err) {
      console.error('Failed to load notifications for sidebar:', err);
    }
  }, []);

  useEffect(() => {
    loadUnreadCounts();

    const handleNotificationsChanged = () => {
      loadUnreadCounts();
    };

    window.addEventListener('notifications_changed', handleNotificationsChanged);

    // Socket listener for realtime new notifications
    const handleRealtime = () => {
      loadUnreadCounts();
    };
    socketService.onNotification(handleRealtime);

    return () => {
      window.removeEventListener('notifications_changed', handleNotificationsChanged);
      socketService.offNotification(handleRealtime);
    };
  }, [loadUnreadCounts]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navSections: { title: string; items: NavItem[] }[] = [
    ...(user?.role === 'ADMIN'
      ? [
          {
            title: 'Quản trị',
            items: [
              { icon: Shield, label: 'Admin Console', path: '/admin/dashboard', badge: 'ADMIN' },
            ],
          },
        ]
      : []),
    {
      title: 'Main',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: KanbanSquare, label: 'Task Board', path: '/tasks' },
        { icon: CalendarDays, label: 'Schedule', path: '/schedule' },
        { icon: Timer, label: 'Pomodoro Sessions', path: '/focus' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { icon: BarChart2, label: 'Analytics', path: '/analytics' },
        {
          icon: Sparkles,
          label: 'AI Insights',
          path: '/ai-insights',
          badge: hasNewAiInsights ? 'New' : undefined,
        },
        {
          icon: Bell,
          label: 'Thông báo',
          path: '/notifications',
          dot: unreadCount > 0,
        },
      ],
    },
    {
      title: 'Other',
      items: [
        { icon: Settings, label: 'Settings', path: '/settings' },
        { icon: HelpCircle, label: 'Help & Support', path: '/help' },
        { icon: LogOut, label: 'Đăng xuất', path: '#', action: handleLogout },
      ],
    },
  ];

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const activePath = location.pathname;

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-6 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-2xl shrink-0"
            style={{ width: 40, height: 40, background: '#5FAF6E' }}
          >
            <Leaf size={20} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight" style={{ color: '#243024' }}>FocusFlow</span>
            <p className="text-xs" style={{ color: '#5F6E5F' }}>Productivity Suite</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors hover:bg-gray-100 lg:hidden"
            style={{ color: '#5F6E5F' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-6 pb-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <p
              className="text-xs font-semibold uppercase mb-2 px-3"
              style={{ color: '#9CA3AF', letterSpacing: '0.1em' }}
            >
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activePath === item.path;
                const linkProps = item.action
                  ? { to: '#', onClick: (e: React.MouseEvent) => { e.preventDefault(); item.action?.(); onClose?.(); } }
                  : { to: item.path, onClick: () => onClose?.() };

                return (
                  <li key={item.label}>
                    <Link
                      {...linkProps}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150"
                      style={{
                        borderRadius: 12,
                        background: isActive ? '#DDF3DF' : 'transparent',
                        color: isActive ? '#243024' : '#5F6E5F',
                      }}
                      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F4FAF4'; }}
                      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <item.icon
                        size={18}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        style={{ color: isActive ? '#5FAF6E' : '#5F6E5F', flexShrink: 0 }}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={item.badge === 'New'
                            ? { background: '#DDF3DF', color: '#5FAF6E' }
                            : { background: '#5FAF6E', color: '#fff' }}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.dot && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#EF4444' }} />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="px-4 pb-6 shrink-0">
        <Link
          to="/settings"
          onClick={() => onClose?.()}
          className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-150 hover:shadow-sm"
          style={{
            background: activePath === '/settings' ? '#DDF3DF' : '#F4FAF4',
            border: activePath === '/settings' ? '1px solid rgba(95,175,110,0.4)' : '1px solid transparent',
          }}
        >
          <div
            className="flex items-center justify-center rounded-full text-sm font-bold shrink-0"
            style={{ width: 36, height: 36, background: '#5FAF6E', color: '#fff' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold truncate" style={{ color: '#243024' }}>{displayName}</p>
          </div>
          <ChevronRight size={14} style={{ color: '#9CA3AF' }} className="shrink-0" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: '#F4FAF4', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 bg-white"
        style={{ width: 288, boxShadow: '1px 0 0 0 #E8F5E8' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-md"
        style={{ border: '1px solid #E8F5E8' }}
      >
        <Menu size={20} style={{ color: '#243024' }} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 transition-opacity duration-200"
          style={{ background: 'rgba(36,48,36,0.4)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className="lg:hidden fixed top-0 left-0 h-full z-50 bg-white transition-transform duration-300 ease-in-out"
        style={{
          width: 288,
          boxShadow: '4px 0 24px rgba(36,48,36,0.12)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around bg-white border-t py-2"
        style={{ borderColor: '#E8F5E8' }}
      >
        {[
          { icon: LayoutDashboard, path: '/dashboard', label: 'Home' },
          { icon: KanbanSquare, path: '/tasks', label: 'Tasks' },
          { icon: Timer, path: '/focus', label: 'Focus' },
          { icon: BarChart2, path: '/analytics', label: 'Stats' },
        ].map((item) => {
          const isActive = activePath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors"
              style={{ color: isActive ? '#5FAF6E' : '#9CA3AF' }}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen" style={{ background: '#F4FAF4' }}>
        <main className="flex-1 pb-16 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
