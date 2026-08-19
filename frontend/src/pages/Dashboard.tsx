import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bell,
  Search,
  Play,
  Pause,
  RotateCcw,
  Check,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  Zap,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import tasksService from '../services/tasks.service';
import focusService from '../services/focus.service';
import accountService, { type ProcrastinationScoreData } from '../services/account.service';
import analyticsService, { type OverdueSummary } from '../services/analytics.service';
import schedulerService from '../services/scheduler.service';
import type { Importance, TaskStatus } from '../types';

/* ─── Types ─── */
interface TaskItem {
  id: string;
  title: string;
  deadline: string;
  importance: Importance;
  status: TaskStatus;
  score: number;
  duration: string;
}

interface TimeSlot {
  id: string;
  time: string;
  taskTitle: string;
  taskId: string;
  subtaskId: string | null;
  isCompleted: boolean;
}

type AiBannerState = 'ready' | 'new_user' | 'loading' | 'error';

/* Format date dd/mm/yyyy, HH:mm */
function formatDateTime(value: string | undefined | null): string {
  if (!value || value === 'Không có hạn') return value || 'Không có hạn';
  // Fixed tasks store a range like "2026-07-09T15:00:00.000Z–2026-07-09T16:00:00.000Z"
  if (value.includes('–')) {
    const parts = value.split('–');
    return parts
      .map((part) => {
        const d = new Date(part.trim());
        if (isNaN(d.getTime())) return part.trim();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const HH = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy}, ${HH}:${min}`;
      })
      .join(' – ');
  }

  const d = new Date(value.trim());
  if (isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${HH}:${min}`;
}

function formatSlotTime(dateIso: string): string {
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
}

function getPriorityStyle(p: Importance) {
  switch (p) {
    case 'CRITICAL':
      return { bg: '#FADBD8', text: '#C0392B', label: 'Critical' };
    case 'HIGH':
      return { bg: '#F6D8C7', text: '#C1644C', label: 'High' };
    case 'MEDIUM':
      return { bg: '#FCF3CF', text: '#D4AC0D', label: 'Medium' };
    case 'LOW':
    default:
      return { bg: '#D5F5E3', text: '#27AE60', label: 'Low' };
  }
}



export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionSlotId, setCurrentSessionSlotId] = useState<string | null>(null);
  const [currentSessionTaskId, setCurrentSessionTaskId] = useState<string | null>(null);
  const [currentSessionData, setCurrentSessionData] = useState<any | null>(null);
  const [aiBannerState] = useState<AiBannerState>('new_user');
  const [showReshuffleBanner, setShowReshuffleBanner] = useState(false);
  const [procrastScore, setProcrastScore] = useState<ProcrastinationScoreData | null>(null);
  const [yesterdayProcrastScore, setYesterdayProcrastScore] = useState<ProcrastinationScoreData | null>(null);
  const [overdueSummary, setOverdueSummary] = useState<OverdueSummary | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  const loadTodaySlots = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const slots = await schedulerService.getSlots(todayStart.toISOString(), todayEnd.toISOString());

      const mapped: TimeSlot[] = slots.map((slot) => {
        const title = slot.unit?.title ?? slot.subtask?.title ?? slot.task?.title ?? 'Công việc';
        const time = formatSlotTime(slot.startAt);

        return {
          id: slot.id,
          time,
          taskTitle: title,
          taskId: slot.taskId,
          subtaskId: slot.subtaskId,
          isCompleted: slot.isCompleted || slot.status === 'COMPLETED',
        };
      });
      setTimeSlots(mapped);
    } catch (err) {
      console.error('Failed to load slots:', err);
    }
  }, []);

  /* ── Load current Pomodoro session ── */
  useEffect(() => {
    focusService.getCurrentSession()
      .then((data) => {
        if (data && data.session) {
          setCurrentSessionData(data);
          setCurrentSessionId(data.session.id);
          setCurrentSessionSlotId(data.session.scheduleSlotId);
          setCurrentSessionTaskId(data.session.taskId);
          setSecondsLeft(data.session.remainingSeconds);
          setRunning(data.session.status === 'IN_PROGRESS');
          if (data.session.taskId) {
            setSelectedTaskId(data.session.taskId);
          }
        }
      })
      .catch(() => { });
  }, []);

  /* ── Load tasks from API ── */
  useEffect(() => {
    tasksService.getTasks()
      .then((data) => {
        const mapped: TaskItem[] = data.map(t => ({
          id: t.id,
          title: t.title,
          deadline: t.deadline || t.fixedTime || 'Không có hạn',
          importance: t.importance,
          status: t.status,
          score: t.priorityScore,
          duration: `${t.subtasks && t.subtasks.length > 0 ? t.subtasks.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0) : (t.estimatedMinutes || 25)} min`,
        }));
        setTasks(mapped);
        if (mapped.length > 0) setSelectedTaskId(mapped[0].id);
      })
      .catch(() => { /* Giữ tasks rỗng nếu API lỗi */ });
  }, []);

  /* ── Load today's slots ── */
  useEffect(() => {
    loadTodaySlots();
  }, [loadTodaySlots]);

  /* ── Load Procrastination Score & Overdue Summary ── */
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    accountService.getProcrastinationScore(today)
      .then(setProcrastScore)
      .catch(() => { /* Fallback to null — UI hiển 0 */ });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    accountService.getProcrastinationScore(yesterdayStr)
      .then(setYesterdayProcrastScore)
      .catch(() => {});

    analyticsService.getOverdueSummary()
      .then((summary) => {
        setOverdueSummary(summary);
        if (summary.latestProcrastinationScore) {
          setProcrastScore(summary.latestProcrastinationScore as any);
        }
      })
      .catch(() => { });
  }, []);

  /* ── Pomodoro countdown ── */
  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running, secondsLeft]);

  /* ── Auto-complete session when countdown reaches 0 ── */
  useEffect(() => {
    if (secondsLeft === 0 && currentSessionId) {
      setRunning(false);
      focusService.completeSession(currentSessionId)
        .then(() => {
          setCurrentSessionId(null);
          setCurrentSessionSlotId(null);
          setCurrentSessionTaskId(null);
          setCurrentSessionData(null);
          loadTodaySlots();
        })
        .catch(() => {
          setCurrentSessionId(null);
          setCurrentSessionSlotId(null);
          setCurrentSessionTaskId(null);
          setCurrentSessionData(null);
        });
    } else if (secondsLeft === 0) {
      setRunning(false);
    }
  }, [secondsLeft, currentSessionId, loadTodaySlots]);

  const resetTimer = () => {
    setRunning(false);
    setSecondsLeft(25 * 60);
    if (currentSessionId) {
      focusService.cancelSession(currentSessionId, 'Bị cắt ngang').catch(() => { });
      setCurrentSessionId(null);
      setCurrentSessionSlotId(null);
      setCurrentSessionTaskId(null);
      setCurrentSessionData(null);
    }
  };

  /* ── Toggle Pomodoro start/pause via API ── */
  const handleToggleTimer = useCallback(async () => {
    if (!selectedTask) return;
    if (running) {
      setRunning(false);
      if (currentSessionId) {
        await focusService.pauseSession(currentSessionId).catch(() => { });
      }
    } else {
      if (!currentSessionId) {
        try {
          const matchingSlot = timeSlots.find(
            (s) => s.taskId === selectedTask.id && !s.isCompleted
          );
          const resp = await focusService.startSession(
            selectedTask.id,
            matchingSlot ? matchingSlot.subtaskId : null,
            matchingSlot ? matchingSlot.id : null
          );
          setCurrentSessionData(resp);
          setCurrentSessionId(resp.session.id);
          setCurrentSessionSlotId(resp.session.scheduleSlotId);
          setCurrentSessionTaskId(resp.session.taskId);
          setSecondsLeft(resp.session.plannedDuration * 60);
          setRunning(true);
        } catch {
          // Fallback: bắt đầu cố định khi API không khả dụng
          setRunning(true);
        }
      } else {
        await focusService.resumeSession(currentSessionId).catch(() => { });
        setRunning(true);
      }
    }
  }, [running, currentSessionId, selectedTask, timeSlots]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (secondsLeft / (25 * 60));

  /* Procrastination score display values */
  const displayScore = procrastScore?.score ?? 0;
  const scoreColor = displayScore <= 30 ? '#5FAF6E' : displayScore <= 60 ? '#B8860B' : '#C1644C';
  const scoreBg = displayScore <= 30 ? '#DDF3DF' : displayScore <= 60 ? '#F7E7A8' : '#F6D8C7';
  const scoreClassification = procrastScore?.classification ?? 'Tốt';

  const yesterdayDisplayScore = yesterdayProcrastScore?.score ?? 0;
  const scoreDiff = Math.abs(displayScore - yesterdayDisplayScore);
  const isBetter = displayScore <= yesterdayDisplayScore;





  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between py-4 px-6 lg:px-8 mb-6"
        style={{ background: 'rgba(244, 250, 244, 0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #E8F5E8' }}
      >
        <div>
          <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#243024' }}>Good morning, {displayName}</h1>
          <p className="text-sm mt-0.5" style={{ color: '#5F6E5F' }}>Tập trung vào điều quan trọng nhất hôm nay.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: '#FFFFFF', border: '1px solid #E8F5E8', color: '#9CA3AF' }}>
            <Search size={15} /><span>Tìm kiếm task...</span>
          </div>
          <button className="relative flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E8F5E8' }}>
            <Bell size={18} style={{ color: '#5F6E5F' }} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
          </button>
          <div className="flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold" style={{ background: '#DDF3DF', color: '#5FAF6E' }}>{initials}</div>
        </div>
      </header>

      <div className="px-6 lg:px-8 space-y-6 max-w-5xl pb-8">
        {/* Overdue alert banner */}
        {overdueSummary && overdueSummary.current.frozenSlotCount > 0 && (
          <div className="flex items-center justify-between rounded-2xl p-4 transition-all duration-150" style={{ background: '#FFF3CD', border: '1px solid #FFEBAA' }}>
            <div className="flex items-center gap-3">
              <AlertCircle size={20} style={{ color: '#856404' }} />
              <span className="text-sm" style={{ color: '#856404' }}>
                Bạn đang có <strong style={{ color: '#856404' }}>{overdueSummary.current.frozenSlotCount} lịch trình chưa bắt đầu (quá hạn)</strong>. Hãy tái cấu trúc để sắp xếp lại!
              </span>
            </div>
            <button
              onClick={() => { navigate('/schedule') }}
              className="flex items-center gap-1 text-sm font-semibold hover:opacity-80"
              style={{ color: '#856404' }}
            >
              Xem trên lịch trình <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* AI Banner */}

        {aiBannerState === 'ready' && (
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, #F0FBF0 0%, #E8F5E9 100%)', border: '1px solid rgba(95,175,110,0.25)' }}>
            <div className="flex items-center justify-center rounded-full shrink-0 mt-0.5" style={{ width: 32, height: 32, background: '#DDF3DF' }}>
              <Sparkles size={16} style={{ color: '#5FAF6E' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: '#243024' }}>
                "Giờ cao điểm của bạn là <strong style={{ color: '#5FAF6E' }}>9–11 SA</strong>. Hãy đặt lịch deep work trong khung giờ này — bạn hoàn thành{' '}
                <strong style={{ color: '#5FAF6E' }}>40% nhiều hơn</strong> trong khoảng đó."
              </p>
              <a href="/ai-insights" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: '#5FAF6E' }}>
                Xem phân tích AI chi tiết <ArrowRight size={12} />
              </a>
            </div>
          </div>
        )}
        {
          aiBannerState === 'new_user' && (
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, #F0FBF0 0%, #E8F5E9 100%)', border: '1px solid rgba(95,175,110,0.25)' }}>
              <div className="flex items-center justify-center rounded-full shrink-0 mt-0.5" style={{ width: 32, height: 32, background: '#DDF3DF' }}>
                <Sparkles size={16} style={{ color: '#5FAF6E' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: '#243024' }}>
                  Chào mừng bạn đến với FocusFlow! Hãy bắt đầu hành trình quản lý thời gian của bạn ngay hôm nay.
                </p>
                <a href="/ai-insights" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: '#5FAF6E' }}>
                  Xem phân tích AI chi tiết <ArrowRight size={12} />
                </a>
              </div>
            </div>
          )
        }

        {/* Tasks + Schedule */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Priority Tasks */}
          {/* <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: '#243024' }}>Công việc ưu tiên hôm nay</h2>
                <p className="text-xs mt-0.5" style={{ color: '#5F6E5F' }}>Sắp xếp theo Priority Score</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#F4FAF4', color: '#5F6E5F' }}>
                {tasks.filter((t) => t.status !== 'done').length} còn lại
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {sortedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-2xl mb-2">🌿</span>
                  <p className="text-sm font-semibold" style={{ color: '#243024' }}>Hôm nay không có việc ưu tiên</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>Hãy tạo thêm công việc mới ở trang Bảng công việc.</p>
                </div>
              ) : (
                sortedTasks.map((task) => {
                  const pStyle = getPriorityStyle(task.importance);
                  const sStyle = getStatusStyle(task.status);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150"
                      style={selectedTaskId === task.id
                        ? { background: '#F4FAF4', border: '1px solid #DDF3DF' }
                        : { border: '1px solid transparent' }}
                      onMouseEnter={(e) => { if (selectedTaskId !== task.id) (e.currentTarget as HTMLElement).style.background = '#F9FCF9'; }}
                      onMouseLeave={(e) => { if (selectedTaskId !== task.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <button onClick={(e) => { e.stopPropagation(); toggleStatus(task.id); }} className="shrink-0 transition-transform hover:scale-110">
                        {task.status === 'done'
                          ? <div className="flex items-center justify-center w-5 h-5 rounded-full" style={{ background: '#5FAF6E' }}><Check size={12} color="#fff" strokeWidth={3} /></div>
                          : <Circle size={20} style={{ color: '#D1D5DB' }} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: task.status === 'done' ? '#9CA3AF' : '#243024', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-xs" style={{ color: '#5F6E5F' }}><Clock size={11} /> {formatDateTime(task.deadline)}</span>
                          <span className="w-1 h-1 rounded-full" style={{ background: '#D1D5DB' }} />
                          <span className="flex items-center gap-1 text-xs" style={{ color: '#5F6E5F' }}><Target size={11} /> Score {task.score}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: pStyle.bg, color: pStyle.text }}>{pStyle.label}</span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: sStyle.dot }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sStyle.dot }} /> {sStyle.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div> */}

          {/* Schedule */}
          <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: '#243024' }}>Lịch hôm nay</h2>
                <p className="text-xs mt-0.5" style={{ color: '#5F6E5F' }}></p>
              </div>
              <button
                onClick={() => { navigate('/schedule') }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80"
                style={{ color: '#5FAF6E', border: '1px solid rgba(95,175,110,0.40)' }}
              >
                + Thêm slot
              </button>
            </div>
            <div className="flex flex-col gap-0 relative">
              {timeSlots.length > 0 && (
                <div className="absolute left-[52px] top-2 bottom-2 w-px" style={{ background: '#E8F5E8' }} />
              )}
              {timeSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-2xl mb-2">📅</span>
                  <p className="text-sm font-semibold" style={{ color: '#243024' }}>Hôm nay không có lịch trình</p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Hãy tạo lịch trình ở trang Lịch.</p>
                </div>
              ) : (
                timeSlots.map((slot) => {
                  const isCompleted = slot.isCompleted;
                  const isActive = !isCompleted && (
                    (currentSessionSlotId && currentSessionSlotId === slot.id) ||
                    (!currentSessionSlotId && currentSessionTaskId === slot.taskId && running)
                  );
                  return (
                    <div key={slot.id} className="flex items-start gap-4 py-3 relative">
                      <span className="text-xs font-medium w-10 text-right shrink-0 pt-1.5" style={{ color: '#5F6E5F' }}>{slot.time}</span>
                      <div
                        className="flex-1 rounded-xl p-3 transition-all"
                        style={isActive
                          ? { background: '#F0FBF0', border: '1px solid #DDF3DF' }
                          : isCompleted
                            ? { background: '#FAFAFA', opacity: 0.7 }
                            : { background: '#FFFFFF', border: '1px solid #F4FAF4' }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium" style={{ color: isCompleted ? '#9CA3AF' : '#243024', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                            {slot.taskTitle}
                          </p>
                          {!isCompleted && (
                            <button
                              onClick={() => {
                                const query = new URLSearchParams();
                                query.set('taskId', slot.taskId);
                                if (slot.subtaskId) {
                                  query.set('subtaskId', slot.subtaskId);
                                }
                                query.set('scheduleSlotId', slot.id);
                                navigate(`/focus?${query.toString()}`);
                              }}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-90"
                              style={{ background: isActive ? '#5FAF6E' : '#F4FAF4', color: isActive ? '#fff' : '#5FAF6E' }}
                            >
                              <Play size={12} /> {isActive ? 'Đang focus' : 'Bắt đầu'}
                            </button>
                          )}
                          {isCompleted && <Check size={14} style={{ color: '#5FAF6E' }} />}
                        </div>
                        {isActive && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs" style={{ color: '#5FAF6E' }}><Zap size={12} /> Pomodoro đang chạy</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pomodoro + Score */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Pomodoro */}
          <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}>
            <div className="relative shrink-0 flex items-center justify-center" style={{ width: 148, height: 148 }}>
              <svg width={148} height={148} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={74} cy={74} r={radius} fill="none" stroke="#DDF3DF" strokeWidth={8} />
                <circle cx={74} cy={74} r={radius} fill="none" stroke="#5FAF6E" strokeWidth={8} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
              </svg>
              <div className="relative flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums" style={{ color: '#243024' }}>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
                <span className="text-xs font-medium mt-0.5" style={{ color: '#5F6E5F' }}>{running ? 'đang chạy' : 'sẵn sàng'}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start flex-wrap">
                {selectedTask ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: getPriorityStyle(selectedTask.importance).bg, color: getPriorityStyle(selectedTask.importance).text }}>
                    {getPriorityStyle(selectedTask.importance).label}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full animate-pulse" style={{ background: '#F4FAF4', color: '#9CA3AF' }}>
                    Chưa chọn task
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold mb-1 truncate" style={{ color: '#243024' }}>
                {selectedTask ? selectedTask.title : 'Chọn task để bắt đầu Pomodoro'}
              </h3>
              <p className="text-xs mb-3" style={{ color: '#5F6E5F' }}>
                {selectedTask ? (
                  running && currentSessionData ? (
                    `${currentSessionData.session.plannedDuration} min · Hạn: ${formatDateTime(selectedTask.deadline)} · Score ${selectedTask.score}/100`
                  ) : (
                    `${selectedTask.duration} · Hạn: ${formatDateTime(selectedTask.deadline)} · Score ${selectedTask.score}/100`
                  )
                ) : '—'}
              </p>
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <button
                  onClick={handleToggleTimer}
                  disabled={!selectedTask}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#5FAF6E', color: '#fff' }}
                >
                  {running ? <Pause size={16} /> : <Play size={16} />}
                  {running ? 'Dừng' : 'Bắt đầu Focus'}
                </button>
                <button
                  onClick={resetTimer}
                  disabled={!selectedTask}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#FFFFFF', color: '#5F6E5F', border: '1px solid #E5E7EB' }}
                >
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Procrastination Score */}
          <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}>
            <div className="relative shrink-0 flex items-center justify-center" style={{ width: 140, height: 140 }}>
              <svg width={140} height={140} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={70} cy={70} r={56} fill="none" stroke="#E5E7EB" strokeWidth={10} />
                <circle cx={70} cy={70} r={56} fill="none" stroke={scoreColor} strokeWidth={10} strokeLinecap="round" strokeDasharray={2 * Math.PI * 56} strokeDashoffset={2 * Math.PI * 56 * (1 - displayScore / 100)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
              </svg>
              <div className="relative flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: scoreColor }}>{Math.round(displayScore)}</span>
                <span className="text-xs" style={{ color: '#5F6E5F' }}>/ 100</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                <h3 className="text-base font-semibold" style={{ color: '#243024' }}>Procrastination Score</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: scoreBg, color: scoreColor }}>{scoreClassification}</span>
              </div>
              <p className="text-xs mb-4" style={{ color: '#5F6E5F' }}>Tính lúc 00:00 hôm nay · Càng thấp càng tốt</p>
              <div className="flex flex-col gap-2">
                {[
                  {
                    name: 'Tỷ lệ trễ deadline',
                    value: Math.round(procrastScore?.breakdown?.delayRate ?? 0),
                    display: `${Math.round(procrastScore?.breakdown?.delayRate ?? 0)}%`,
                    invert: true,
                  },
                  {
                    name: 'Tỷ lệ bỏ lỡ deadline',
                    value: Math.round(procrastScore?.breakdown?.deadlineMissRate ?? 0),
                    display: `${Math.round(procrastScore?.breakdown?.deadlineMissRate ?? 0)}%`,
                    invert: true,
                  },
                  {
                    name: 'Độ chính xác ước lượng thời gian',
                    value: Math.round(procrastScore?.breakdown?.timeDurationAccuracy ?? 0),
                    display: `${Math.round(procrastScore?.breakdown?.timeDurationAccuracy ?? 0)}%`,
                    invert: false,
                  },
                ].map((m) => {
                  const barColor = m.invert
                    ? (m.value > 50 ? '#C1644C' : m.value > 30 ? '#B8860B' : '#5FAF6E')
                    : (m.value > 70 ? '#5FAF6E' : m.value > 50 ? '#B8860B' : '#C1644C');
                  return (
                    <div key={m.name} className="flex items-center gap-3">
                      <span className="text-xs w-36 shrink-0 text-right text-ellipsis overflow-hidden whitespace-nowrap" style={{ color: '#5F6E5F' }} title={m.name}>{m.name}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#E5E7EB' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(m.value, 100)}%`, background: barColor }} />
                      </div>
                      <span className="text-xs font-semibold w-10" style={{ color: '#243024' }}>{m.display}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#F6D8C7', color: '#C1644C' }}>Hôm qua: {Math.round(yesterdayDisplayScore)}</span>
                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: isBetter ? '#5FAF6E' : '#C1644C' }}>
                  <TrendingDown size={12} style={{ transform: isBetter ? 'none' : 'scaleY(-1)' }} /> 
                  {isBetter ? `▼ ${Math.round(scoreDiff)} điểm tốt hơn` : `▲ ${Math.round(scoreDiff)} điểm tệ hơn`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reshuffle Banner */}
        {showReshuffleBanner && (
          <div className="flex items-center justify-between rounded-xl p-4" style={{ background: '#DDF3DF', border: '1px solid rgba(95,175,110,0.30)' }}>
            <div className="flex items-center gap-3">
              <AlertCircle size={20} style={{ color: '#5FAF6E' }} />
              <span className="text-sm" style={{ color: '#243024' }}>Lịch đã được cập nhật! AI đã sắp xếp lại 3 task để đưa bạn trở lại đúng hướng.</span>
            </div>
            <button onClick={() => setShowReshuffleBanner(false)} className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#5FAF6E' }}>
              Xem thay đổi <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
