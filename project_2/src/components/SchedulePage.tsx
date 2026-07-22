import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  AlertTriangle,
  HelpCircle,
  X,
} from 'lucide-react';
import { Badge, Modal } from './ui';
import { createToast, type ToastMessage } from './ui/Toast';

/* ─── Types ─── */
type TaskPriority = 'high' | 'medium' | 'low';
type TaskStatus = 'scheduled' | 'frozen_overdue';

interface ScheduleTask {
  id: string;
  title: string;
  dayOfWeek: number; // 0-6 (Mon-Sun)
  startHour: number;
  duration: number; // in 30-min slots
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

/* ─── Mock Data ─── */
const mockTasks: ScheduleTask[] = [
  {
    id: 't1',
    title: 'Viết báo cáo Q3',
    dayOfWeek: 0,
    startHour: 4, // 9:00
    duration: 4, // 2 hours
    priority: 'high',
    status: 'scheduled',
    type: 'fixed',
  },
  {
    id: 't2',
    title: 'Review PR #47',
    dayOfWeek: 1,
    startHour: 2, // 8:00
    duration: 2, // 1 hour
    priority: 'high',
    status: 'scheduled',
    type: 'flexible',
  },
  {
    id: 't3',
    title: 'Team standup',
    dayOfWeek: 2,
    startHour: 4, // 9:00
    duration: 1, // 30 min
    priority: 'low',
    status: 'scheduled',
    type: 'fixed',
  },
  {
    id: 't4',
    title: 'Design review',
    dayOfWeek: 3,
    startHour: 6, // 10:00
    duration: 3, // 1.5 hours
    priority: 'medium',
    status: 'scheduled',
    type: 'flexible',
  },
  {
    id: 't5',
    title: 'Ôn thi Xác suất',
    dayOfWeek: 0,
    startHour: 8, // 11:00
    duration: 4, // 2 hours
    priority: 'high',
    status: 'frozen_overdue',
    type: 'flexible',
  },
  {
    id: 't6',
    title: 'Weekly planning',
    dayOfWeek: 4,
    startHour: 0, // 7:00
    duration: 2, // 1 hour
    priority: 'medium',
    status: 'scheduled',
    type: 'fixed',
  },
  {
    id: 't7',
    title: 'Cập nhật CV',
    dayOfWeek: 5,
    startHour: 10, // 12:00
    duration: 6, // 3 hours
    priority: 'low',
    status: 'scheduled',
    type: 'flexible',
  },
  {
    id: 't8',
    title: 'Hoàn thiện slide',
    dayOfWeek: 2,
    startHour: 12, // 13:00
    duration: 4, // 2 hours
    priority: 'high',
    status: 'frozen_overdue',
    type: 'flexible',
  },
];

/* ─── Utility Functions ─── */
function getWeekForDate(date: Date): WeekInfo {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  const start = new Date(d.setDate(diff));
  const end = new Date(d.setDate(d.getDate() + 6));

  const formatDate = (date: Date) =>
    `${date.getDate()}/${date.getMonth() + 1}`;

  return {
    start,
    end,
    label: `${formatDate(start)} – ${formatDate(end)}`,
  };
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

function formatTimeSlot(slotIndex: number): string {
  const time = TIME_SLOTS[slotIndex];
  const endSlot = slotIndex + 2; // Assuming 1 hour default
  const endTime = TIME_SLOTS[Math.min(endSlot, TIME_SLOTS.length - 1)];
  return `${time}–${endTime}`;
}

/* ─── Sub-components ─── */

// Shimmer loading animation
function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
}

// Task block component
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
      {/* Fixed task lock icon */}
      {isFixed && (
        <div
          className="absolute top-1 right-1"
          style={{ color: colors.text }}
          title="Công việc cố định"
        >
          <Lock size={10} />
        </div>
      )}

      {/* Overdue warning */}
      {isOverdue && (
        <div className="absolute top-1 right-1" style={{ color: '#E8993A' }}>
          <AlertTriangle size={10} />
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <p
          className="text-xs font-semibold truncate"
          style={{ color: colors.text }}
        >
          {task.title}
        </p>
        {isOverdue && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestructure?.(task);
            }}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors"
            style={{ background: 'rgba(232,153,58,0.2)', color: '#E8993A' }}
            title="Tái cấu trúc"
          >
            <HelpCircle size={10} />
            Tái cấu trúc
          </button>
        )}
      </div>
      <p className="text-[10px] mt-0.5" style={{ color: colors.text, opacity: 0.8 }}>
        {formatDisplayTime()}
      </p>

      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}
      </style>
    </div>
  );
}

// Compare modal for auto-schedule
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

function CompareModal({
  open,
  onClose,
  title,
  before,
  after,
  warning,
  onConfirm,
  showConfirm = false,
}: CompareModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={600}>
      <div className="p-6">
        {/* Warning banner */}
        {warning && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: '#F7E7A8', color: '#B8860B' }}
          >
            <span className="font-medium">{warning}</span>
          </div>
        )}

        {/* Two-column comparison */}
        <div className="grid grid-cols-2 gap-6">
          {/* Before column */}
          <div>
            <h4
              className="text-sm font-semibold mb-3"
              style={{ color: '#5F6E5F' }}
            >
              Trước
            </h4>
            <div className="space-y-2">
              {before.map((task) => (
                <div
                  key={task.id}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: PRIORITY_COLORS[task.priority].bg,
                    color: PRIORITY_COLORS[task.priority].text,
                  }}
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs opacity-80">
                    {DAYS[task.dayOfWeek]}, {TIME_SLOTS[task.startHour]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* After column */}
          <div>
            <h4
              className="text-sm font-semibold mb-3"
              style={{ color: '#5F6E5F' }}
            >
              Sau
            </h4>
            <div className="space-y-2">
              {after.map((task) => (
                <div
                  key={task.id}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: PRIORITY_COLORS[task.priority].bg,
                    color: PRIORITY_COLORS[task.priority].text,
                  }}
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs opacity-80">
                    {DAYS[task.dayOfWeek]}, {TIME_SLOTS[task.startHour]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {showConfirm && (
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: '#F4FAF4', color: '#5F6E5F' }}
            >
              Hủy bỏ
            </button>
            <button
              onClick={() => {
                onConfirm?.();
                onClose();
              }}
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

/* ─── Main Schedule Page Component ─── */
interface SchedulePageProps {
  onToast: (toast: ToastMessage) => void;
}

export default function SchedulePage({ onToast }: SchedulePageProps) {
  const [currentWeek, setCurrentWeek] = useState<WeekInfo>(getWeekForDate(new Date()));
  const [tasks, setTasks] = useState<ScheduleTask[]>(mockTasks);
  const [loadingAutoSchedule, setLoadingAutoSchedule] = useState(false);
  const [autoScheduleBanner, setAutoScheduleBanner] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [restructureModalOpen, setRestructureModalOpen] = useState(false);
  const [restructureTask, setRestructureTask] = useState<ScheduleTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<ScheduleTask | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);

  // Navigate weeks
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

  const goToThisWeek = () => {
    setCurrentWeek(getWeekForDate(new Date()));
  };

  // Auto schedule handler
  const handleAutoSchedule = () => {
    setLoadingAutoSchedule(true);
    setAutoScheduleBanner(null);

    setTimeout(() => {
      setLoadingAutoSchedule(false);
      setAutoScheduleBanner('Đã xếp lịch cho 6 công việc');
    }, 1500);
  };

  // Restructure overdue task handler
  const handleRestructure = (task: ScheduleTask) => {
    setRestructureTask(task);
    onToast(createToast('loading', 'Đang tính toán lại lịch trình...', undefined, 0));

    setTimeout(() => {
      onToast(
        createToast('loading', 'Đã tính xong!', {
          label: 'Xem kết quả',
          onClick: () => setRestructureModalOpen(true),
        }, 0)
      );
    }, 1000);
  };

  // Drag handlers for flexible tasks
  const handleDragStart = (e: React.DragEvent, task: ScheduleTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dayOfWeek: number, slotIndex: number) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.type === 'fixed') return;

    const adjustedSlot = Math.floor(slotIndex / 2) * 2; // Snap to 1-hour slots
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTask.id
          ? { ...t, dayOfWeek, startHour: adjustedSlot, status: 'scheduled' }
          : t
      )
    );
    setDraggedTask(null);
    onToast(createToast('success', 'Đã di chuyển công việc'));
  };

  // Get tasks for a specific day and time slot
  const getTasksForSlot = (dayOfWeek: number, slotIndex: number) => {
    const hourSlot = Math.floor(slotIndex / 2) * 2;
    return tasks.filter(
      (t) => t.dayOfWeek === dayOfWeek && t.startHour === hourSlot
    );
  };

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    return DAYS.map((_, dayIndex) =>
      tasks.filter((t) => t.dayOfWeek === dayIndex)
    );
  }, [tasks]);

  return (
    <div className="flex flex-col min-h-full">
      {/* ═══════ HEADER ═══════ */}
      <header
        className="sticky top-0 z-10 px-6 lg:px-10 py-6"
        style={{ background: '#F4FAF4', borderBottom: '1px solid #E8F5E8' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>
              Lịch trình tuần
            </h1>
            <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
              Tuần{' '}
              <span className="font-semibold" style={{ color: '#243024' }}>
                {currentWeek.label}
              </span>
            </p>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 px-1.5 py-1 rounded-xl"
              style={{ background: '#FFFFFF', border: '1px solid #E8F5E8' }}
            >
              <button
                onClick={goToPrevWeek}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{ color: '#5F6E5F' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#F4FAF4')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToThisWeek}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ color: '#5FAF6E' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#DDF3DF')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                Tuần này
              </button>
              <button
                onClick={goToNextWeek}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{ color: '#5F6E5F' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#F4FAF4')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Auto schedule button */}
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

        {/* Auto schedule success banner */}
        {autoScheduleBanner && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl mt-4"
            style={{ background: '#DDF3DF' }}
          >
            <p className="text-sm font-medium" style={{ color: '#5FAF6E' }}>
              {autoScheduleBanner}
            </p>
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

      {/* ═══════ WEEKLY CALENDAR ═══════ */}
      <div className="flex-1 px-6 lg:px-10 py-6">
        <div
          ref={calendarRef}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(36, 48, 36, 0.06)',
          }}
        >
          {/* Loading overlay */}
          {loadingAutoSchedule && <ShimmerOverlay />}

          {/* Calendar grid */}
          <div className="overflow-x-auto">
            <div
              className="grid"
              style={{
                gridTemplateColumns: '60px repeat(7, minmax(140px, 1fr))',
                minWidth: 'min-content',
              }}
            >
              {/* Header row */}
              <div
                className="sticky top-0 z-20 px-2 py-3 text-xs font-semibold text-center"
                style={{
                  background: '#F4FAF4',
                  color: '#9CA3AF',
                }}
              >
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
                    <p
                      className="text-xs font-semibold"
                      style={{ color: today ? '#5FAF6E' : '#5F6E5F' }}
                    >
                      {day}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: today ? '#243024' : '#9CA3AF' }}
                    >
                      {dayDate.getDate()}/{dayDate.getMonth() + 1}
                    </p>
                  </div>
                );
              })}

              {/* Time slots */}
              {TIME_SLOTS.map((time, slotIndex) => (
                <>
                  {/* Time label */}
                  <div
                    key={`time-${slotIndex}`}
                    className="px-2 py-2 text-xs text-right border-t"
                    style={{
                      borderColor: '#E8F5E8',
                      color: '#9CA3AF',
                      background: 'rgba(244, 250, 244, 0.5)',
                    }}
                  >
                    {slotIndex % 2 === 0 ? time : ''}
                  </div>

                  {/* Day cells */}
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
                        {/* Tasks starting at this slot */}
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
                </>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ MODALS ═══════ */}
      {/* Auto-schedule compare modal */}
      <CompareModal
        open={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title="Đã xếp lịch tự động"
        before={tasks.slice(0, 3)}
        after={[
          { ...tasks[0], dayOfWeek: 1, startHour: 6 },
          { ...tasks[1], dayOfWeek: 2, startHour: 8 },
          { ...tasks[3], dayOfWeek: 3, startHour: 10 },
        ]}
        showConfirm={false}
      />

      {/* Restructure compare modal */}
      <CompareModal
        open={restructureModalOpen}
        onClose={() => setRestructureModalOpen(false)}
        title={`Tái cấu trúc "${restructureTask?.title || ''}"`}
        before={restructureTask ? [restructureTask] : []}
        after={restructureTask ? [{ ...restructureTask, dayOfWeek: (restructureTask.dayOfWeek + 1) % 7, startHour: 10, status: 'scheduled' }] : []}
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
