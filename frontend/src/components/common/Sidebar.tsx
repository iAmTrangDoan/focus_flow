import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  CheckSquare,
  Calendar,
  Clock,
  Sparkles,
  BarChart3,
  Settings,
  Bell,
  Search,
  Plus,
  Leaf,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'

const navMain = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { path: '/tasks', label: 'Công việc', icon: CheckSquare },
  { path: '/calendar', label: 'Lịch trình', icon: Calendar },
]
const navTools = [
  { path: '/focus', label: 'Focus Timer', icon: Clock },
  { path: '/ai-planner', label: 'AI Planner', icon: Sparkles },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
]
const navOther = [
  { path: '/settings', label: 'Cài đặt', icon: Settings },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const isActive = (path: string) => location.pathname === path

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const NavGroup = ({ items }: { items: typeof navMain }) => (
    <div className="sidebar-nav">
      {items.map(({ path, label, icon: Icon }) => (
        <Link
          key={path}
          to={path}
          className={`sidebar-nav-item ${isActive(path) ? 'active' : ''}`}
        >
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </div>
  )

  const avatarText = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="flex h-screen bg-[#F4FAF4]">
      {/* ── Sidebar ── */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-0 lg:w-72'
        } bg-white border-r border-[#D9E6D9] transition-all duration-300 flex flex-col overflow-hidden shadow-sm flex-shrink-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#D9E6D9]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] flex items-center justify-center text-white">
              <Leaf size={16} />
            </div>
            <h1 className="text-xl font-bold text-[#243024]">FocusFlow</h1>
          </div>
          <p className="text-xs text-[#5F6E5F] ml-10">Smart Focus Assistant</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto space-y-4">
          <div>
            <p className="text-caption px-4 mb-3">Main</p>
            <NavGroup items={navMain} />
          </div>
          <div>
            <p className="text-caption px-4 mb-3">Tools</p>
            <NavGroup items={navTools} />
          </div>
          <div>
            <p className="text-caption px-4 mb-3">Other</p>
            <NavGroup items={navOther} />
          </div>
        </nav>

        {/* User profile + Logout */}
        <div className="p-4 border-t border-[#D9E6D9] bg-[#F4FAF4]">
          <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-[#E8F5EA] transition-colors">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {avatarText}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#243024] truncate">
                {user?.displayName || 'Người dùng'}
              </p>
              <p className="text-xs text-[#5F6E5F] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 mt-1 w-full text-sm text-[#5F6E5F] hover:text-[#E8745B] transition-colors rounded-[10px] hover:bg-red-50"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-[#D9E6D9] px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#E8F5EA] rounded-[12px] transition-colors lg:hidden"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex-1 max-w-md ml-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F6E5F]" size={16} />
              <input
                type="text"
                placeholder="Tìm công việc..."
                className="input-field pl-10 w-full bg-[#F4FAF4] text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4">
            <button className="p-2 hover:bg-[#E8F5EA] rounded-[12px] transition-colors relative">
              <Bell size={20} className="text-[#5F6E5F]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E8745B] rounded-full" />
            </button>
            <button className="btn-primary flex items-center gap-1.5 text-sm py-2 px-4">
              <Plus size={16} />
              Thêm
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#F4FAF4] p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
