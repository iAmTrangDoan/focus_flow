import { useState, useEffect } from 'react';
import {
  User,
  Clock,
  Timer,
  Bell,
  Globe,
  AlertTriangle,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { createToast, type ToastMessage } from '../components/common/Toast';
import accountService from '../services/account.service';
import settingsService from '../services/settings.service';
import useAuthStore from '../store/authStore';


/* ─── Types ─── */
type Section = 'account' | 'work-hours' | 'pomodoro' | 'notifications' | 'timezone' | 'danger';

const DAY_BUTTONS = [
  { label: 'T2', index: 1 },
  { label: 'T3', index: 2 },
  { label: 'T4', index: 3 },
  { label: 'T5', index: 4 },
  { label: 'T6', index: 5 },
  { label: 'T7', index: 6 },
  { label: 'CN', index: 7 },
];

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'GMT+7 · Hồ Chí Minh' },
  { value: 'Asia/Bangkok', label: 'GMT+7 · Bangkok' },
  { value: 'Asia/Singapore', label: 'GMT+8 · Singapore' },
  { value: 'Asia/Tokyo', label: 'GMT+9 · Tokyo' },
  { value: 'America/Los_Angeles', label: 'GMT-8 · Los Angeles' },
  { value: 'America/New_York', label: 'GMT-5 · New York' },
  { value: 'Europe/London', label: 'GMT+0 · London' },
];

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

/* ─── Sub-components ─── */

interface SettingsNavProps {
  active: Section;
  onSelect: (section: Section) => void;
}

function SettingsNav({ active, onSelect }: SettingsNavProps) {
  const items: { id: Section; icon: typeof User; label: string }[] = [
    { id: 'account', icon: User, label: 'Tài khoản' },
    { id: 'work-hours', icon: Clock, label: 'Khung giờ làm việc' },
    { id: 'pomodoro', icon: Timer, label: 'Pomodoro' },
    { id: 'notifications', icon: Bell, label: 'Thông báo' },
    { id: 'timezone', icon: Globe, label: 'Múi giờ & Ngôn ngữ' },
    { id: 'danger', icon: AlertTriangle, label: 'Vùng nguy hiểm' },
  ];

  return (
    <nav className="sticky top-8">
      <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8F5E8' }}>
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
              style={{
                background: isActive ? '#DDF3DF' : 'transparent',
                color: isActive ? '#5FAF6E' : '#5F6E5F',
                borderBottom: idx < items.length - 1 ? '1px solid #E8F5E8' : 'none',
              }}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 px-6 pt-6">
      <h2 className="text-lg font-semibold" style={{ color: '#243024' }}>{title}</h2>
      {subtitle && <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>{subtitle}</p>}
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative shrink-0 rounded-full transition-colors duration-200"
      style={{
        width: 44, height: 26,
        background: checked ? '#5FAF6E' : '#E8F5E8',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className="absolute top-1 rounded-full transition-all duration-200"
        style={{ width: 20, height: 20, background: '#FFFFFF', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', left: checked ? 22 : 4 }}
      />
    </button>
  );
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="px-3 py-2 rounded-xl text-sm font-medium outline-none transition-colors border"
      style={{
        background: '#FFFFFF',
        borderColor: '#E8F5E8',
        color: '#243024',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}

interface DropdownProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  minWidth?: number;
}

function Dropdown({ value, options, onChange, minWidth = 200 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative" style={{ minWidth }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm"
        style={{ background: '#FFFFFF', border: '1px solid #E8F5E8', color: '#243024' }}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} style={{ color: '#9CA3AF' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
            style={{ background: '#FFFFFF', border: '1px solid #E8F5E8', boxShadow: '0 8px 24px rgba(36, 48, 36, 0.12)' }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full px-3 py-2.5 text-left text-sm transition-colors"
                style={{ background: value === opt.value ? '#DDF3DF' : 'transparent', color: '#243024' }}
                onMouseEnter={(e) => { if (value !== opt.value) e.currentTarget.style.background = '#F4FAF4'; }}
                onMouseLeave={(e) => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
}

function Input({ value, onChange, placeholder, type = 'text', disabled, className }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors ${className || ''}`}
      style={{ background: '#FFFFFF', border: '1px solid #E8F5E8', color: '#243024', opacity: disabled ? 0.6 : 1 }}
      onFocus={(e) => (e.target.style.borderColor = '#5FAF6E')}
      onBlur={(e) => (e.target.style.borderColor = '#E8F5E8')}
    />
  );
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
}

function Button({ children, onClick, variant = 'primary', disabled, className }: ButtonProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#5FAF6E', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(95, 175, 110, 0.3)' },
    secondary: { background: '#DDF3DF', color: '#5FAF6E' },
    danger: { background: 'transparent', color: '#C1644C', border: '1px solid #F5D0C5' },
    ghost: { background: 'transparent', color: '#5F6E5F' },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail: string;
}

function DeleteAccountModal({ open, onClose, onConfirm, userEmail }: DeleteAccountModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [step, setStep] = useState(1);

  const handleConfirm = () => {
    if (emailInput === userEmail) {
      onConfirm();
      setStep(1);
      setEmailInput('');
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmailInput('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Xóa tài khoản" width={480}>
      <div className="p-6">
        {step === 1 ? (
          <>
            <div className="flex items-center justify-center rounded-2xl mb-6" style={{ width: 64, height: 64, background: '#FDF4F2', margin: '0 auto' }}>
              <AlertTriangle size={28} style={{ color: '#C1644C' }} />
            </div>
            <p className="text-center mb-6" style={{ color: '#243024' }}>
              Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn bao gồm tasks, lịch sử
              focus sessions và cài đặt sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={handleClose}>Hủy</Button>
              <Button variant="danger" onClick={() => setStep(2)}>Tiếp tục</Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4" style={{ color: '#243024' }}>
              Nhập email <strong>{userEmail}</strong> để xác nhận xóa tài khoản:
            </p>
            <Input value={emailInput} onChange={setEmailInput} placeholder="Nhập email của bạn" />
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="ghost" onClick={handleClose}>Hủy</Button>
              <Button variant="danger" onClick={handleConfirm} disabled={emailInput !== userEmail}>
                Xóa tài khoản
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ─── Section Components ─── */

function AccountSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const setUser = useAuthStore((state) => state.setUser);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  //Load profile người dùng

  useEffect(() => {
    accountService.getProfile()
      .then((profile) => {
        setDisplayName(profile.displayName ?? '');
        setEmail(profile.email ?? '');
      })
      .catch(() => {
        setDisplayName('User');
      });
  }, []);

  const handleSaveProfile = async () => {
    const normalizedDisplayName = displayName.trim();

    if (!normalizedDisplayName) {
      onToast(createToast('error', 'Tên hiển thị không được để trống'));
      return;
    }
    setSavingProfile(true);
    try {
      const updatedUser = await accountService.updateProfile({ displayName: normalizedDisplayName, });

      setDisplayName(updatedUser.displayName ?? '');

      setUser(updatedUser);

      onToast(createToast('success', 'Đã lưu thay đổi tài khoản'));

    } catch (err: any) {
      onToast(createToast('error', err?.message ?? 'Không thể lưu thay đổi'));
    }
    finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      onToast(createToast('error', 'Mật khẩu xác nhận không khớp'));
      return;
    }
    setSavingPassword(true);
    try {
      await accountService.changePassword({ current: currentPassword, next: newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      onToast(createToast('success', 'Đã cập nhật mật khẩu'));
    } catch (err: any) {
      onToast(createToast('error', err?.message ?? 'Không thể đổi mật khẩu. Kiểm tra mật khẩu hiện tại.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader title="Thông tin tài khoản" />
        <div className="px-6 pb-6">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative rounded-full flex items-center justify-center text-2xl font-bold shrink-0 shadow-inner" style={{ width: 96, height: 96, background: '#5FAF6E', color: '#fff' }}>
              {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </div>
            <div>
              <p className="text-xs mt-2" style={{ color: '#5F6E5F' }}>Ảnh đại diện được tạo tự động từ tên hiển thị của bạn.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>Tên hiển thị</label>
              <Input value={displayName} onChange={setDisplayName} placeholder="Nhập tên của bạn" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>Email</label>
              <div className="flex items-center gap-2">
                <Input value={email} onChange={() => { }} disabled />
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Đổi mật khẩu" />
        <div className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>Mật khẩu hiện tại</label>
            <Input type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="Nhập mật khẩu hiện tại" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>Mật khẩu mới</label>
            <Input type="password" value={newPassword} onChange={setNewPassword} placeholder="Nhập mật khẩu mới" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>Xác nhận mật khẩu mới</label>
            <Input type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Nhập lại mật khẩu mới" />
          </div>
          <div className="pt-4 flex justify-end">
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? 'Đang cập nhận...' : 'Cập nhật mật khẩu'}
            </Button>
          </div>
        </div>
      </Card>

    </div>
  );
}


function WorkHoursSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  //Load user preference

  useEffect(() => {
    setLoading(true);
    settingsService.getPreferences()
      .then((prefs) => {
        setWorkStartTime(prefs.workStartTime ?? '09:00');
        setWorkEndTime(prefs.workEndTime ?? '18:00');
        setWorkDays(prefs.workDays ?? [1, 2, 3, 4, 5]);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (dayIndex: number) => {
    setWorkDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const toMinutes = (hhmm: string): number => {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const handleSave = async () => {
    const startMin = toMinutes(workStartTime);
    const endMin = toMinutes(workEndTime);

    if (startMin === endMin) {
      onToast(createToast('error', 'Giờ bắt đầu và kết thúc không được giống nhau'));
      return;
    }

    const isOvernight = endMin < startMin;
    const duration = isOvernight ? (24 * 60 - startMin + endMin) : (endMin - startMin);

    if (duration < 30) {
      onToast(createToast('error', 'Khung giờ làm việc tối thiểu là 30 phút'));
      return;
    }
    if (duration > 720) {
      onToast(createToast('error', 'Khung giờ làm việc tối đa là 12 tiếng'));
      return;
    }

    setSaving(true);
    try {
      await settingsService.updatePreferences({
        workStartTime,
        workEndTime,
        workDays,
      });
      onToast(createToast('success', 'Đã cập nhật khung giờ làm việc'));
    } catch {
      onToast(createToast('error', 'Không thể lưu cấu hình. Thử lại sau.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <SectionHeader title="Khung giờ làm việc" subtitle="Đang tải dữ liệu..." />
        <div className="px-6 py-10 text-center text-sm" style={{ color: '#9CA3AF' }}>
          Đang tải cấu hình khung giờ làm việc của bạn...
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader
        title="Khung giờ làm việc"
        subtitle="FocusFlow sẽ ưu tiên xếp lịch dựa trên khung giờ và những ngày bạn làm việc hiệu quả nhất"
      />
      <div className="px-6 pb-6 space-y-8">

        {/* Khung giờ làm việc mặc định */}
        <div className="p-5 rounded-2xl" style={{ background: '#F4FAF4', border: '1px solid #E8F5E8' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#243024' }}>Khung giờ làm việc mặc định</h3>
          <p className="text-xs mb-4" style={{ color: '#5F6E5F' }}>Chọn khoảng thời gian bạn tập trung giải quyết công việc tốt nhất trong ngày.</p>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: '#5F6E5F' }}>Từ</span>
              <TimePicker value={workStartTime} onChange={setWorkStartTime} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: '#5F6E5F' }}>đến</span>
              <TimePicker value={workEndTime} onChange={setWorkEndTime} />
            </div>
          </div>

          <div className="mt-5">
            <div className="relative h-8 rounded-xl overflow-hidden" style={{ background: '#E8F5E8' }}>
              {HOURS.map((hour, i) => {
                const h = parseInt(hour);
                const startH = parseInt(workStartTime.split(':')[0]);
                const endH = parseInt(workEndTime.split(':')[0]);
                const isActive = endH >= startH
                  ? (h >= startH && h < endH)
                  : (h >= startH || h < endH);
                return (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 transition-all duration-300"
                    style={{
                      left: `${(i / 24) * 100}%`,
                      width: `${100 / 24}%`,
                      background: isActive ? '#5FAF6E' : 'transparent'
                    }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5 px-1">
              <span className="text-xs" style={{ color: '#9CA3AF' }}>0h</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>12h</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>24h</span>
            </div>
          </div>

          {(() => {
            const startMin = toMinutes(workStartTime);
            const endMin = toMinutes(workEndTime);
            if (isNaN(startMin) || isNaN(endMin)) return null;
            const isOvernight = endMin < startMin;
            const duration = isOvernight ? (24 * 60 - startMin + endMin) : (endMin - startMin);
            const hrs = Math.floor(duration / 60);
            const mins = duration % 60;
            return (
              <div className="flex items-center gap-3 mt-4 flex-wrap text-xs font-semibold">
                {isOvernight && (
                  <span className="px-2.5 py-1 rounded-xl text-amber-700 bg-amber-50 border border-amber-200 flex items-center gap-1">
                    🌙 Ca qua ngày hôm sau
                  </span>
                )}
                <span style={{ color: '#5F6E5F' }}>
                  Thời lượng làm việc: {hrs} giờ {mins > 0 ? `${mins} phút` : ''}
                </span>
              </div>
            );
          })()}
        </div>

        {/*Ngày làm việc trong tuần*/}
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#243024' }}>Ngày làm việc trong tuần (Working Days)</h3>
          <p className="text-xs mb-4" style={{ color: '#5F6E5F' }}>Chọn các ngày bạn hoạt động làm việc. Các ngày tắt sẽ được coi là ngày nghỉ.</p>

          <div className="flex items-center gap-3.5 flex-wrap">
            {DAY_BUTTONS.map((day) => {
              const isEnabled = workDays.includes(day.index);
              return (
                <button
                  key={day.index}
                  onClick={() => toggleDay(day.index)}
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 active:scale-95 shadow-sm"
                  style={{
                    background: isEnabled ? '#5FAF6E' : '#FFFFFF',
                    color: isEnabled ? '#FFFFFF' : '#9CA3AF',
                    border: isEnabled ? '1px solid #5FAF6E' : '1px solid #E8F5E8',
                  }}
                  title={isEnabled ? `Đang bật: ${day.label}` : `Đang tắt: ${day.label}`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nút Lưu */}
        <div className="flex justify-end pt-4" style={{ borderTop: '1px solid #E8F5E8' }}>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu cấu hình khung giờ'}
          </Button>
        </div>

      </div>
    </Card>
  );
}


function PomodoroSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [autoStart, setAutoStart] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const handleSave = () => onToast(createToast('success', 'Đã lưu cấu hình Pomodoro'));

  return (
    <Card>
      <SectionHeader title="Cấu hình Pomodoro" />
      <div className="px-6 pb-6">
        <div className="space-y-4 mb-6">
          {[
            { label: 'Tự động chuyển sang phiên tiếp theo', desc: 'Bắt đầu phiên mới ngay sau khi kết thúc', val: autoStart, set: setAutoStart },
            { label: 'Phát âm thanh thông báo khi hết giờ', desc: 'Âm thanh nhắc nhở khi kết thúc phiên', val: soundEnabled, set: setSoundEnabled },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F4FAF4' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: '#243024' }}>{item.label}</p>
                <p className="text-xs" style={{ color: '#5F6E5F' }}>{item.desc}</p>
              </div>
              <Toggle checked={item.val} onChange={item.set} />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Lưu cấu hình</Button>
        </div>
      </div>
    </Card>
  );
}

function NotificationsSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [settings, setSettings] = useState({
    pomodoroEnd: true, taskOverdue: true, scheduleSuccess: true,
    aiInsights: true, deadlineReminder: true, procrastinationScore: false,
  });

  const notificationItems = [
    { key: 'pomodoroEnd', title: 'Nhắc hết giờ Pomodoro', description: 'Thông báo khi phiên tập trung hoặc nghỉ kết thúc' },
    { key: 'taskOverdue', title: 'Cảnh báo task quá giờ chưa bắt đầu', description: 'Nhắc nhở khi task đã đến giờ nhưng chưa được bắt đầu' },
    { key: 'scheduleSuccess', title: 'Lên lịch tự động thành công', description: 'Thông báo khi AI hoàn tất việc xếp lịch tuần mới' },
    { key: 'aiInsights', title: 'AI Insights tuần mới', description: 'Nhận thông báo khi có nhận xét mới từ AI' },
    { key: 'deadlineReminder', title: 'Nhắc deadline sắp tới', description: 'Cảnh báo trước khi task đến hạn' },
    { key: 'procrastinationScore', title: 'Procrastination Score hằng ngày', description: 'Báo cáo điểm trì hoãn mỗi ngày' },
  ] as const;

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    onToast(createToast('success', 'Đã cập nhật cài đặt thông báo'));
  };

  return (
    <Card>
      <SectionHeader title="Cài đặt thông báo" />
      <div className="px-6 pb-6 space-y-3">
        {notificationItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F4FAF4' }}>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#243024' }}>{item.title}</p>
              <p className="text-xs" style={{ color: '#5F6E5F' }}>{item.description}</p>
            </div>
            <Toggle checked={settings[item.key]} onChange={() => handleToggle(item.key)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function TimezoneLanguageSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [language, setLanguage] = useState('vi');
  const handleSave = () => onToast(createToast('success', 'Đã lưu cài đặt múi giờ và ngôn ngữ'));

  return (
    <Card>
      <SectionHeader title="Múi giờ & Ngôn ngữ" />
      <div className="px-6 pb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>Múi giờ</label>
          <Dropdown value={timezone} options={TIMEZONES} onChange={setTimezone} minWidth={280} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>Ngôn ngữ</label>
          <Dropdown value={language} options={LANGUAGES} onChange={setLanguage} minWidth={200} />
        </div>
        <div className="pt-6 flex justify-end">
          <Button onClick={handleSave}>Lưu thay đổi</Button>
        </div>
      </div>
    </Card>
  );
}

function DangerZoneSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    accountService.getProfile()
      .then((profile) => setUserEmail(profile.email ?? ''))
      .catch(() => { });
  }, []);

  const handleDelete = () => {
    setShowDeleteModal(false);
    onToast(createToast('error', 'Tài khoản đã được lên lịch xóa sau 30 ngày'));
  };

  return (
    <>
      <Card style={{ borderColor: '#F5D0C5', background: 'linear-gradient(to bottom, #FDF8F6, #FFFFFF)' }}>
        <SectionHeader title="Vùng nguy hiểm" />
        <div className="px-6 pb-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 48, height: 48, background: '#FDF4F2' }}>
              <AlertTriangle size={24} style={{ color: '#C1644C' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm mb-4" style={{ color: '#243024' }}>
                Xóa tài khoản sẽ loại bỏ vĩnh viễn tất cả dữ liệu của bạn. Hành động này không thể hoàn tác.
              </p>
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={16} className="mr-2 inline" />Xóa tài khoản
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <DeleteAccountModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        userEmail={userEmail}
      />
    </>
  );
}

/* ─── Main Settings Page ─── */
interface SettingsPageProps {
  onToast: (toast: ToastMessage) => void;
}

export default function SettingsPage({ onToast }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<Section>('account');

  return (
    <div className="flex flex-col min-h-full">
      <header
        className="sticky top-0 z-30 py-4 px-6 lg:px-10 mb-8"
        style={{ background: 'rgba(244, 250, 244, 0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #E8F5E8' }}
      >
        <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>Cài đặt</h1>
        <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>Quản lý tài khoản và tùy chỉnh trải nghiệm FocusFlow</p>
      </header>

      <div className="px-6 lg:px-10 pb-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block" style={{ width: 240 }}>
            <SettingsNav active={activeSection} onSelect={setActiveSection} />
          </aside>

          <main className="flex-1 max-w-3xl">
            {activeSection === 'account' && <AccountSection onToast={onToast} />}
            {activeSection === 'work-hours' && <WorkHoursSection onToast={onToast} />}
            {activeSection === 'pomodoro' && <PomodoroSection onToast={onToast} />}
            {activeSection === 'notifications' && <NotificationsSection onToast={onToast} />}
            {activeSection === 'timezone' && <TimezoneLanguageSection onToast={onToast} />}
            {activeSection === 'danger' && <DangerZoneSection onToast={onToast} />}
          </main>
        </div>
      </div>
    </div>
  );
}
