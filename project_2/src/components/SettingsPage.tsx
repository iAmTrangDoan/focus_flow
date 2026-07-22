import { useState, useRef } from 'react';
import {
  User,
  Clock,
  Timer,
  Bell,
  Globe,
  AlertTriangle,
  Camera,
  Copy,
  Plus,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { createToast, type ToastMessage } from './ui/Toast';

/* ─── Types ─── */
type Section = 'account' | 'work-hours' | 'pomodoro' | 'notifications' | 'timezone' | 'danger';

interface WorkDay {
  day: string;
  dayIndex: number;
  enabled: boolean;
  slots: { start: string; end: string }[];
}

/* ─── Mock Data ─── */
const INITIAL_WORK_DAYS: WorkDay[] = [
  { day: 'Thứ 2', dayIndex: 1, enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' }] },
  { day: 'Thứ 3', dayIndex: 2, enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' }] },
  { day: 'Thứ 4', dayIndex: 3, enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' }] },
  { day: 'Thứ 5', dayIndex: 4, enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' }] },
  { day: 'Thứ 6', dayIndex: 5, enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:30', end: '17:30' }] },
  { day: 'Thứ 7', dayIndex: 6, enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
  { day: 'Chủ Nhật', dayIndex: 0, enabled: false, slots: [] },
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
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

/* ─── Sub-components ─── */

// Settings Navigation
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
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8F5E8',
        }}
      >
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
                borderBottom:
                  idx < items.length - 1 ? '1px solid #E8F5E8' : 'none',
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

// Section Header
function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold" style={{ color: '#243024' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// Toggle Switch
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
        width: 44,
        height: 26,
        background: checked ? '#5FAF6E' : '#E8F5E8',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className="absolute top-1 rounded-full transition-transform duration-200"
        style={{
          width: 20,
          height: 20,
          background: '#FFFFFF',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          left: checked ? 22 : 4,
        }}
      />
    </button>
  );
}

// Time Picker Dropdown
interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative" style={{ minWidth: 100 }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8F5E8',
          color: '#243024',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span>{value}</span>
        <ChevronDown size={14} style={{ color: '#9CA3AF' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 max-h-48 overflow-y-auto"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8F5E8',
              boxShadow: '0 8px 24px rgba(36, 48, 36, 0.12)',
            }}
          >
            {HALF_HOURS.map((time) => (
              <button
                key={time}
                onClick={() => {
                  onChange(time);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm transition-colors"
                style={{
                  background: value === time ? '#DDF3DF' : 'transparent',
                  color: '#243024',
                }}
                onMouseEnter={(e) => {
                  if (value !== time) e.currentTarget.style.background = '#F4FAF4';
                }}
                onMouseLeave={(e) => {
                  if (value !== time) e.currentTarget.style.background = 'transparent';
                }}
              >
                {time}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Generic Dropdown
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
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8F5E8',
          color: '#243024',
        }}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} style={{ color: '#9CA3AF' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8F5E8',
              boxShadow: '0 8px 24px rgba(36, 48, 36, 0.12)',
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full px-3 py-2.5 text-left text-sm transition-colors"
                style={{
                  background: value === opt.value ? '#DDF3DF' : 'transparent',
                  color: '#243024',
                }}
                onMouseEnter={(e) => {
                  if (value !== opt.value) e.currentTarget.style.background = '#F4FAF4';
                }}
                onMouseLeave={(e) => {
                  if (value !== opt.value) e.currentTarget.style.background = 'transparent';
                }}
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

// Input Field
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
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8F5E8',
        color: '#243024',
        opacity: disabled ? 0.6 : 1,
      }}
      onFocus={(e) => (e.target.style.borderColor = '#5FAF6E')}
      onBlur={(e) => (e.target.style.borderColor = '#E8F5E8')}
    />
  );
}

// Primary Button
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
}

function Button({ children, onClick, variant = 'primary', disabled, className }: ButtonProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: '#5FAF6E',
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(95, 175, 110, 0.3)',
    },
    secondary: {
      background: '#DDF3DF',
      color: '#5FAF6E',
    },
    danger: {
      background: 'transparent',
      color: '#C1644C',
      border: '1px solid #F5D0C5',
    },
    ghost: {
      background: 'transparent',
      color: '#5F6E5F',
    },
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

// Delete Account Modal
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
            <div
              className="flex items-center justify-center rounded-2xl mb-6"
              style={{
                width: 64,
                height: 64,
                background: '#FDF4F2',
                margin: '0 auto',
              }}
            >
              <AlertTriangle size={28} style={{ color: '#C1644C' }} />
            </div>
            <p className="text-center mb-6" style={{ color: '#243024' }}>
              Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn bao gồm tasks, lịch sử
              focus sessions và cài đặt sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={handleClose}>
                Hủy
              </Button>
              <Button variant="danger" onClick={() => setStep(2)}>
                Tiếp tục
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4" style={{ color: '#243024' }}>
              Nhập email <strong>{userEmail}</strong> để xác nhận xóa tài khoản:
            </p>
            <Input
              value={emailInput}
              onChange={setEmailInput}
              placeholder="Nhập email của bạn"
            />
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="ghost" onClick={handleClose}>
                Hủy
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirm}
                disabled={emailInput !== userEmail}
              >
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

// Account Section
function AccountSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [displayName, setDisplayName] = useState('Nguyễn Văn A');
  const [email] = useState('nguyenvana@email.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = () => {
    onToast(createToast('success', 'Đã lưu thay đổi tài khoản'));
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      onToast(createToast('warning', 'Mật khẩu xác nhận không khớp'));
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onToast(createToast('success', 'Đã cập nhật mật khẩu'));
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader title="Thông tin tài khoản" />

        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8">
          <div
            className="relative rounded-full overflow-hidden"
            style={{ width: 96, height: 96 }}
          >
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              style={{ background: 'rgba(36, 48, 36, 0.5)' }}
            >
              <Camera size={24} style={{ color: '#FFFFFF' }} />
            </div>
          </div>
          <div>
            <Button variant="secondary">
              <Camera size={16} className="mr-2" />
              Đổi ảnh
            </Button>
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
              JPG, PNG. Tối đa 2MB.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#243024' }}
            >
              Tên hiển thị
            </label>
            <Input
              value={displayName}
              onChange={setDisplayName}
              placeholder="Nhập tên của bạn"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#243024' }}
            >
              Email
            </label>
            <div className="flex items-center gap-2">
              <Input value={email} onChange={() => {}} disabled />
              <Badge variant="neutral">Đã xác thực</Badge>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSaveProfile}>Lưu thay đổi</Button>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <SectionHeader title="Đổi mật khẩu" />

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#243024' }}
            >
              Mật khẩu hiện tại
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#243024' }}
            >
              Mật khẩu mới
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Nhập mật khẩu mới"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: '#243024' }}
            >
              Xác nhận mật khẩu mới
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleChangePassword}>Cập nhật mật khẩu</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Work Hours Section
function WorkHoursSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [workDays, setWorkDays] = useState<WorkDay[]>(INITIAL_WORK_DAYS);
  const [energySlotStart, setEnergySlotStart] = useState('09:00');
  const [energySlotEnd, setEnergySlotEnd] = useState('11:00');

  const toggleDay = (dayIndex: number) => {
    setWorkDays((prev) =>
      prev.map((d) =>
        d.dayIndex === dayIndex
          ? {
              ...d,
              enabled: !d.enabled,
              slots: !d.enabled ? [{ start: '08:00', end: '12:00' }] : [],
            }
          : d
      )
    );
  };

  const addSlot = (dayIndex: number) => {
    setWorkDays((prev) =>
      prev.map((d) =>
        d.dayIndex === dayIndex
          ? { ...d, slots: [...d.slots, { start: '14:00', end: '18:00' }] }
          : d
      )
    );
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    setWorkDays((prev) =>
      prev.map((d) =>
        d.dayIndex === dayIndex
          ? { ...d, slots: d.slots.filter((_, i) => i !== slotIndex) }
          : d
      )
    );
  };

  const updateSlot = (
    dayIndex: number,
    slotIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setWorkDays((prev) =>
      prev.map((d) =>
        d.dayIndex === dayIndex
          ? {
              ...d,
              slots: d.slots.map((s, i) =>
                i === slotIndex ? { ...s, [field]: value } : s
              ),
            }
          : d
      )
    );
  };

  const copyMondayToAll = () => {
    const mondaySlots = workDays.find((d) => d.dayIndex === 1)?.slots || [];
    setWorkDays((prev) =>
      prev.map((d) => (d.dayIndex > 0 && d.dayIndex < 7 ? { ...d, slots: [...mondaySlots] } : d))
    );
    onToast(createToast('success', 'Đã sao chép khung giờ Thứ 2'));
  };

  const handleSave = () => {
    onToast(
      createToast(
        'success',
        'Đã cập nhật khung giờ làm việc — lịch trình tiếp theo sẽ được tối ưu theo khung giờ mới'
      )
    );
  };

  return (
    <Card>
      <SectionHeader
        title="Khung giờ làm việc"
        subtitle="FocusFlow sẽ ưu tiên xếp lịch và tính điểm ưu tiên công việc dựa trên khung giờ bạn thường làm việc hiệu quả nhất"
      />

      {/* Days */}
      <div className="space-y-3 mb-6">
        {workDays.map((day) => (
          <div
            key={day.dayIndex}
            className="flex items-start gap-4 p-4 rounded-xl transition-all"
            style={{
              background: day.enabled ? '#FFFFFF' : '#FAFDFA',
              border: '1px solid #E8F5E8',
              opacity: day.enabled ? 1 : 0.6,
            }}
          >
            {/* Toggle & Day name */}
            <div className="flex items-center gap-3 min-w-[160px]">
              <Toggle
                checked={day.enabled}
                onChange={() => toggleDay(day.dayIndex)}
              />
              <span
                className="text-sm font-medium"
                style={{ color: '#243024' }}
              >
                {day.day}
              </span>
            </div>

            {/* Slots */}
            {day.enabled ? (
              <div className="flex-1 space-y-2">
                {day.slots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <TimePicker
                      value={slot.start}
                      onChange={(v) => updateSlot(day.dayIndex, idx, 'start', v)}
                    />
                    <span className="text-sm" style={{ color: '#9CA3AF' }}>
                      —
                    </span>
                    <TimePicker
                      value={slot.end}
                      onChange={(v) => updateSlot(day.dayIndex, idx, 'end', v)}
                    />
                    {day.slots.length > 1 && (
                      <button
                        onClick={() => removeSlot(day.dayIndex, idx)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} style={{ color: '#C1644C' }} />
                      </button>
                    )}
                  </div>
                ))}

                {day.slots.length < 3 && (
                  <button
                    onClick={() => addSlot(day.dayIndex)}
                    className="flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: '#5FAF6E' }}
                  >
                    <Plus size={16} />
                    Thêm khung giờ
                  </button>
                )}
              </div>
            ) : (
              <span
                className="text-sm italic"
                style={{ color: '#9CA3AF' }}
              >
                Ngày nghỉ
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Copy button */}
      <button
        onClick={copyMondayToAll}
        className="flex items-center gap-2 text-sm font-medium mb-6"
        style={{ color: '#5F6E5F' }}
      >
        <Copy size={16} />
        Sao chép khung giờ Thứ 2 cho tất cả các ngày
      </button>

      {/* Energy Hours */}
      <div
        className="p-4 rounded-xl"
        style={{ background: '#F4FAF4', border: '1px solid #E8F5E8' }}
      >
        <h4
          className="text-sm font-semibold mb-2"
          style={{ color: '#243024' }}
        >
          Khung giờ năng lượng cao
        </h4>
        <p className="text-xs mb-4" style={{ color: '#5F6E5F' }}>
          Đánh dấu khung giờ bạn cảm thấy tập trung tốt nhất trong ngày. Dữ liệu này giúp
          thuật toán EnergyFit tối ưu hóa việc xếp task cần tư duy sâu.
        </p>

        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            Từ
          </span>
          <TimePicker value={energySlotStart} onChange={setEnergySlotStart} />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            đến
          </span>
          <TimePicker value={energySlotEnd} onChange={setEnergySlotEnd} />
        </div>

        {/* Visual Timeline */}
        <div className="mt-4">
          <div
            className="relative h-8 rounded-lg overflow-hidden"
            style={{ background: '#E8F5E8' }}
          >
            {HOURS.map((hour, i) => {
              const h = parseInt(hour);
              const startH = parseInt(energySlotStart.split(':')[0]);
              const endH = parseInt(energySlotEnd.split(':')[0]);
              const isActive = h >= startH && h < endH;

              return (
                <div
                  key={hour}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${(i / 24) * 100}%`,
                    width: `${100 / 24}%`,
                    background: isActive ? '#5FAF6E' : 'transparent',
                  }}
                />
              );
            })}
            <div className="absolute inset-0 flex items-center">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 text-center text-xs"
                  style={{ color: 'transparent' }}
                >
                  {i}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              0h
            </span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              24h
            </span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-6 flex justify-end">
        <Button onClick={handleSave}>Lưu cấu hình khung giờ</Button>
      </div>
    </Card>
  );
}

// Pomodoro Section
function PomodoroSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [focusDuration, setFocusDuration] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [sessionsBeforeLongBreak, setSessionsBeforeLongBreak] = useState(4);
  const [autoStart, setAutoStart] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSave = () => {
    onToast(createToast('success', 'Đã lưu cấu hình Pomodoro'));
  };

  return (
    <Card>
      <SectionHeader title="Cấu hình Pomodoro" />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>
            Thời lượng tập trung (phút)
          </label>
          <Input
            type="number"
            value={focusDuration.toString()}
            onChange={(v) => setFocusDuration(parseInt(v) || 25)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>
            Thời lượng nghỉ ngắn (phút)
          </label>
          <Input
            type="number"
            value={shortBreak.toString()}
            onChange={(v) => setShortBreak(parseInt(v) || 5)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>
            Thời lượng nghỉ dài (phút)
          </label>
          <Input
            type="number"
            value={longBreak.toString()}
            onChange={(v) => setLongBreak(parseInt(v) || 15)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>
            Số phiên trước khi nghỉ dài
          </label>
          <Input
            type="number"
            value={sessionsBeforeLongBreak.toString()}
            onChange={(v) => setSessionsBeforeLongBreak(parseInt(v) || 4)}
          />
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F4FAF4' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: '#243024' }}>
              Tự động chuyển sang phiên tiếp theo
            </p>
            <p className="text-xs" style={{ color: '#5F6E5F' }}>
              Bắt đầu phiên mới ngay sau khi kết thúc phiên hiện tại
            </p>
          </div>
          <Toggle checked={autoStart} onChange={setAutoStart} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F4FAF4' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: '#243024' }}>
              Phát âm thanh thông báo khi hết giờ
            </p>
            <p className="text-xs" style={{ color: '#5F6E5F' }}>
              Âm thanh nhắc nhở khi kết thúc phiên focus hoặc nghỉ
            </p>
          </div>
          <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Lưu cấu hình</Button>
      </div>
    </Card>
  );
}

// Notifications Section
function NotificationsSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [settings, setSettings] = useState({
    pomodoroEnd: true,
    taskOverdue: true,
    scheduleSuccess: true,
    aiInsights: true,
    deadlineReminder: true,
    procrastinationScore: false,
  });

  const notificationItems = [
    {
      key: 'pomodoroEnd',
      title: 'Nhắc hết giờ Pomodoro',
      description: 'Thông báo khi phiên tập trung hoặc nghỉ kết thúc',
    },
    {
      key: 'taskOverdue',
      title: 'Cảnh báo task quá giờ chưa bắt đầu',
      description: 'Nhắc nhở khi task đã đến giờ nhưng chưa được bắt đầu',
    },
    {
      key: 'scheduleSuccess',
      title: 'Lên lịch tự động thành công',
      description: 'Thông báo khi AI hoàn tất việc xếp lịch tuần mới',
    },
    {
      key: 'aiInsights',
      title: 'AI Insights tuần mới',
      description: 'Nhận thông báo khi có nhận xét mới từ AI',
    },
    {
      key: 'deadlineReminder',
      title: 'Nhắc deadline sắp tới',
      description: 'Cảnh báo trước khi task đến hạn',
    },
    {
      key: 'procrastinationScore',
      title: 'Procrastination Score hằng ngày',
      description: 'Báo cáo điểm trì hoãn mỗi ngày',
    },
  ] as const;

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    onToast(createToast('success', 'Đã cập nhật cài đặt thông báo'));
  };

  return (
    <Card>
      <SectionHeader title="Cài đặt thông báo" />

      <div className="space-y-3">
        {notificationItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: '#F4FAF4' }}
          >
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#243024' }}>
                {item.title}
              </p>
              <p className="text-xs" style={{ color: '#5F6E5F' }}>
                {item.description}
              </p>
            </div>
            <Toggle
              checked={settings[item.key]}
              onChange={() => handleToggle(item.key)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

// Timezone & Language Section
function TimezoneLanguageSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [language, setLanguage] = useState('vi');

  const handleSave = () => {
    onToast(createToast('success', 'Đã lưu cài đặt múi giờ và ngôn ngữ'));
  };

  return (
    <Card>
      <SectionHeader title="Múi giờ & Ngôn ngữ" />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>
            Múi giờ
          </label>
          <Dropdown
            value={timezone}
            options={TIMEZONES}
            onChange={setTimezone}
            minWidth={280}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#243024' }}>
            Ngôn ngữ
          </label>
          <Dropdown
            value={language}
            options={LANGUAGES}
            onChange={setLanguage}
            minWidth={200}
          />
        </div>
      </div>

      <div className="pt-6 flex justify-end">
        <Button onClick={handleSave}>Lưu thay đổi</Button>
      </div>
    </Card>
  );
}

// Danger Zone Section
function DangerZoneSection({ onToast }: { onToast: (toast: ToastMessage) => void }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = () => {
    setShowDeleteModal(false);
    onToast(createToast('warning', 'Tài khoản đã được lên lịch xóa sau 30 ngày'));
  };

  return (
    <>
      <Card
        style={{
          borderColor: '#F5D0C5',
          background: 'linear-gradient(to bottom, #FDF8F6, #FFFFFF)',
        }}
      >
        <SectionHeader title="Vùng nguy hiểm" />

        <div className="flex items-start gap-4">
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 48, height: 48, background: '#FDF4F2' }}
          >
            <AlertTriangle size={24} style={{ color: '#C1644C' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm mb-4" style={{ color: '#243024' }}>
              Xóa tài khoản sẽ loại bỏ vĩnh viễn tất cả dữ liệu của bạn. Hành động này
              không thể hoàn tác.
            </p>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={16} className="mr-2 inline" />
              Xóa tài khoản
            </Button>
          </div>
        </div>
      </Card>

      <DeleteAccountModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        userEmail="nguyenvana@email.com"
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
    <div className="flex flex-col min-h-full px-6 lg:px-10 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>
          Cài đặt
        </h1>
        <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
          Quản lý tài khoản và tùy chỉnh trải nghiệm FocusFlow
        </p>
      </header>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block" style={{ width: 240 }}>
          <SettingsNav active={activeSection} onSelect={setActiveSection} />
        </aside>

        {/* Content */}
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
  );
}
