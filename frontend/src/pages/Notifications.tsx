import { useState, useEffect } from 'react';
import { Bell, Check, Clock, Calendar, Sparkles, BarChart2, Play, Eye, Filter } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import notificationsService from '../services/notifications.service';
import socketService from '../services/socket.service';

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
    id: '1', category: 'pomodoro',
    title: 'Hết thời gian tập trung',
    description: 'Phiên Pomodoro 25 phút đã kết thúc. Hãy nghỉ ngơi 5 phút trước khi tiếp tục.',
    time: '5 phút trước', timeGroup: 'today', read: false,
  },
  {
    id: '2', category: 'pomodoro',
    title: 'Task đã đến giờ nhưng chưa bắt đầu',
    description: 'Task "Hoàn thành báo cáo Q3" đã đến giờ hẹn (14:00) nhưng chưa bấm Bắt đầu Pomodoro.',
    time: '12 phút trước', timeGroup: 'today', read: false, actionType: 'start_pomodoro',
  },
  {
    id: '3', category: 'schedule',
    title: 'Lên lịch tuần tự động hoàn tất',
    description: 'Đã sắp xếp 23 task vào lịch tuần mới. 5 task được ưu tiên cao đã dời sang khung giờ năng lượng cao.',
    time: '1 giờ trước', timeGroup: 'today', read: false, actionType: 'view_details',
  },
  {
    id: '4', category: 'schedule',
    title: 'Tái cấu trúc một chạm hoàn tất',
    description: '7 task đã được sắp xếp lại. Reschedule Frequency Score của bạn tăng 0.5 điểm (hiện tại 2.3/5).',
    time: '2 giờ trước', timeGroup: 'today', read: true, actionType: 'view_details',
  },
  {
    id: '5', category: 'ai_insights',
    title: 'AI Insights tuần 27 đã sẵn sàng',
    description: 'AI đã tổng hợp xong nhận xét hành vi làm việc tuần 27 của bạn. Bạn đạt 92% task priority cao!',
    time: '3 giờ trước', timeGroup: 'today', read: true, actionType: 'view_details',
  },
  {
    id: '6', category: 'productivity',
    title: 'Procrastination Score giảm xuống 28',
    description: 'Tuần này điểm trì hoãn của bạn đã giảm 12 điểm so với tuần trước. Xuất sắc!',
    time: '5 giờ trước', timeGroup: 'today', read: true,
  },
  {
    id: '7', category: 'pomodoro',
    title: 'Streak Pomodoro 5 ngày!',
    description: 'Bạn đã hoàn thành ít nhất 4 phiên Pomodoro mỗi ngày trong 5 ngày liên tiếp.',
    time: 'Hôm qua, 20:00', timeGroup: 'yesterday', read: true,
  },
  {
    id: '8', category: 'schedule',
    title: 'Nhắc deadline: Ôn thi Xác suất',
    description: 'Task "Ôn thi Xác suất" có deadline vào Thứ 6, 08:00. Còn 2 ngày nữa!',
    time: 'Hôm qua, 18:00', timeGroup: 'yesterday', read: true, actionType: 'view_details',
  },
  {
    id: '9', category: 'ai_insights',
    title: 'Phát hiện pattern: Giờ vàng 9-11 SA',
    description: 'AI nhận thấy bạn hoàn thành 40% nhiều task hơn trong khung giờ 9:00–11:00.',
    time: '2 ngày trước', timeGroup: 'week', read: true, actionType: 'view_details',
  },
  {
    id: '10', category: 'productivity',
    title: 'Báo cáo năng suất tuần',
    description: 'Tuần qua bạn hoàn thành 18/24 task (75%). Thời gian tập trung tổng cộng: 6 giờ 20 phút.',
    time: '3 ngày trước', timeGroup: 'week', read: true,
  },
];

/* ─── Config ─── */
const CATEGORY_CONFIG: Record<NotificationCategory, { icon: typeof Bell; color: string; bg: string; label: string }> = {
  pomodoro: { icon: Clock, color: '#E8993A', bg: '#FDEBD0', label: 'Pomodoro' },
  schedule: { icon: Calendar, color: '#4A7FB8', bg: '#DCECF8', label: 'Lịch trình' },
  ai_insights: { icon: Sparkles, color: '#9B59B6', bg: '#F0E8FA', label: 'AI Insights' },
  productivity: { icon: BarChart2, color: '#5FAF6E', bg: '#DDF3DF', label: 'Năng suất' },
};

const FILTER_OPTIONS: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'schedule', label: 'Lịch trình' },
  { value: 'ai_insights', label: 'AI Insights' },
  { value: 'productivity', label: 'Năng suất' },
];

const TIME_GROUP_LABELS: Record<string, string> = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  week: 'Tuần này',
};

/* ─── Notification Item ─── */
interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const config = CATEGORY_CONFIG[notification.category];
  const Icon = config.icon;

  return (
    <div
      className="flex items-start gap-4 px-5 py-4 transition-all"
      style={{
        background: notification.read ? 'transparent' : 'rgba(221, 243, 223, 0.3)',
        borderBottom: '1px solid #E8F5E8',
      }}
    >
      {/* Category icon */}
      <div
        className="flex items-center justify-center rounded-xl shrink-0"
        style={{ width: 40, height: 40, background: config.bg }}
      >
        <Icon size={18} style={{ color: config.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p
                className="text-sm font-semibold"
                style={{ color: notification.read ? '#5F6E5F' : '#243024' }}
              >
                {notification.title}
              </p>
              {!notification.read && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#5FAF6E' }} />
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#5F6E5F' }}>
              {notification.description}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{notification.time}</span>
              <Badge variant="neutral" className="text-xs">{config.label}</Badge>
              {notification.actionType && (
                <button
                  className="inline-flex items-center gap-1 text-xs font-semibold transition-colors"
                  style={{ color: '#5FAF6E' }}
                >
                  {notification.actionType === 'start_pomodoro' ? (
                    <><Play size={11} />Bắt đầu Pomodoro</>
                  ) : (
                    <><Eye size={11} />Xem chi tiết</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Mark read button */}
          {!notification.read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
              style={{ color: '#9CA3AF' }}
              title="Đánh dấu đã đọc"
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F4FAF4')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Check size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Notifications Page ─── */
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [loading, setLoading] = useState(true);

  /* Load from API */
  useEffect(() => {
    setLoading(true);
    notificationsService.getNotifications()
      .then((data) => {
        if (data.length > 0) setNotifications(data as any);
      })
      .catch(() => {
        // Giữ mock nếu API chưa có
      })
      .finally(() => setLoading(false));
  }, []);

  /* Listen to realtime notifications to update list dynamically */
  useEffect(() => {
    const handleRealtime = (data: any) => {
      setNotifications((prev) => {
        // Tránh trùng lặp id
        if (prev.some(n => n.id === data.id)) return prev;
        return [data, ...prev];
      });
    };

    socketService.onNotification(handleRealtime);

    return () => {
      socketService.offNotification(handleRealtime);
    };
  }, []);

  /* Dispatch custom event to notify other components (e.g., Sidebar) when notifications change */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('notifications_changed'));
  }, [notifications]);

  const filtered = notifications.filter(
    (n) => activeFilter === 'all' || n.category === activeFilter
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationsService.markAsRead(id);
    } catch {
      // Optimistic update - không rollback
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsService.markAllAsRead();
    } catch {
      // Optimistic update
    }
  };

  // Group by time
  const groups: Record<string, Notification[]> = {};
  for (const n of filtered) {
    if (!groups[n.timeGroup]) groups[n.timeGroup] = [];
    groups[n.timeGroup].push(n);
  }
  const groupOrder = ['today', 'yesterday', 'week'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <span className="text-sm" style={{ color: '#9CA3AF' }}>Đang tải thông báo...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-start justify-between gap-4 flex-wrap py-4 px-6 lg:px-10 mb-6"
        style={{ background: 'rgba(244, 250, 244, 0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #E8F5E8' }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>Thông báo</h1>
            {unreadCount > 0 && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: '#5FAF6E', color: '#FFFFFF' }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
            Cập nhật về task, lịch trình và nhận xét AI của bạn
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#DDF3DF', color: '#5FAF6E' }}
          >
            <Check size={16} />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </header>

      <div className="px-6 lg:px-10 pb-8">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter size={16} style={{ color: '#9CA3AF' }} />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeFilter === opt.value ? '#5FAF6E' : '#FFFFFF',
                color: activeFilter === opt.value ? '#FFFFFF' : '#5F6E5F',
                border: `1px solid ${activeFilter === opt.value ? '#5FAF6E' : '#E8F5E8'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #E8F5E8', boxShadow: '0 2px 16px rgba(36, 48, 36, 0.07)' }}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div
                className="flex items-center justify-center rounded-3xl mb-4"
                style={{ width: 80, height: 80, background: '#F4FAF4' }}
              >
                <Bell size={32} style={{ color: '#9CA3AF' }} />
              </div>
              <p className="text-base font-semibold" style={{ color: '#243024' }}>Không có thông báo</p>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Bạn đã xem hết tất cả thông báo rồi</p>
            </div>
          ) : (
            groupOrder.map((group) => {
              const items = groups[group];
              if (!items || items.length === 0) return null;

              return (
                <div key={group}>
                  {/* Group header */}
                  <div
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ background: '#F4FAF4', color: '#9CA3AF', borderBottom: '1px solid #E8F5E8' }}
                  >
                    {TIME_GROUP_LABELS[group]}
                  </div>

                  {/* Items */}
                  {items.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={markRead}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <p className="text-center text-xs mt-6" style={{ color: '#9CA3AF' }}>
            Hiển thị {filtered.length} thông báo gần nhất
          </p>
        )}
      </div>
    </div>
  );
}
