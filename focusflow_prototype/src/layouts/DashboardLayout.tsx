import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  LayoutGrid,
  CheckSquare,
  Calendar,
  Clock,
  Sparkles,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Search,
  Plus,
  Leaf,
} from 'lucide-react'
import { mockUserProfile } from '../services/mockData'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { path: '/tasks', label: 'Công việc', icon: CheckSquare },
    { path: '/calendar', label: 'Lịch trình', icon: Calendar },
    { path: '/focus', label: 'Focus Timer', icon: Clock },
    { path: '/ai-planner', label: 'AI Planner', icon: Sparkles },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Cài đặt', icon: Settings },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="flex h-screen bg-[#F4FAF4]">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } bg-white border-r border-[#D9E6D9] transition-all duration-300 flex flex-col overflow-hidden lg:w-72 shadow-sm`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#D9E6D9]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] flex items-center justify-center text-white">
              <Leaf size={18} />
            </div>
            <h1 className="text-2xl font-bold text-[#243024]">FocusFlow</h1>
          </div>
          <p className="text-xs text-[#5F6E5F] ml-10">Smart Focus Assistant</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs uppercase font-bold text-[#5F6E5F] px-4 mb-4 tracking-wider">Main</p>
          <div className="sidebar-nav">
            {navItems.slice(0, 3).map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item ${active ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <p className="text-xs uppercase font-bold text-[#5F6E5F] px-4 mt-6 mb-4 tracking-wider">Tools</p>
          <div className="sidebar-nav">
            {navItems.slice(3, 6).map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item ${active ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <p className="text-xs uppercase font-bold text-[#5F6E5F] px-4 mt-6 mb-4 tracking-wider">Other</p>
          <div className="sidebar-nav">
            {navItems.slice(6).map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item ${active ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-[#D9E6D9] bg-[#F4FAF4]">
          <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-[#E8F5EA] transition-colors">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] text-white flex items-center justify-center font-bold">
              {mockUserProfile.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#243024] truncate">{mockUserProfile.name}</p>
              <p className="text-xs text-[#5F6E5F] truncate">{mockUserProfile.email}</p>
            </div>
          </div>
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 mt-2 text-sm text-[#5F6E5F] hover:text-[#5FAF6E] transition-colors"
          >
            <LogOut size={16} />
            Đăng xuất
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-[#D9E6D9] px-6 py-4 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-[#E8F5EA] rounded-[12px] transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex-1 max-w-md ml-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5F6E5F]" size={18} />
              <input
                type="text"
                placeholder="Tìm công việc..."
                className="input-field pl-12 w-full bg-[#F4FAF4]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4">
            <button className="p-2 hover:bg-[#E8F5EA] rounded-[12px] transition-colors relative">
              <Bell size={20} className="text-[#5F6E5F]" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E8745B] rounded-full"></span>
            </button>
            <button className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={18} />
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
