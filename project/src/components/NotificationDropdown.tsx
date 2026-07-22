import { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, User, Settings, LogOut, Clock, Calendar, Sparkles, BarChart2, Play, Eye } from 'lucide-react';

/* ─── Types ─── */
type NotificationCategory = 'pomodoro' | 'schedule' | 'ai_insights' | 'productivity';
type NotificationFilter = 'all' | NotificationCategory;

interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  time: string;
  timeGroup: 'today' | 'yesterday' | 'week';
  read: boolean;
  actionType?: 'start_pomodoro' | 'view_details';
}

/* ─── Mock Data ─── */
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    category: 'pomodoro',
    title: 'Hết thời gian tập trung',
    description: 'Phiên Pomodoro 25 phút đã kết thúc. Hãy nghỉ ngơi 5 phút trước khi tiếp tục.',
    time: '5 phút trước',
    timeGroup: 'today',
    read: false,
  },
  {
    id: '2',
    category: 'pomodoro',
    title: 'Task đã đến giờ nhưng chưa bắt đầu',
    description: 'Task "Hoàn thành báo cáo Q3" đã đến giờ hẹn (14:00) nhưng chưa bấm Bắt đầu Pomodoro. Lịch đang bị đóng băng.',
    time: '12 phút trước',
    timeGroup: 'today',
    read: false,
    actionType: 'start_pomodoro',
  },
  {
    id: '3',
    category: 'schedule',
    title: 'Lên lịch tuần tự động hoàn tất',
    description: 'Đã sắp xếp 23 task vào lịch tuần mới. 5 task được ưu tiên cao đã dời sang khung giờ năng lượng cao.',
    time: '1 giờ trước',
    timeGroup: 'today',
    read: false,
    actionType: 'view_details',
  },
  {
    id: '4',
    category: 'schedule',
    title: 'Tái cấu trúc một chạm hoàn tất',
    description: '7 task đã được sắp xếp lại. Lưu ý: Reschedule Frequency Score của bạn tăng 0.5 điểm (hiện tại 2.3/5).',
    time: '2 giờ trước',
    timeGroup: 'today',
    read: true,
    actionType: 'view_details',
  },
  {
    id: '5',
    category: 'ai_insights',
    title: 'AI Insights tuần mới đã sẵn sàng',
    description: 'Phân tích hành vi làm việc tuần qua đã hoàn tất. Có 6 nhận xét mới chờ bạn xem.',
    time: '3 giờ trước',
    timeGroup: 'today',
    read: true,
    actionType: 'view_details',
  },
  {
    id: '6',
    category: 'productivity',
    title: 'Nhắc deadline sắp đến',
    description: 'Task "Gửi proposal khách hàng ABC" còn 3 giờ trước deadline (17:00 hôm nay).',
    time: 'Hôm nay, 10:30',
    timeGroup: 'today',
    read: false,
  },
  {
    id: '7',
    category: 'productivity',
    title: 'Procrastination Score hàng ngày',
    description: 'Điểm trì hoãn của bạn ngày 08/07: 1.8/5 — Phân loại: Tốt. Bạn đang duy trì thói quen làm việc hiệu quả!',
    time: 'Hôm qua, 00:00',
    timeGroup: 'yesterday',
    read: false,
  },
  {
    id: '8',
    category: 'productivity',
    title: 'Nhắc deadline còn 1 ngày',
    description: 'Task "Review contract với team Legal" sẽ đến hạn vào ngày mai (10/07/2026).',
    time: 'Hôm qua, 09:00',
    timeGroup: 'yesterday',
    read: true,
  },
  {
    id: '9',
    category: 'schedule',
    title: 'Cảnh báo task quá hạn',
    description: 'Task "Soạn email cảm ơn khách hàng" đã quá deadline 2 ngày. Hãy hoàn thành sớm nhé.',
    time: '2 ngày trước',
    timeGroup: 'week',
    read: true,
  },
  {
    id: '10',
    category: 'ai_insights',
    title: 'Gợi ý tối ưu khung giờ làm việc',
    description: 'Dựa trên dữ liệu tuần qua, bạn tập trung tốt nhất vào sáng Thứ 4. Nên xếp task khó vào khung này.',
    time: '3 ngày trước',
    timeGroup: 'week',
    read: true,
  },
];

/* ─── Notification Dropdown Component ─── */
interface NotificationDropdownProps {
  onToast: (message: string) => void;
}

export function NotificationDropdown({ onToast }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const filteredNotifications = notifications.filter(
    n => filter === 'all' || n.category === filter
  );

  const groupedNotifications = {
    today: filteredNotifications.filter(n => n.timeGroup === 'today'),
    yesterday: filteredNotifications.filter(n => n.timeGroup === 'yesterday'),
    week: filteredNotifications.filter(n => n.timeGroup === 'week'),
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onToast('Đã đánh dấu tất cả thông báo đã đọc');
  };

  const categoryConfig: Record<NotificationCategory, { icon: typeof Bell; bg: string; emoji: string }> = {
    pomodoro: { icon: Clock, bg: '#FEE2E2', emoji: '🍅' },
    schedule: { icon: Calendar, bg: '#E0F2FE', emoji: '📅' },
    ai_insights: { icon: Sparkles, bg: '#DDF3DF', emoji: '✨' },
    productivity: { icon: BarChart2, bg: '#FEF3C7', emoji: '📊' },
  };

  const filterPills: { id: NotificationFilter; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pomodoro', label: 'Pomodoro' },
    { id: 'schedule', label: 'Lịch trình' },
    { id: 'ai_insights', label: 'AI Insights' },
    { id: 'productivity', label: 'Năng suất' },
  ];

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-full transition-colors"
        style={{ width: 40, height: 40, background: isOpen ? '#DDF3DF' : 'transparent' }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = '#F4FAF4';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'transparent';
        }}
      >
        <Bell size={20} style={{ color: '#5F6E5F' }} />
        {unreadCount > 0 && (
          <div
            className="absolute rounded-full"
            style={{
              width: 10,
              height: 10,
              background: '#C1644C',
              top: 6,
              right: 6,
              border: '2px solid #FFFFFF',
            }}
          />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 rounded-2xl overflow-hidden z-50"
          style={{
            width: 380,
            background: '#FFFFFF',
            boxShadow: '0 12px 40px rgba(36, 48, 36, 0.15)',
            border: '1px solid #E8F5E8',
          }}
        >
          {/* Arrow pointer */}
          <div
            className="absolute -top-2 right-4 w-4 h-4 rotate-45"
            style={{
              background: '#FFFFFF',
              borderLeft: '1px solid #E8F5E8',
              borderTop: '1px solid #E8F5E8',
            }}
          />

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ marginTop: 4 }}>
            <h3 className="font-semibold" style={{ fontSize: 16, color: '#243024' }}>
              Thông báo
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm font-medium transition-colors hover:underline"
                style={{ color: '#5FAF6E' }}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
              {filterPills.map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setFilter(pill.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                  style={{
                    background: filter === pill.id ? '#DDF3DF' : 'transparent',
                    color: filter === pill.id ? '#5FAF6E' : '#5F6E5F',
                    border: filter === pill.id ? 'none' : '1px solid #E8F5E8',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notification List */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 420, scrollbarWidth: 'thin' }}
          >
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div
                  className="flex items-center justify-center rounded-full mb-3"
                  style={{ width: 56, height: 56, background: '#F4FAF4' }}
                >
                  <Bell size={24} style={{ color: '#9CA3AF' }} />
                </div>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Không có thông báo nào ở mục này
                </p>
              </div>
            ) : (
              <>
                {(['today', 'yesterday', 'week'] as const).map(group => {
                  const items = groupedNotifications[group];
                  if (items.length === 0) return null;

                  const groupLabel = {
                    today: 'Hôm nay',
                    yesterday: 'Hôm qua',
                    week: 'Tuần này',
                  }[group];

                  return (
                    <div key={group}>
                      <div
                        className="sticky top-0 px-4 py-2 text-xs font-medium uppercase tracking-wider"
                        style={{ background: '#FFFFFF', color: '#5F6E5F', letterSpacing: '0.05em' }}
                      >
                        {groupLabel}
                      </div>
                      {items.map(notification => {
                        const config = categoryConfig[notification.category];

                        return (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                            style={{
                              background: notification.read ? 'transparent' : '#F4FAF4',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#DDF3DF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = notification.read ? 'transparent' : '#F4FAF4';
                            }}
                          >
                            {/* Icon */}
                            <div
                              className="flex items-center justify-center rounded-xl shrink-0"
                              style={{ width: 32, height: 32, background: config.bg }}
                            >
                              <span style={{ fontSize: 16 }}>{config.emoji}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-medium text-sm"
                                style={{ color: '#243024' }}
                              >
                                {notification.title}
                              </p>
                              <p
                                className="text-xs mt-0.5 line-clamp-2"
                                style={{ color: '#5F6E5F', lineHeight: 1.4 }}
                              >
                                {notification.description}
                              </p>
                              <p
                                className="text-xs mt-1"
                                style={{ color: '#9CA3AF' }}
                              >
                                {notification.time}
                              </p>

                              {/* Action Button */}
                              {notification.actionType === 'start_pomodoro' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToast('Đang bắt đầu phiên Pomodoro...');
                                    markAsRead(notification.id);
                                  }}
                                  className="mt-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:opacity-90"
                                  style={{ background: '#5FAF6E', color: '#FFFFFF' }}
                                >
                                  <Play size={12} className="inline mr-1" />
                                  Bắt đầu ngay
                                </button>
                              )}
                              {notification.actionType === 'view_details' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToast('Mở chi tiết...');
                                    markAsRead(notification.id);
                                  }}
                                  className="mt-2 text-xs font-medium transition-colors hover:underline"
                                  style={{ color: '#5FAF6E' }}
                                >
                                  <Eye size={12} className="inline mr-1" />
                                  Xem chi tiết
                                </button>
                              )}
                            </div>

                            {/* Unread indicator */}
                            {!notification.read && (
                              <div
                                className="shrink-0 rounded-full mt-1"
                                style={{ width: 8, height: 8, background: '#5FAF6E' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-3 text-center border-t"
            style={{ borderColor: '#E8F5E8' }}
          >
            <button
              className="text-sm font-medium transition-colors hover:underline"
              style={{ color: '#5FAF6E' }}
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── User Menu Dropdown ─── */
interface UserMenuProps {
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function UserMenu({ onNavigate, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { icon: User, label: 'Hồ sơ', path: '/profile' },
    { icon: Settings, label: 'Cài đặt', path: '/settings' },
  ];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
        style={{ background: isOpen ? '#DDF3DF' : 'transparent' }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 36, height: 36, background: '#DDF3DF' }}
        >
          <span className="font-semibold" style={{ color: '#5FAF6E' }}>NA</span>
        </div>
        <span className="font-medium text-sm" style={{ color: '#243024' }}>
          Nguyễn A
        </span>
        <ChevronDown
          size={16}
          style={{ color: '#9CA3AF', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 rounded-xl overflow-hidden z-50"
          style={{
            width: 180,
            background: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(36, 48, 36, 0.12)',
            border: '1px solid #E8F5E8',
          }}
        >
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                style={{
                  color: '#243024',
                  borderBottom: idx < menuItems.length ? '1px solid #E8F5E8' : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F4FAF4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
            style={{ color: '#C1644C' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FDF4F2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Search Input ─── */
export function SearchInput() {
  const [value, setValue] = useState('');

  return (
    <div className="relative" style={{ width: 320 }}>
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2"
        style={{ color: '#9CA3AF' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm kiếm task..."
        className="w-full pl-11 pr-4 py-2.5 rounded-full text-sm outline-none transition-colors"
        style={{
          background: '#F4FAF4',
          border: '1px solid transparent',
          color: '#243024',
        }}
        onFocus={(e) => {
          e.target.style.background = '#FFFFFF';
          e.target.style.border = '1px solid #DDF3DF';
        }}
        onBlur={(e) => {
          e.target.style.background = '#F4FAF4';
          e.target.style.border = '1px solid transparent';
        }}
      />
    </div>
  );
}

/* ─── Header Component ─── */
interface HeaderProps {
  onToast: (message: string) => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function Header({ onToast, onNavigate, onLogout }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6 py-4"
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E8F5E8',
      }}
    >
      {/* Search */}
      <SearchInput />

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <NotificationDropdown onToast={onToast} />
        <UserMenu onNavigate={onNavigate} onLogout={onLogout} />
      </div>
    </header>
  );
}
