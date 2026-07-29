import { type ReactNode, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  SlidersHorizontal,
  Clock,
  ScrollText,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  Leaf,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Chính',
    items: [
      { label: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Quản lý người dùng', path: '/admin/users', icon: Users },
    ],
  },
  {
    label: 'Công cụ',
    items: [
      { label: 'Cấu hình thuật toán', path: '/admin/algorithm-config', icon: SlidersHorizontal },
      { label: 'Cấu hình Cron Job', path: '/admin/cron-config', icon: Clock },
      { label: 'Nhật ký hệ thống', path: '/admin/system-logs', icon: ScrollText },
    ],
  },
  {
    label: 'Khác',
    items: [
      { label: 'Cài đặt chung', path: '/admin/settings', icon: Settings },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'System Admin';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-6 shrink-0 border-b border-[#E8F5E8]">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-2xl shrink-0"
            style={{ width: 40, height: 40, background: '#5FAF6E' }}
          >
            <Leaf size={20} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight" style={{ color: '#243024' }}>
              FocusFlow
            </span>
            <p className="text-xs font-semibold" style={{ color: '#5FAF6E' }}>
              Admin Console
            </p>
          </div>
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors hover:bg-gray-100 lg:hidden"
            style={{ color: '#5F6E5F' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p
              className="text-xs font-semibold uppercase mb-2 px-3"
              style={{ color: '#9CA3AF', letterSpacing: '0.1em' }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150"
                    style={({ isActive }) => ({
                      borderRadius: 12,
                      background: isActive ? '#DDF3DF' : 'transparent',
                      color: isActive ? '#243024' : '#5F6E5F',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          style={{ color: isActive ? '#5FAF6E' : '#5F6E5F', flexShrink: 0 }}
                        />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-[#E8F5E8]">
          <NavLink
            to="/dashboard"
            onClick={onNavigate}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 rounded-[12px] hover:bg-[#F4FAF4]"
            style={{ color: '#5F6E5F' }}
          >
            <ArrowLeft size={18} strokeWidth={1.8} style={{ color: '#5FAF6E', flexShrink: 0 }} />
            <span className="flex-1 text-left">Về giao diện User</span>
          </NavLink>
        </div>
      </nav>

      {/* User profile section */}
      <div className="px-4 pb-6 shrink-0 border-t border-[#E8F5E8] pt-4">
        <div
          className="w-full flex items-center gap-3 rounded-2xl px-3 py-3"
          style={{ background: '#F4FAF4' }}
        >
          <div
            className="flex items-center justify-center rounded-full text-sm font-bold shrink-0"
            style={{ width: 36, height: 36, background: '#5FAF6E', color: '#fff' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold truncate" style={{ color: '#243024' }}>
              {displayName}
            </p>
            <p className="text-xs truncate" style={{ color: '#5F6E5F' }}>
              {currentUser?.email || 'admin@focusflow.com'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const allItems = navGroups.flatMap((g) => g.items);
  const found = allItems.find((i) => pathname.startsWith(i.path));
  return found?.label ?? 'Quản trị Admin';
}

export function AdminLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#F4FAF4', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Desktop Sidebar (Width: 288px, matching User Dashboard Sidebar) */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 bg-white z-30"
        style={{ width: 288, boxShadow: '1px 0 0 0 #E8F5E8' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[288px] max-w-[85vw] bg-white shadow-xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E8F5E8] bg-white/80 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-[#243024]">{getPageTitle(location.pathname)}</h2>
              <p className="hidden text-xs text-gray-500 capitalize sm:block">{today}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF3DF] px-3 py-1 text-xs font-bold text-[#5FAF6E]">
              <Shield className="h-3.5 w-3.5" />
              ADMIN
            </span>
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-7xl mx-auto">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

export default AdminLayout;
