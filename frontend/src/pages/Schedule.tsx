import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { createToast, type ToastMessage } from '../components/common/Toast';
import schedulerService from '../services/scheduler.service';

/* ─── Types ─── */
type TaskPriority = 'high' | 'medium' | 'low';
type TaskStatus = 'scheduled' | 'frozen_overdue';

interface ScheduleTask {
  id: string;
  title: string;
  dayOfWeek: number;
  startHour: number;
  duration: number;
  priority: TaskPriority;
  status: TaskStatus;
  type: 'fixed' | 'flexible';
}

interface WeekInfo {
  start: Date;
  end: Date;
  label: string;
}

/* ─── Constants ─── */
const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const TIME_SLOTS = Array.from({ length: 31 }, (_, i) => {
  const hour = Math.floor(7 + i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  high: { bg: '#F6D8C7', text: '#C1644C' },
  medium: { bg: '#F7E7A8', text: '#B8860B' },
  low: { bg: '#F7E7A8', text: '#B8860B' },
};

/* ─── Mock Data (fallback khi API chưa trả về dữ liệu) ─── */
const initialMockTasks: ScheduleTask[] = [];


/* ─── Utility Functions ─── */
function getWeekForDate(date: Date): WeekInfo {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  const end = new Date(d.setDate(d.getDate() + 6));
  const formatDate = (dt: Date) => `${dt.getDate()}/${dt.getMonth() + 1}`;
  return { start, end, label: `${formatDate(start)} – ${formatDate(end)}` };
}

function isToday(dayOfWeek: number, weekStart: Date): boolean {
  const today = new Date();
  const checkDate = new Date(weekStart);
  checkDate.setDate(checkDate.getDate() + dayOfWeek);
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
}

/* ─── Sub-components ─── */

function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

interface TaskBlockProps {
  task: ScheduleTask;
  onDragStart?: (e: React.DragEvent, task: ScheduleTask) => void;
  onRestructure?: (task: ScheduleTask) => void;
  isDragging?: boolean;
}

function TaskBlock({ task, onDragStart, onRestructure, isDragging }: TaskBlockProps) {
  const colors = PRIORITY_COLORS[task.priority];
  const isOverdue = task.status === 'frozen_overdue';
  const isFixed = task.type === 'fixed';
  const [shaking, setShaking] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (isFixed) {
      e.preventDefault();
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }
    onDragStart?.(e, task);
  };

  const formatDisplayTime = () => {
    const startTime = TIME_SLOTS[task.startHour];
    const endTime = TIME_SLOTS[Math.min(task.startHour + Math.ceil(task.duration / 2), TIME_SLOTS.length - 1)];
    return `${startTime}–${endTime}`;
  };

  return (
    <div
      draggable={!isFixed}
      onDragStart={handleDragStart}
      className={`relative px-2 py-1.5 rounded-lg transition-all duration-200 ${shaking ? 'animate-shake' : ''} ${isDragging ? 'opacity-50' : ''}`}
      style={{
        background: isOverdue ? '#FDEBD0' : colors.bg,
        border: `1px solid ${isOverdue ? '#E8993A' : colors.bg}`,
        cursor: isFixed ? 'default' : 'grab',
        minHeight: task.duration * 16,
      }}
    >
      {isFixed && (
        <div className="absolute top-1 right-1" style={{ color: colors.text }} title="Công việc cố định">
          <Lock size={10} />
        </div>
      )}
      {isOverdue && (
        <div className="absolute top-1 right-1" style={{ color: '#E8993A' }}>
          <AlertTriangle size={10} />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold truncate" style={{ color: colors.text }}>
          {task.title}
        </p>
        {isOverdue && (
          <button
            onClick={(e) => { e.stopPropagation(); onRestructure?.(task); }}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
            style={{ background: 'rgba(232,153,58,0.2)', color: '#E8993A' }}
          >
            <HelpCircle size={10} />
            Tái cấu trúc
          </button>
        )}
      </div>
      <p className="text-[10px] mt-0.5" style={{ color: colors.text, opacity: 0.8 }}>
        {formatDisplayTime()}
      </p>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  before: ScheduleTask[];
  after: ScheduleTask[];
  warning?: string;
  onConfirm?: () => void;
  showConfirm?: boolean;
}

function CompareModal({ open, onClose, title, before, after, warning, onConfirm, showConfirm = false }: CompareModalProps) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} width={600}>
      <div className="p-6">
        {warning && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#F7E7A8', color: '#B8860B' }}>
            <span className="font-medium">{warning}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: '#5F6E5F' }}>Trước</h4>
            <div className="space-y-2">
              {before.map((task) => {
                const colors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;
                return (
                  <div key={task.id} className="px-3 py-2 rounded-lg text-sm"
                    style={{ background: colors.bg, color: colors.text }}>
                    <p className="font-medium">{task.title || 'Task'}</p>
                    <p className="text-xs opacity-80">{DAYS[task.dayOfWeek] || ''}, {TIME_SLOTS[task.startHour] || ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: '#5F6E5F' }}>Sau</h4>
            <div className="space-y-2">
              {after.map((task) => {
                const colors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;
                return (
                  <div key={task.id} className="px-3 py-2 rounded-lg text-sm"
                    style={{ background: colors.bg, color: colors.text }}>
                    <p className="font-medium">{task.title || 'Task'}</p>
                    <p className="text-xs opacity-80">{DAYS[task.dayOfWeek] || ''}, {TIME_SLOTS[task.startHour] || ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="flex items-center justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: '#F4FAF4', color: '#5F6E5F' }}>
              Hủy bỏ
            </button>
            <button
              onClick={() => { onConfirm?.(); onClose(); }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: '#5FAF6E', color: '#FFFFFF' }}
            >
              Đồng ý áp dụng
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ─── Main Schedule Page ─── */


interface SchedulePageProps {
  onToast: (toast: ToastMessage) => void;
}

export default function SchedulePage({ onToast }: SchedulePageProps) {
  const [currentWeek, setCurrentWeek] = useState<WeekInfo>(getWeekForDate(new Date()));
  const [tasks, setTasks] = useState<ScheduleTask[]>(initialMockTasks);
  const [loadingAutoSchedule, setLoadingAutoSchedule] = useState(false);
  const [autoScheduleBanner, setAutoScheduleBanner] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [restructureModalOpen, setRestructureModalOpen] = useState(false);
  const [restructureTask, setRestructureTask] = useState<ScheduleTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<ScheduleTask | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  /* ── Adapter: chuyển slot API → ScheduleTask grid format ── */
  const adaptApiSlots = useCallback((slots: any[]): ScheduleTask[] => {
    return slots.map((slot) => {
      const startAt = new Date(slot.startAt ?? slot.startTime);
      const endAt = new Date(slot.endAt ?? slot.endTime);
      const slotDate = startAt;
      // Xác định dayOfWeek (0=T2, 1=T3 ... 6=CN) dựa vào weekStart
      const weekStart = new Date(currentWeek.start);
      const dayOfWeek = Math.round((slotDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));

      // Chuyển giờ thực → index của TIME_SLOTS (7:00=0, 7:30=1 ...)
      const startHour = (startAt.getHours() - 7) * 2 + (startAt.getMinutes() >= 30 ? 1 : 0);
      const durationHours = (endAt.getTime() - startAt.getTime()) / (60 * 60 * 1000);
      const duration = Math.round(durationHours * 2); // mỗi slot 30 phút

      const priority: TaskPriority = (slot.taskPriority ?? slot.task?.importance) === 'HIGH' ? 'high' : 'low';
      const status: TaskStatus = slot.status === 'FROZEN_OVERDUE' ? 'frozen_overdue' : 'scheduled';
      const type = slot.taskType === 'fixed' || slot.task?.isFixedTask || slot.isManual ? 'fixed' : 'flexible';

      return {
        id: slot.id,
        title: slot.task?.title ?? slot.taskTitle ?? 'Task',
        dayOfWeek: Math.max(0, Math.min(6, dayOfWeek)),
        startHour: Math.max(0, startHour),
        duration: Math.max(1, duration),
        priority,
        status,
        type,
      };
    });
  }, [currentWeek.start]);

  /* ── Load slots khi week thay đổi ── */
  useEffect(() => {
    const from = currentWeek.start.toISOString().split('T')[0];
    const endDate = new Date(currentWeek.end);
    endDate.setDate(endDate.getDate() + 1);
    const to = endDate.toISOString().split('T')[0];

    schedulerService.getSlots(from, to)
      .then((slots) => {
        if (slots.length > 0) {
          setTasks(adaptApiSlots(slots));
        } else {
          setTasks([]); // tuần chưa có lịch
        }
      })
      .catch(() => {
        setTasks([]); // fallback: không báo lỗi to
      });
  }, [currentWeek.start, adaptApiSlots]);

  const goToPrevWeek = () => {
    const newStart = new Date(currentWeek.start);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeek(getWeekForDate(newStart));
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeek.start);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeek(getWeekForDate(newStart));
  };

  const goToThisWeek = () => setCurrentWeek(getWeekForDate(new Date()));

  const handleAutoSchedule = async () => {
    setLoadingAutoSchedule(true);
    setAutoScheduleBanner(null);
    try {
      const result = await schedulerService.generateWeekly();
      setAutoScheduleBanner(result.message ?? `Đã xếp lịch cho ${result.slotsCreated} công việc`);
      // Reload slots sau khi generate
      const from = currentWeek.start.toISOString().split('T')[0];
      const endDate = new Date(currentWeek.end);
      endDate.setDate(endDate.getDate() + 1);
      const to = endDate.toISOString().split('T')[0];
      const freshSlots = await schedulerService.getSlots(from, to);
      setTasks(adaptApiSlots(freshSlots));
    } catch {
      onToast(createToast('error', 'Không thể tạo lịch tự động. Kiểm tra kết nối.'));
    } finally {
      setLoadingAutoSchedule(false);
    }
  };

  const handleRestructure = async (task: ScheduleTask) => {
    setRestructureTask(task);
    onToast(createToast('success', 'Đang tính toán lại lịch trình...'));
    try {
      await schedulerService.restructure();
      setTimeout(() => {
        setRestructureModalOpen(true);
      }, 1000);
      // Reload
      const from = currentWeek.start.toISOString().split('T')[0];
      const endDate = new Date(currentWeek.end);
      endDate.setDate(endDate.getDate() + 1);
      const to = endDate.toISOString().split('T')[0];
      const freshSlots = await schedulerService.getSlots(from, to);
      setTasks(adaptApiSlots(freshSlots));
    } catch {
      onToast(createToast('error', 'Không thể tái cấu trúc lịch. Thử lại sau.'));
    }
  };

  const handleDragStart = (e: React.DragEvent, task: ScheduleTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dayOfWeek: number, slotIndex: number) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.type === 'fixed') return;
    const adjustedSlot = Math.floor(slotIndex / 2) * 2;

    // Tính thời gian mới
    const newStartAt = new Date(currentWeek.start);
    newStartAt.setDate(newStartAt.getDate() + dayOfWeek);
    newStartAt.setHours(7 + Math.floor(adjustedSlot / 2), (adjustedSlot % 2) * 30, 0, 0);
    const durationMs = draggedTask.duration * 30 * 60 * 1000;
    const newEndAt = new Date(newStartAt.getTime() + durationMs);

    // Cập nhật UI optimistically
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTask.id ? { ...t, dayOfWeek, startHour: adjustedSlot, status: 'scheduled' } : t
      )
    );
    setDraggedTask(null);

    // Sync với backend
    try {
      await schedulerService.updateSlot(draggedTask.id, newStartAt.toISOString(), newEndAt.toISOString());
    } catch {
      // Rollback nếu API lỗi
      onToast(createToast('error', 'Không thể lưu thay đổi vị trí. Đang hoàn tác...'));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggedTask.id ? draggedTask : t
        )
      );
    }
  };

  const getTasksForSlot = (dayOfWeek: number, slotIndex: number) => {
    return tasks.filter((t) => t.dayOfWeek === dayOfWeek && t.startHour === slotIndex);
  };



  return (
    <div className="flex flex-col min-h-full">
      {/* HEADER */}
      <header
        className="sticky top-0 z-10 px-6 lg:px-10 py-6"
        style={{ background: '#F4FAF4', borderBottom: '1px solid #E8F5E8' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>Lịch trình tuần</h1>
            <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
              Tuần <span className="font-semibold" style={{ color: '#243024' }}>{currentWeek.label}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E8F5E8' }}>
              <button
                onClick={goToPrevWeek}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{ color: '#5F6E5F' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F4FAF4')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToThisWeek}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ color: '#5FAF6E' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#DDF3DF')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Tuần này
              </button>
              <button
                onClick={goToNextWeek}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{ color: '#5F6E5F' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F4FAF4')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={handleAutoSchedule}
              disabled={loadingAutoSchedule}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#5FAF6E', color: '#FFFFFF', borderRadius: 14 }}
            >
              <Sparkles size={16} />
              Lên lịch tự động
            </button>
          </div>
        </div>

        {autoScheduleBanner && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl mt-4" style={{ background: '#DDF3DF' }}>
            <p className="text-sm font-medium" style={{ color: '#5FAF6E' }}>{autoScheduleBanner}</p>
            <button
              onClick={() => setCompareModalOpen(true)}
              className="text-sm font-semibold underline"
              style={{ color: '#5FAF6E' }}
            >
              Xem thay đổi
            </button>
          </div>
        )}
      </header>

      {/* WEEKLY CALENDAR */}
      <div className="flex-1 px-6 lg:px-10 py-6">
        <div
          ref={calendarRef}
          className="relative rounded-2xl overflow-hidden"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(36, 48, 36, 0.06)' }}
        >
          {loadingAutoSchedule && <ShimmerOverlay />}

          <div className="overflow-x-auto">
            <div
              className="grid"
              style={{ gridTemplateColumns: '60px repeat(7, minmax(140px, 1fr))', minWidth: 'min-content' }}
            >
              {/* Header row */}
              <div className="sticky top-0 z-20 px-2 py-3 text-xs font-semibold text-center" style={{ background: '#F4FAF4', color: '#9CA3AF' }}>
                Giờ
              </div>
              {DAYS.map((day, i) => {
                const today = isToday(i, currentWeek.start);
                const dayDate = new Date(currentWeek.start);
                dayDate.setDate(dayDate.getDate() + i);

                return (
                  <div
                    key={day}
                    className="sticky top-0 z-20 px-2 py-3 text-center"
                    style={{
                      background: today ? '#DDF3DF' : '#F4FAF4',
                      borderBottom: today ? '2px solid #5FAF6E' : 'none',
                    }}
                  >
                    <p className="text-xs font-semibold" style={{ color: today ? '#5FAF6E' : '#5F6E5F' }}>{day}</p>
                    <p className="text-xs mt-0.5" style={{ color: today ? '#243024' : '#9CA3AF' }}>
                      {dayDate.getDate()}/{dayDate.getMonth() + 1}
                    </p>
                  </div>
                );
              })}

              {/* Time slots */}
              {TIME_SLOTS.map((time, slotIndex) => (
                <Fragment key={`time-row-${slotIndex}`}>
                  <div
                    key={`time-${slotIndex}`}
                    className="px-2 py-2 text-xs text-right border-t"
                    style={{ borderColor: '#E8F5E8', color: '#9CA3AF', background: 'rgba(244, 250, 244, 0.5)' }}
                  >
                    {slotIndex % 2 === 0 ? time : ''}
                  </div>

                  {DAYS.map((_, dayIndex) => {
                    const today = isToday(dayIndex, currentWeek.start);
                    const slotTasks = getTasksForSlot(dayIndex, slotIndex);

                    return (
                      <div
                        key={`cell-${dayIndex}-${slotIndex}`}
                        className="relative px-1 py-1 border-t min-h-[32px]"
                        style={{
                          borderColor: '#E8F5E8',
                          background: today ? 'rgba(221, 243, 223, 0.3)' : 'transparent',
                        }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, dayIndex, slotIndex)}
                      >
                        {slotTasks.map((task) => (
                          <TaskBlock
                            key={task.id}
                            task={task}
                            onDragStart={handleDragStart}
                            onRestructure={handleRestructure}
                            isDragging={draggedTask?.id === task.id}
                          />
                        ))}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CompareModal
        open={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title="Đã xếp lịch tự động"
        before={tasks.slice(0, 3)}
        after={tasks.slice(0, 4)
          .filter((_, idx) => idx !== 2)
          .map((t, idx) => ({
            ...t,
            dayOfWeek: idx === 0 ? 1 : idx === 1 ? 2 : 3,
            startHour: idx === 0 ? 6 : idx === 1 ? 8 : 10
          }))}
        showConfirm={false}
      />

      <CompareModal
        open={restructureModalOpen}
        onClose={() => setRestructureModalOpen(false)}
        title={`Tái cấu trúc "${restructureTask?.title || ''}"`}
        before={restructureTask ? [restructureTask] : []}
        after={restructureTask ? [{ ...restructureTask, dayOfWeek: (restructureTask.dayOfWeek + 1) % 7, startHour: 10, status: 'scheduled' as TaskStatus }] : []}
        warning="Việc này sẽ cộng thêm 1 điểm vào chỉ số Reschedule Frequency"
        showConfirm={true}
        onConfirm={() => {
          if (restructureTask) {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === restructureTask.id
                  ? { ...t, dayOfWeek: (t.dayOfWeek + 1) % 7, startHour: 10, status: 'scheduled' }
                  : t
              )
            );
            onToast(createToast('success', 'Đã tái cấu trúc công việc'));
          }
        }}
      />
    </div>
  );
}
