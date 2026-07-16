import { useState, useRef, useEffect } from 'react';
import { Camera, Pencil, Eye, EyeOff, Check, ChevronDown, Loader2 } from 'lucide-react';
import type { ActivityEvent, ActivityType, UserProfile } from '../types';
import { createToast, type ToastMessage } from '../components/common/Toast';
import accountService from '../services/account.service';

/* ─── Activity dot colors by type ─── */
const activityStyle: Record<ActivityType, { dot: string; badge: string; badgeText: string; label: string }> = {
  task: { dot: '#5FAF6E', badge: '#DDF3DF', badgeText: '#4A9459', label: 'Task' },
  pomodoro: { dot: '#E8993A', badge: '#FDEBD0', badgeText: '#B8660B', label: 'Pomodoro' },
  schedule: { dot: '#4A7FB8', badge: '#DCECF8', badgeText: '#4A7FB8', label: 'Lịch trình' },
  ai: { dot: '#9B59B6', badge: '#F0E8FA', badgeText: '#7D3C98', label: 'AI' },
};

type FilterType = 'all' | ActivityType;

interface ProfilePageProps {
  user: UserProfile;
  onUserChange: (updated: UserProfile) => void;
  onToast: (t: ToastMessage) => void;
}

/* ─── Password Card ─── */
function PasswordCard({ onToast }: { onToast: (t: ToastMessage) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ next?: string; confirm?: string }>({});

  const validate = () => {
    const e: { next?: string; confirm?: string } = {};
    if (next.length < 6) e.next = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    if (next !== confirm) e.confirm = 'Xác nhận mật khẩu không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await accountService.changePassword({ current, next });
      setCurrent(''); setNext(''); setConfirm('');
      setErrors({});
      onToast(createToast('success', 'Mật khẩu đã được cập nhật thành công!'));
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Mật khẩu hiện tại không đúng.';
      onToast(createToast('error', msg));
    }
  };

  const inputBase = 'w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200';

  return (
    <div
      className="rounded-3xl p-6"
      style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}
    >
      <h3 className="text-base font-semibold mb-5" style={{ color: '#243024' }}>Đổi mật khẩu</h3>
      <div className="space-y-4">
        {/* Current password */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#9CA3AF' }}>
            Mật khẩu hiện tại
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
              className={inputBase + ' pr-10'}
              style={{ background: '#F4FAF4', color: '#243024', border: '1.5px solid #E8F5E8' }}
              onFocus={(e) => (e.target.style.borderColor = '#5FAF6E')}
              onBlur={(e) => (e.target.style.borderColor = '#E8F5E8')}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#9CA3AF' }}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#9CA3AF' }}>
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={(e) => { setNext(e.target.value); setErrors((p) => ({ ...p, next: undefined })); }}
              placeholder="Tối thiểu 6 ký tự"
              className={inputBase + ' pr-10'}
              style={{
                background: '#F4FAF4', color: '#243024',
                border: `1.5px solid ${errors.next ? '#C1644C' : '#E8F5E8'}`,
              }}
              onFocus={(e) => { if (!errors.next) e.target.style.borderColor = '#5FAF6E'; }}
              onBlur={(e) => { if (!errors.next) e.target.style.borderColor = '#E8F5E8'; }}
            />
            <button
              type="button"
              onClick={() => setShowNext((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#9CA3AF' }}
            >
              {showNext ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.next && <p className="text-xs mt-1" style={{ color: '#C1644C' }}>{errors.next}</p>}
        </div>

        {/* Confirm password */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#9CA3AF' }}>
            Xác nhận mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: undefined })); }}
              placeholder="Nhập lại mật khẩu mới"
              className={inputBase + ' pr-10'}
              style={{
                background: '#F4FAF4', color: '#243024',
                border: `1.5px solid ${errors.confirm ? '#C1644C' : '#E8F5E8'}`,
              }}
              onFocus={(e) => { if (!errors.confirm) e.target.style.borderColor = '#5FAF6E'; }}
              onBlur={(e) => { if (!errors.confirm) e.target.style.borderColor = '#E8F5E8'; }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#9CA3AF' }}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirm && <p className="text-xs mt-1" style={{ color: '#C1644C' }}>{errors.confirm}</p>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!current || !next || !confirm}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#5FAF6E', color: '#fff' }}
        >
          Cập nhật mật khẩu
        </button>
      </div>
    </div>
  );
}

/* ─── Activity Timeline ─── */
function ActivityTimeline() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [logs, setLogs] = useState<ActivityEvent[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'task', label: 'Task' },
    { value: 'pomodoro', label: 'Pomodoro' },
    { value: 'schedule', label: 'Lịch trình' },
  ];

  useEffect(() => {
    setApiLoading(true);
    setVisibleCount(6);
    accountService.getActivityLogs(filter)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setApiLoading(false));
  }, [filter]);

  const filtered = logs;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const loadMore = () => {
    setLoadMoreLoading(true);
    setTimeout(() => {
      setVisibleCount((v) => v + 4);
      setLoadMoreLoading(false);
    }, 300);
  };

  return (
    <div
      className="rounded-3xl p-6 flex flex-col h-full"
      style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h3 className="text-base font-semibold" style={{ color: '#243024' }}>Lịch sử hoạt động</h3>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F4FAF4' }}>
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setVisibleCount(6); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={filter === f.value
                ? { background: '#FFFFFF', color: '#5FAF6E', boxShadow: '0 1px 4px rgba(36,48,36,0.08)' }
                : { color: '#5F6E5F' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Vertical line */}
        <div
          className="absolute left-[7px] top-2 bottom-0 w-px"
          style={{ background: '#DDF3DF' }}
        />

        <div className="flex flex-col gap-5">
          {visible.map((event) => {
            const style = activityStyle[event.type];
            return (
              <div key={event.id} className="flex items-start gap-4 pl-1">
                {/* Dot */}
                <div
                  className="relative z-10 shrink-0 rounded-full mt-0.5"
                  style={{ width: 14, height: 14, background: style.dot, boxShadow: `0 0 0 3px ${style.badge}` }}
                />
                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#243024' }}>{event.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#5F6E5F' }}>{event.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{event.relativeTime}</span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: style.badge, color: style.badgeText }}
                      >
                        {style.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Skeleton loading — khi đang tải lần đầu */}
          {apiLoading && (
            <div className="flex flex-col gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4 pl-1 animate-pulse">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5" style={{ background: '#DDF3DF' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded-lg w-3/4" style={{ background: '#F4FAF4' }} />
                    <div className="h-3 rounded-lg w-1/2" style={{ background: '#F4FAF4' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Load more */}
      {hasMore && !apiLoading && (
        <button
          onClick={loadMore}
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 hover:bg-gray-50"
          style={{ color: '#5FAF6E', border: '1px solid #DDF3DF' }}
        >
          <ChevronDown size={16} /> Xem thêm
        </button>
      )}
      {loadMoreLoading && (
        <div className="mt-4 w-full flex items-center justify-center py-2">
          <Loader2 size={18} className="animate-spin" style={{ color: '#5FAF6E' }} />
        </div>
      )}
    </div>
  );
}

/* ─── Main ProfilePage ─── */
export default function ProfilePage({ user, onUserChange, onToast }: ProfilePageProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const isDirty = draftName.trim() !== user.name || avatarPreview !== user.avatarUrl;
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!isDirty) return;
    try {
      await accountService.updateProfile({ name: draftName.trim(), avatarUrl: avatarPreview });
      onUserChange({ ...user, name: draftName.trim(), avatarUrl: avatarPreview });
      setEditingName(false);
      onToast(createToast('success', 'Thông tin cá nhân đã được lưu!'));
    } catch {
      onToast(createToast('error', 'Lỗi lưu thông tin cá nhân.'));
    }
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>Hồ sơ cá nhân</h1>
        <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>Quản lý thông tin tài khoản và bảo mật của bạn</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left column ─── */}
        <div className="flex flex-col gap-5">
          {/* Personal info card */}
          <div
            className="rounded-3xl p-6"
            style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}
          >
            <h3 className="text-base font-semibold mb-5" style={{ color: '#243024' }}>Thông tin cá nhân</h3>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="relative cursor-pointer group"
                style={{ width: 120, height: 120 }}
                onClick={() => fileRef.current?.click()}
              >
                <div
                  className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold"
                  style={{
                    background: avatarPreview ? 'transparent' : '#DDF3DF',
                    color: '#5FAF6E',
                    border: '3px solid #DDF3DF',
                  }}
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                    : initials}
                </div>
                {/* Overlay */}
                <div
                  className="absolute inset-0 rounded-full flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(36,48,36,0.55)' }}
                >
                  <Camera size={22} color="#fff" />
                  <span className="text-xs text-white font-medium">Đổi ảnh</span>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#9CA3AF' }}>
                Tên hiển thị
              </label>
              <div className="relative flex items-center">
                {editingName ? (
                  <input
                    autoFocus
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false); if (e.key === 'Escape') { setDraftName(user.name); setEditingName(false); } }}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm font-semibold outline-none"
                    style={{ background: '#F4FAF4', color: '#243024', border: '1.5px solid #5FAF6E' }}
                  />
                ) : (
                  <div
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: '#F4FAF4', color: '#243024', border: '1.5px solid transparent' }}
                  >
                    {draftName}
                  </div>
                )}
                <button
                  onClick={() => setEditingName((v) => !v)}
                  className="absolute right-3 transition-colors"
                  style={{ color: editingName ? '#5FAF6E' : '#9CA3AF' }}
                >
                  {editingName ? <Check size={16} /> : <Pencil size={15} />}
                </button>
              </div>
            </div>

            {/* Email */}
            <div className="mb-6">
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#9CA3AF' }}>
                Email
              </label>
              <div
                className="px-4 py-2.5 rounded-xl text-sm"
                style={{ background: '#F9FAFB', color: '#9CA3AF', border: '1.5px solid #F3F4F6' }}
              >
                {user.email}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#5FAF6E', color: '#fff' }}
            >
              Lưu thay đổi
            </button>
          </div>

          {/* Password card */}
          <PasswordCard onToast={onToast} />
        </div>

        {/* ─── Right column ─── */}
        <div className="lg:col-span-2" style={{ minHeight: 600 }}>
          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
}
