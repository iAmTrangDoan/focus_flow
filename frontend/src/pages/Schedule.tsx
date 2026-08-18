import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  AlertTriangle,
  HelpCircle,
  Play,
  CheckCircle,
} from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { createToast, type ToastMessage } from '../components/common/Toast'
import schedulerService, { type ScheduleSlot } from '../services/scheduler.service'

type TaskPriority = 'high' | 'medium' | 'low'
type TaskStatus = 'scheduled' | 'frozen_overdue' | 'completed'

interface ScheduleTask {
  id: string
  taskId: string
  subtaskId: string | null
  title: string
  dayOfWeek: number
  startMinutes: number // Phút tính từ 00:00 theo local timezone đang hiển thị.
  durationMinutes: number   // work+break trên lịch (của segment này)
  startAt: string
  endAt: string
  priority: TaskPriority
  status: TaskStatus
  type: 'fixed' | 'flexible'
  // Overnight split: chỉ tồn tại trong bộ nhớ React, không phản ánh DB
  isOvernightSegment?: boolean     // true nếu slot này bị tách qua đêm
  segmentPart?: 'start' | 'end'   // 'start' = phần đầu ngày, 'end' = phần sang ngày tiếp
  dragOffsetMinutes?: number       // offset in minutes from start of slot to start of segment
}

interface WeekInfo {
  start: Date
  end: Date
  label: string
}

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
const DAY_START_MINUTES = 0
const DAY_END_MINUTES = 24 * 60
const HALF_HOUR_MINUTES = 30
const HALF_HOUR_HEIGHT = 38

const TOTAL_CALENDAR_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES
const CALENDAR_HEIGHT = (TOTAL_CALENDAR_MINUTES / HALF_HOUR_MINUTES) * HALF_HOUR_HEIGHT

const TIME_MARKS = Array.from(
  { 
    length: TOTAL_CALENDAR_MINUTES / HALF_HOUR_MINUTES + 1 
  },
  (_, index) => {
    const totalMinutes = DAY_START_MINUTES + index * HALF_HOUR_MINUTES
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return {
      totalMinutes,
      label: 
        totalMinutes == DAY_END_MINUTES ? '' : `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        top: index * HALF_HOUR_HEIGHT,
    }
  },
)

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  high: { bg: '#F6D8C7', text: '#C1644C' },
  medium: { bg: '#F7E7A8', text: '#B8860B' },
  low: { bg: '#a8d5f7ff', text: '#267bd0ff' },
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getWeekForDate(date: Date): WeekInfo {
  const current = startOfLocalDay(date)
  const day = current.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day

  const start = new Date(current)
  start.setDate(start.getDate() + mondayOffset)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const formatDate = (value: Date) =>
    `${value.getDate()}/${value.getMonth() + 1}`

  return {
    start,
    end,
    label: `${formatDate(start)} – ${formatDate(end)}`,
  }
}

function getDayDifference(date: Date, weekStart: Date): number {
  const dateDay = startOfLocalDay(date)
  const weekDay = startOfLocalDay(weekStart)
  return Math.round((dateDay.getTime() - weekDay.getTime()) / 86_400_000)
}

function splitTaskIntoSegments(
  baseTask: any,
  startAt: Date,
  endAt: Date,
  weekStart: Date,
): ScheduleTask[] {
  const MINUTES_PER_DAY = 24 * 60
  const dayOfWeek = getDayDifference(startAt, weekStart)
  const startMinutes = startAt.getHours() * 60 + startAt.getMinutes()
  const totalDurationMinutes = Math.round(
    (endAt.getTime() - startAt.getTime()) / 60_000,
  )

  const crossesMidnight = startMinutes + totalDurationMinutes > MINUTES_PER_DAY

  if (!crossesMidnight) {
    if (dayOfWeek < 0 || dayOfWeek > 6) return []
    return [
      {
        ...baseTask,
        dayOfWeek,
        startMinutes,
        durationMinutes: totalDurationMinutes,
        dragOffsetMinutes: 0,
      },
    ]
  }

  const segments: ScheduleTask[] = []
  let remainingMinutes = totalDurationMinutes
  let currentDayIndex = dayOfWeek
  let currentStartMinutes = startMinutes

  while (remainingMinutes > 0 && currentDayIndex <= 6) {
    const minutesUntilMidnight = MINUTES_PER_DAY - currentStartMinutes
    const isFirstSegment = currentDayIndex === dayOfWeek
    const segmentDuration = Math.min(remainingMinutes, minutesUntilMidnight)
    const isLastSegment = segmentDuration === remainingMinutes
    const isMultiDaySlot = totalDurationMinutes > MINUTES_PER_DAY || !isFirstSegment

    if (currentDayIndex >= 0) {
      const segmentStart = new Date(startAt.getTime() + (totalDurationMinutes - remainingMinutes) * 60_000)
      const dragOffsetMinutes = Math.round((segmentStart.getTime() - startAt.getTime()) / 60_000)

      segments.push({
        ...baseTask,
        dayOfWeek: currentDayIndex,
        startMinutes: currentStartMinutes,
        durationMinutes: segmentDuration,
        isOvernightSegment: isMultiDaySlot || !isLastSegment,
        segmentPart: isFirstSegment
          ? 'start'
          : isLastSegment
            ? 'end'
            : 'start',
        dragOffsetMinutes,
      })
    }

    remainingMinutes -= segmentDuration
    currentDayIndex += 1
    currentStartMinutes = 0
  }

  return segments
}

function formatTime(dateIso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateIso))
}

function isToday(dayOfWeek: number, weekStart: Date): boolean {
  const today = startOfLocalDay(new Date())
  const checkDate = startOfLocalDay(weekStart)
  checkDate.setDate(checkDate.getDate() + dayOfWeek)
  return checkDate.getTime() === today.getTime()
}

function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 z-30 overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
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
  )
}

interface TaskBlockProps {
  task: ScheduleTask
  onDragStart?: (event: React.DragEvent, task: ScheduleTask) => void
  onRestructure?: (task: ScheduleTask) => void
  isDragging?: boolean
}

function TaskBlock({
  task,
  onDragStart,
  onRestructure,
  isDragging,
}: TaskBlockProps) {

  const colors = PRIORITY_COLORS[task.priority]
  const isOverdue = task.status === 'frozen_overdue'
  const isCompleted = task.status === 'completed'
  const isVisuallyOverdue = task.status === 'scheduled' && new Date(task.startAt).getTime() < new Date().getTime()
  // Cho phép kéo thả slot qua đêm (kéo cả cụm)
  const isFixed = task.type === 'fixed' || isCompleted
  const [shaking, setShaking] = useState(false)

  const VISUAL_END_BREAK_MINUTES = 5;
  const visualDurationMinutes =
    task.type === 'fixed' || task.isOvernightSegment
      ? task.durationMinutes
      : Math.max(
        task.durationMinutes - VISUAL_END_BREAK_MINUTES,
        5,
      );

  const top = ((task.startMinutes - DAY_START_MINUTES) / HALF_HOUR_MINUTES) * HALF_HOUR_HEIGHT
  const naturalHeight = (visualDurationMinutes / HALF_HOUR_MINUTES) * HALF_HOUR_HEIGHT
  const height = Math.max(20, naturalHeight)

  //Xử lý hiển thị nội dung task ngắn trên lịch
  //Nếu task <35p : hiển thị tên và time cùng 1 dòng
  //Nếu task <20p : chỉ hiển thị tên task
  const isMedium = task.durationMinutes < 35;
  const isShort = task.durationMinutes < 20;

  // Ẩn nút restructure trên segment 'end' để tránh nhầm lẫn
  const showRestructure = isOverdue && !isFixed && task.segmentPart !== 'end'

  const handleDragStart = (event: React.DragEvent) => {
    if (isFixed) {
      event.preventDefault()
      setShaking(true)
      window.setTimeout(() => setShaking(false), 500)
      return
    }
    onDragStart?.(event, task)
  }

  // Styles based on status
  let bg = colors.bg
  let border = `1px solid ${colors.bg}`
  let textColor = colors.text
  let opacity: number | undefined = undefined

  if (isOverdue) {
    bg = '#FDEBD0'
    border = '1px solid #E8993A'
    textColor = '#C1644C'
  } else if (isVisuallyOverdue) {
    bg = colors.bg
    border = '1px dashed #E8993A'
  } else if (isCompleted) {
    bg = 'rgba(95, 175, 110, 0.18)'
    border = `1px solid ${colors.bg}`
    textColor = colors.text
    opacity = 0.7
  }

  const handleStartPomodoro = (event: React.MouseEvent) => {
    event.stopPropagation()
    const query = new URLSearchParams()
    query.set('taskId', task.taskId)
    if (task.subtaskId) {
      query.set('subtaskId', task.subtaskId)
    }
    query.set('scheduleSlotId', task.id)
    window.location.href = `/focus?${query.toString()}`
  }

  return (
    <div
      draggable={!isFixed}
      onDragStart={handleDragStart}
      className={`absolute z-10 overflow-hidden px-2 py-1.5 rounded-lg transition-opacity
        ${shaking ? 'animate-shake' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
      style={{
        top,
        height,
        left: 4,
        right: 4,
        background: bg,
        border,
        cursor: isFixed ? 'default' : 'grab',
        opacity,
      }}
      title={`${task.title} · ${formatTime(task.startAt)}–${formatTime(task.endAt)}${isVisuallyOverdue ? ' (Trễ lịch trình)' : ''}${isCompleted ? ' (Đã hoàn thành)' : ''}`}
    >
      {isMedium ? (
        <div className="flex items-center gap-1 overflow-hidden pr-3">
          <p
            className="text-[11px] font-semibold truncate"
            style={{ color: textColor, textDecoration: isCompleted ? 'line-through' : 'none' }}
          >
            {task.title}
          </p>

          {!isShort && (
            <span
              className="shrink-0 text-[9px]"
              style={{ color: textColor, opacity: 0.75 }}
            >
              {formatTime(task.startAt)}–{formatTime(task.endAt)}
            </span>
          )}

          {showRestructure && (
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <button
                type="button"
                onClick={handleStartPomodoro}
                className="flex items-center justify-center p-0.5 rounded"
                style={{
                  background: 'rgba(95,175,110,0.2)',
                  color: '#5FAF6E',
                }}
                title="Bắt đầu Pomodoro muộn"
              >
                <Play size={9} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onRestructure?.(task)
                }}
                className="flex items-center justify-center p-0.5 rounded"
                style={{
                  background: 'rgba(232,153,58,0.2)',
                  color: '#E8993A',
                }}
                title="Tái cấu trúc công việc"
              >
                <HelpCircle size={9} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between pr-3">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: textColor, textDecoration: isCompleted ? 'line-through' : 'none' }}
            >
              {task.title}
            </p>

            {showRestructure && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleStartPomodoro}
                  className="flex items-center justify-center p-0.5 rounded"
                  style={{
                    background: 'rgba(95,175,110,0.2)',
                    color: '#5FAF6E',
                  }}
                  title="Bắt đầu Pomodoro muộn"
                >
                  <Play size={9} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRestructure?.(task)
                  }}
                  className="flex items-center justify-center p-0.5 rounded"
                  style={{
                    background: 'rgba(232,153,58,0.2)',
                    color: '#E8993A',
                  }}
                  title="Tái cấu trúc công việc"
                >
                  <HelpCircle size={9} />
                </button>
              </div>
            )}
          </div>

          <p
            className="text-[10px] mt-0.5"
            style={{ color: textColor, opacity: 0.8 }}
          >
            {formatTime(task.startAt)}–{formatTime(task.endAt)}
          </p>
        </>
      )}

      {isFixed && !isCompleted && (
        <div
          className="absolute top-1 right-1"
          style={{ color: textColor }}
          title="Công việc cố định"
        >
          <Lock size={10} />
        </div>
      )}

      {isCompleted && (
        <div
          className="absolute top-1 right-1"
          style={{ color: 'rgb(95, 175, 110)' }}
          title="Đã hoàn thành"
        >
          <CheckCircle size={10} />
        </div>
      )}

      {isOverdue && !isFixed && task.segmentPart !== 'end' && (
        <div
          className="absolute bottom-1 right-1"
          style={{ color: '#E8993A' }}
          title="Công việc quá hạn"
        >
          <AlertTriangle size={10} />
        </div>
      )}

      {/* Overnight continuation indicators */}
      {task.segmentPart === 'start' && (
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-center items-center"
          style={{ height: 14, background: 'rgba(0,0,0,0.06)', borderTop: '1px dashed rgba(0,0,0,0.15)' }}
          title="Tiếp tục sang ngày hôm sau"
        >
          <span style={{ fontSize: 8, opacity: 0.55, letterSpacing: 1 }}>▼ tiếp</span>
        </div>
      )}
      {task.segmentPart === 'end' && (
        <div
          className="absolute top-0 left-0 right-0 flex justify-center items-center"
          style={{ height: 14, background: 'rgba(0,0,0,0.06)', borderBottom: '1px dashed rgba(0,0,0,0.15)' }}
          title="Tiếp theo từ ngày hôm trước"
        >
          <span style={{ fontSize: 8, opacity: 0.55, letterSpacing: 1 }}>▲ tiếp theo</span>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}

interface CompareModalProps {
  open: boolean
  onClose: () => void
  title: string
  before: ScheduleTask[]
  after: ScheduleTask[]
  warning?: string
  onConfirm?: () => void
  showConfirm?: boolean
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
  if (!open) return null

  const renderTask = (task: ScheduleTask) => {
    const colors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low
    return (
      <div
        key={task.id}
        className="px-3 py-2 rounded-lg text-sm"
        style={{ background: colors.bg, color: colors.text }}
      >
        <p className="font-medium">{task.title}</p>
        <p className="text-xs opacity-80">
          {DAYS[task.dayOfWeek] || ''}, {formatTime(task.startAt)}–
          {formatTime(task.endAt)}
        </p>
      </div>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={title} width={600}>
      <div className="p-6">
        {warning && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: '#F7E7A8', color: '#B8860B' }}
          >
            <span className="font-medium">{warning}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: '#5F6E5F' }}>
              Trước
            </h4>
            <div className="space-y-2">{before.map(renderTask)}</div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: '#5F6E5F' }}>
              Sau
            </h4>
            <div className="space-y-2">{after.map(renderTask)}</div>
          </div>
        </div>

        {showConfirm && (
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#F4FAF4', color: '#5F6E5F' }}
            >
              Hủy bỏ
            </button>
            <button
              onClick={() => {
                onConfirm?.()
                onClose()
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#5FAF6E', color: '#FFFFFF' }}
            >
              Đồng ý áp dụng
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

interface SchedulePageProps {
  onToast: (toast: ToastMessage) => void
}

export default function SchedulePage({ onToast }: SchedulePageProps) {
  const [currentWeek, setCurrentWeek] = useState<WeekInfo>(
    getWeekForDate(new Date()),
  )
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [loadingAutoSchedule, setLoadingAutoSchedule] = useState(false)
  const [autoScheduleBanner, setAutoScheduleBanner] = useState<string | null>(null)
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [restructureModalOpen, setRestructureModalOpen] = useState(false)
  const [restructureTask, setRestructureTask] = useState<ScheduleTask | null>(null)
  const [restructurePreview, setRestructurePreview] = useState<{
    before: ScheduleTask[]
    after: ScheduleTask[]
    warning?: string
  } | null>(null)
  const [draggedTask, setDraggedTask] = useState<ScheduleTask | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const adaptApiSlots = useCallback(
    (slots: ScheduleSlot[]): ScheduleTask[] =>
      slots.flatMap((slot) => {
        const startAt = new Date(slot.startAt)
        const endAt = new Date(slot.endAt)

        // Không để dữ liệu hỏng (end <= start) phá vỡ toàn bộ calendar.
        if (
          Number.isNaN(startAt.getTime()) ||
          Number.isNaN(endAt.getTime()) ||
          endAt <= startAt
        ) {
          console.warn('Bỏ qua schedule slot không hợp lệ:', slot)
          return []
        }

        // Lọc theo khoảng thời gian thực tế của tuần đang hiển thị để tránh bỏ sót các slot giao với biên thời gian
        const weekEnd = new Date(currentWeek.start)
        weekEnd.setDate(weekEnd.getDate() + 7)
        if (endAt <= currentWeek.start || startAt >= weekEnd) {
          return []
        }

        const dayOfWeek = getDayDifference(startAt, currentWeek.start)

        // Tính theo local timezone: số phút kể từ 00:00 của ngày bắt đầu
        const startMinutes = startAt.getHours() * 60 + startAt.getMinutes()
        const totalDurationMinutes = Math.round(
          (endAt.getTime() - startAt.getTime()) / 60_000,
        )

        const priority: TaskPriority =
          slot.task.importance === 'CRITICAL' || slot.task.importance === 'HIGH'
            ? 'high'
            : slot.task.importance === 'MEDIUM'
              ? 'medium'
              : 'low'
        const status: TaskStatus =
          slot.status === 'FROZEN_OVERDUE'
            ? 'frozen_overdue'
            : slot.status === 'COMPLETED' || slot.isCompleted || slot.task?.status === 'DONE'
              ? 'completed'
              : 'scheduled'

        const baseTask = {
          id: slot.id,
          taskId: slot.taskId,
          subtaskId: slot.subtaskId,
          title:
            slot.unit?.title ??
            slot.subtask?.title ??
            slot.task?.title ??
            'Công việc',
          startAt: slot.startAt,
          endAt: slot.endAt,
          priority,
          status,
          type: slot.task.isFixedTask ? 'fixed' : 'flexible',
        } as const

        const MINUTES_PER_DAY = 24 * 60
        const crossesMidnight = startMinutes + totalDurationMinutes > MINUTES_PER_DAY

        if (!crossesMidnight) {
          // Slot bình thường, không qua đêm
          if (dayOfWeek < 0 || dayOfWeek > 6) return []
          return [
            {
              ...baseTask,
              dayOfWeek,
              startMinutes,
              durationMinutes: totalDurationMinutes,
              dragOffsetMinutes: 0,
            },
          ]
        }

        // --- Overnight split ---
        // Dùng loop để hỗ trợ slot kéo dài nhiều ngày (>= 48h)
        // Mốc nửa đêm tính theo local timezone: midnight = 00:00 ngày tiếp theo
        const segments: ScheduleTask[] = []
        let remainingMinutes = totalDurationMinutes
        let currentDayIndex = dayOfWeek
        let currentStartMinutes = startMinutes

        while (remainingMinutes > 0 && currentDayIndex <= 6) {
          const minutesUntilMidnight = MINUTES_PER_DAY - currentStartMinutes
          const isFirstSegment = currentDayIndex === dayOfWeek
          const segmentDuration = Math.min(remainingMinutes, minutesUntilMidnight)
          const isLastSegment = segmentDuration === remainingMinutes
          const isMultiDaySlot = totalDurationMinutes > MINUTES_PER_DAY || !isFirstSegment

          if (currentDayIndex >= 0) {
            const segmentStart = new Date(startAt.getTime() + (totalDurationMinutes - remainingMinutes) * 60_000)
            const dragOffsetMinutes = Math.round((segmentStart.getTime() - startAt.getTime()) / 60_000)

            segments.push({
              ...baseTask,
              dayOfWeek: currentDayIndex,
              startMinutes: currentStartMinutes,
              durationMinutes: segmentDuration,
              // Chỉ đánh dấu overnight nếu slot thực sự bị tách
              isOvernightSegment: isMultiDaySlot || !isLastSegment,
              segmentPart: isFirstSegment
                ? 'start'
                : isLastSegment
                  ? 'end'
                  : 'start', // Đoạn giữa (ngày trọn vẹn) cũng dùng 'start' để hiện ▼
              dragOffsetMinutes,
            })
          }

          remainingMinutes -= segmentDuration
          currentDayIndex += 1
          currentStartMinutes = 0 // Các ngày tiếp theo bắt đầu từ 00:00
        }

        return segments
      }),
    [currentWeek.start],
  )

  const loadSlots = useCallback(async () => {
    const from = currentWeek.start.toISOString()
    const exclusiveEnd = new Date(currentWeek.end)
    exclusiveEnd.setDate(exclusiveEnd.getDate() + 1)
    const to = exclusiveEnd.toISOString()

    const slots = await schedulerService.getSlots(from, to)
    setTasks(adaptApiSlots(slots))
  }, [currentWeek.start, currentWeek.end, adaptApiSlots])

  useEffect(() => {
    loadSlots().catch(() => setTasks([]))
  }, [loadSlots])

  const goToPrevWeek = () => {
    const value = new Date(currentWeek.start)
    value.setDate(value.getDate() - 7)
    setCurrentWeek(getWeekForDate(value))
  }

  const goToNextWeek = () => {
    const value = new Date(currentWeek.start)
    value.setDate(value.getDate() + 7)
    setCurrentWeek(getWeekForDate(value))
  }

  const goToThisWeek = () => setCurrentWeek(getWeekForDate(new Date()))

  const handleAutoSchedule = async () => {
    setLoadingAutoSchedule(true)
    setAutoScheduleBanner(null)

    try {
      const result = await schedulerService.generateWeekly()
      const warningText =
        result.warnings.length > 0
          ? ` · ${result.warnings.length} cảnh báo`
          : ''
      setAutoScheduleBanner(`${result.message}${warningText}`)
      await loadSlots()
    } catch {
      onToast(
        createToast(
          'error',
          'Không thể tạo lịch tự động. Kiểm tra kết nối.',
        ),
      )
    } finally {
      setLoadingAutoSchedule(false)
    }
  }

  const handleRestructure = async (task: ScheduleTask) => {
    setRestructureTask(task)
    onToast(createToast('success', 'Đang tính toán phương án tái cấu trúc...'))

    try {
      const preview = await schedulerService.previewOverdueRestructure(task.id)

      const before = adaptApiSlots([preview.originalSlot])
      const after = adaptApiSlots(preview.affectedSlots)

      let warningText = 'Hệ thống đã cộng Reschedule Penalty cho các task bị ảnh hưởng.'
      if (preview.warnings && preview.warnings.length > 0) {
        warningText += ` Cảnh báo: ${preview.warnings.map((w: any) => w.message).join(', ')}`
      }

      setRestructurePreview({
        before,
        after,
        warning: warningText
      })
      setRestructureModalOpen(true)
    } catch {
      onToast(
        createToast('error', 'Không thể tái cấu trúc lịch. Thử lại sau.'),
      )
    }
  }

  const handleDragStart = (
    event: React.DragEvent,
    task: ScheduleTask,
  ) => {
    setDraggedTask(task)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDropOnDay = async (
    event: React.DragEvent<HTMLDivElement>,
    dayOfWeek: number,
  ) => {
    event.preventDefault()
    if (!draggedTask || draggedTask.type === 'fixed') return

    const rect = event.currentTarget.getBoundingClientRect()
    const relativeY = Math.max(0, Math.min(CALENDAR_HEIGHT, event.clientY - rect.top))
    const rawMinute =
      DAY_START_MINUTES +
      (relativeY / HALF_HOUR_HEIGHT) * HALF_HOUR_MINUTES
    const snappedMinute = Math.round(rawMinute / 5) * 5

    const newStartAt = new Date(currentWeek.start)
    newStartAt.setDate(newStartAt.getDate() + dayOfWeek)
    newStartAt.setHours(
      Math.floor(snappedMinute / 60),
      snappedMinute % 60,
      0,
      0,
    )

    // Tính toán thời gian bắt đầu và kết thúc của TOÀN BỘ slot (thay vì chỉ của segment đang kéo)
    const dragOffset = draggedTask.dragOffsetMinutes || 0
    const slotStartAt = new Date(newStartAt.getTime() - dragOffset * 60_000)

    const totalDuration = Math.round(
      (new Date(draggedTask.endAt).getTime() - new Date(draggedTask.startAt).getTime()) / 60_000,
    )
    const slotEndAt = new Date(slotStartAt.getTime() + totalDuration * 60_000)

    const previousTask = draggedTask
    const baseTask = {
      id: draggedTask.id,
      taskId: draggedTask.taskId,
      subtaskId: draggedTask.subtaskId,
      title: draggedTask.title,
      startAt: slotStartAt.toISOString(),
      endAt: slotEndAt.toISOString(),
      priority: draggedTask.priority,
      status: draggedTask.status,
      type: draggedTask.type,
    }

    const newSegments = splitTaskIntoSegments(baseTask, slotStartAt, slotEndAt, currentWeek.start)

    setTasks((previous) => {
      const filtered = previous.filter((task) => task.id !== draggedTask.id)
      return [...filtered, ...newSegments]
    })
    setDraggedTask(null)

    try {
      await schedulerService.updateSlot(
        previousTask.id,
        slotStartAt.toISOString(),
        slotEndAt.toISOString(),
      )
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Không thể lưu thay đổi vị trí. Đang hoàn tác...'
      onToast(
        createToast(
          'error',
          msg,
        ),
      )
      loadSlots()
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <header
        className="sticky top-0 z-30 px-6 lg:px-10 py-4"
        style={{
          background: 'rgba(244, 250, 244, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E8F5E8',
        }}
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

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1 px-1.5 py-1 rounded-xl"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E8F5E8',
              }}
            >
              <button
                onClick={goToPrevWeek}
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ color: '#5F6E5F' }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToThisWeek}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                style={{ color: '#5FAF6E' }}
              >
                Tuần này
              </button>
              <button
                onClick={goToNextWeek}
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ color: '#5F6E5F' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              onClick={handleAutoSchedule}
              disabled={loadingAutoSchedule}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: '#5FAF6E', color: '#FFFFFF' }}
            >
              <Sparkles size={16} />
              Lên lịch tự động
            </button>
          </div>
        </div>

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

      <div className="flex-1 px-6 lg:px-10 py-6">
        <div
          ref={calendarRef}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(36, 48, 36, 0.06)',
          }}
        >
          {loadingAutoSchedule && <ShimmerOverlay />}
        
        {/* Grid tổng thể lịch */}
          <div className="overflow-x-auto">
            <div
              className="grid"
              style={{
                gridTemplateColumns: '60px repeat(7, minmax(140px, 1fr))',
                minWidth: '1040px',
              }}
            >
              <div
                className="px-2 py-3 text-xs font-semibold text-center"
                style={{ background: '#F4FAF4', color: '#9CA3AF' }}
              >
                Giờ
              </div>

              {DAYS.map((dayName, index) => {
                const today = isToday(index, currentWeek.start)
                const dayDate = new Date(currentWeek.start)
                dayDate.setDate(dayDate.getDate() + index)

                return (
                  <div
                    key={dayName}
                    className="px-2 py-3 text-center"
                    style={{
                      background: today ? '#DDF3DF' : '#F4FAF4',
                      borderBottom: today
                        ? '2px solid #5FAF6E'
                        : 'none',
                    }}
                  >
                    <p
                      className="text-xs font-semibold"
                      style={{ color: today ? '#5FAF6E' : '#5F6E5F' }}
                    >
                      {dayName}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: today ? '#243024' : '#9CA3AF' }}
                    >
                      {dayDate.getDate()}/{dayDate.getMonth() + 1}
                    </p>
                  </div>
                )
              })}

              <div
                className="relative"
                style={{
                  height: CALENDAR_HEIGHT,
                  background: 'rgba(244, 250, 244, 0.5)',
                }}
              >
                {TIME_MARKS.map((mark, index) => (
                  <div
                    key={mark.totalMinutes}
                    className="absolute left-0 right-0 border-t px-2 text-xs text-right"
                    style={{
                      top: mark.top,
                      borderColor: '#E8F5E8',
                      color: '#9CA3AF',
                    }}
                  >
                    {index % 2 === 0 ? mark.label : ''}
                  </div>
                ))}
              </div>

              {DAYS.map((_, dayIndex) => {
                const today = isToday(dayIndex, currentWeek.start)
                const dayTasks = tasks.filter(
                  (task) =>
                    task.dayOfWeek === dayIndex &&
                    task.startMinutes < DAY_END_MINUTES &&
                    task.startMinutes + task.durationMinutes >
                    DAY_START_MINUTES,
                )

                return (
                  <div
                    key={`day-column-${dayIndex}`}
                    className="relative border-l"
                    style={{
                      height: CALENDAR_HEIGHT,
                      borderColor: '#E8F5E8',
                      background: today
                        ? 'rgba(221, 243, 223, 0.3)'
                        : 'transparent',
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                    }}
                    onDrop={(event) => handleDropOnDay(event, dayIndex)}
                  >
                    {TIME_MARKS.map((mark) => (
                      <div
                        key={mark.totalMinutes}
                        className="absolute left-0 right-0 border-t pointer-events-none"
                        style={{
                          top: mark.top,
                          borderColor: '#E8F5E8',
                        }}
                      />
                    ))}

                    {dayTasks.map((task) => (
                      <TaskBlock
                        key={task.id}
                        task={task}
                        onDragStart={handleDragStart}
                        onRestructure={handleRestructure}
                        isDragging={draggedTask?.id === task.id}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <CompareModal
        open={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title="Lịch tự động hiện tại"
        before={tasks}
        after={tasks}
        showConfirm={false}
      />

      <CompareModal
        open={restructureModalOpen}
        onClose={() => {
          setRestructureModalOpen(false)
          setRestructurePreview(null)
        }}
        title={`Tái cấu trúc lịch trình cho "${restructureTask?.title || ''}"`}
        before={restructurePreview?.before || []}
        after={restructurePreview?.after || []}
        warning={restructurePreview?.warning}
        showConfirm={true}
        onConfirm={async () => {
          if (!restructureTask) return
          onToast(createToast('success', 'Đang áp dụng lịch trình mới...'))
          try {
            await schedulerService.confirmOverdueRestructure(restructureTask.id)
            onToast(createToast('success', 'Tái cấu trúc thành công.'))
            await loadSlots()
          } catch {
            onToast(createToast('error', 'Không thể áp dụng tái cấu trúc.'))
          }
        }}
      />
    </div>
  )
}
