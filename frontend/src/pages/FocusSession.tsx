import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, X, RotateCcw, ChevronDown } from 'lucide-react';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { createToast, type ToastMessage } from '../components/common/Toast';

import tasksService from '../services/tasks.service';
import focusService, { type DropReason } from '../services/focus.service';
import type { Task as ApiTask } from '../types';

/* ─── Local Task type for this page ─── */
interface Task {
  id: string;
  title: string;
  priority: 'high' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  priorityScore: number;
}

/* ─── Constants ─── */
const FOCUS_DURATION = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const SESSIONS_UNTIL_LONG_BREAK = 4;

type TimerPhase = 'focus' | 'short_break' | 'long_break';
type TimerStatus = 'idle' | 'running' | 'paused';

/* ─── Cancel Reason Modal ─── */
interface CancelModalProps {
  open: boolean;
  onSelect: (reason: string) => void;
}

const CANCEL_REASONS = [
  { id: 'tired', icon: '😴', label: 'Mệt' },
  { id: 'too_hard', icon: '🧩', label: 'Task quá khó' },
  { id: 'interrupted', icon: '⚡', label: 'Bị cắt ngang' },
  { id: 'distracted', icon: '📱', label: 'Bị phân tâm' },
];

function CancelModal({ open, onSelect }: CancelModalProps) {
  return (
    <Modal open={open} onClose={() => {}} title="Bạn cần dừng phiên này vì..." dismissible={false} width={420}>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {CANCEL_REASONS.map((reason) => (
            <button
              key={reason.id}
              onClick={() => onSelect(reason.id)}
              className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl transition-all"
              style={{ background: '#F4FAF4', border: '1px solid #E8F5E8' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#DDF3DF';
                e.currentTarget.style.borderColor = '#5FAF6E';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F4FAF4';
                e.currentTarget.style.borderColor = '#E8F5E8';
              }}
            >
              <span className="text-3xl">{reason.icon}</span>
              <span className="text-sm font-semibold" style={{ color: '#243024' }}>{reason.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ─── Session End Overlay ─── */
interface SessionEndOverlayProps {
  open: boolean;
  phase: TimerPhase;
  completedSessions: number;
  onStartBreak: () => void;
}

function SessionEndOverlay({ open, phase, completedSessions, onStartBreak }: SessionEndOverlayProps) {
  if (!open) return null;

  const isLongBreak = completedSessions > 0 && completedSessions % SESSIONS_UNTIL_LONG_BREAK === 0;
  const breakDuration = isLongBreak ? 15 : 5;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500"
      style={{ background: 'rgba(36, 48, 36, 0.85)' }}
    >
      <div className="text-center">
        <div
          className="inline-flex items-center justify-center rounded-full mb-6"
          style={{
            width: 100,
            height: 100,
            background: 'linear-gradient(135deg, #5FAF6E, #4A9A5A)',
            boxShadow: '0 8px 32px rgba(95, 175, 110, 0.4)',
          }}
        >
          <span className="text-5xl">🎉</span>
        </div>
        <h2 className="text-3xl font-bold mb-3" style={{ color: '#FFFFFF' }}>
          {phase === 'focus' ? 'Hết giờ tập trung!' : 'Hết giờ nghỉ ngơi!'}
        </h2>
        <p className="text-lg mb-8" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
          {phase === 'focus' ? `Nghỉ ${breakDuration} phút nhé` : 'Sẵn sàng cho phiên tiếp theo?'}
        </p>
        <button
          onClick={onStartBreak}
          className="px-8 py-4 rounded-2xl text-lg font-semibold transition-all hover:opacity-90"
          style={{ background: '#5FAF6E', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(95, 175, 110, 0.4)' }}
        >
          {phase === 'focus' ? 'Bắt đầu nghỉ' : 'Bắt đầu tập trung'}
        </button>
      </div>
    </div>
  );
}

/* ─── Task Selector ─── */
interface TaskSelectorProps {
  selectedTask: Task | null;
  onSelect: (task: Task) => void;
  tasks: Task[];
}

function TaskSelector({ selectedTask, onSelect, tasks }: TaskSelectorProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableTasks = tasks.filter((t) => t.status !== 'done');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8F5E8',
          boxShadow: '0 2px 8px rgba(36, 48, 36, 0.06)',
          minWidth: 280,
        }}
      >
        {selectedTask ? (
          <>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold truncate" style={{ color: '#243024' }}>
                {selectedTask.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={selectedTask.priority === 'high' ? 'danger' : 'warning'}>
                  {selectedTask.priority === 'high' ? 'High' : 'Low'}
                </Badge>
                <span className="text-xs font-medium" style={{ color: '#5FAF6E' }}>
                  Score: {selectedTask.priorityScore}
                </span>
              </div>
            </div>
            <ChevronDown
              size={18}
              style={{ color: '#9CA3AF' }}
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </>
        ) : (
          <>
            <p className="flex-1 text-left text-sm" style={{ color: '#9CA3AF' }}>
              Chọn task để tập trung
            </p>
            <ChevronDown
              size={18}
              style={{ color: '#9CA3AF' }}
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-20"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(36, 48, 36, 0.12)',
            border: '1px solid #E8F5E8',
          }}
        >
          <div className="max-h-64 overflow-y-auto">
            {availableTasks.length === 0 ? (
              <p className="px-4 py-3 text-sm text-center" style={{ color: '#9CA3AF' }}>
                Không có task nào
              </p>
            ) : (
              availableTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => { onSelect(task); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{ background: selectedTask?.id === task.id ? '#DDF3DF' : 'transparent' }}
                  onMouseEnter={(e) => {
                    if (selectedTask?.id !== task.id) e.currentTarget.style.background = '#F4FAF4';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTask?.id !== task.id) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#243024' }}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={task.priority === 'high' ? 'danger' : 'warning'}>
                        {task.priority === 'high' ? 'High' : 'Low'}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Focus Sessions Page ─── */
interface FocusSessionsPageProps {
  onToast: (toast: ToastMessage) => void;
}

export default function FocusSessionsPage({ onToast }: FocusSessionsPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(FOCUS_DURATION);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSessionEnd, setShowSessionEnd] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimeRef = useRef(FOCUS_DURATION);

  /* ── Load tasks from API ── */
  useEffect(() => {
    tasksService.getTasks()
      .then((data: ApiTask[]) => {
        const mapped: Task[] = data
          .filter(t => t.status !== 'done')
          .map(t => ({
            id: t.id,
            title: t.title,
            priority: t.importance === 'HIGH' ? 'high' : 'low',
            status: t.status,
            priorityScore: t.priorityScore,
          }));
        setTasks(mapped);
        if (mapped.length > 0) setSelectedTask(mapped[0]);
      })
      .catch(() => {
        onToast(createToast('error', 'Không thể tải danh sách task. Kiểm tra kết nối.'));
      });
  }, []);

  /* ── Recover timer state on page load ── */
  useEffect(() => {
    focusService.getCurrentSession().then((session) => {
      if (!session || session.status !== 'IN_PROGRESS') return;
      // Tính thời gian còn lại: server lưu startedAt + durationMinutes là source of truth
      const startedAt = new Date(session.startedAt).getTime();
      const totalSeconds = session.durationMinutes * 60;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);

      setCurrentSessionId(session.sessionId);
      totalTimeRef.current = totalSeconds;
      setTimeRemaining(remaining);
      setPhase('focus');
      if (remaining > 0) setStatus('running');
    }).catch(() => {});
  }, []);

  const getTotalTime = useCallback((p: TimerPhase) => {
    switch (p) {
      case 'focus': return FOCUS_DURATION;
      case 'short_break': return SHORT_BREAK;
      case 'long_break': return LONG_BREAK;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'focus': return 'Đang tập trung';
      case 'short_break': return 'Nghỉ ngắn';
      case 'long_break': return 'Nghỉ dài';
    }
  };

  useEffect(() => {
    if (status === 'running' && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    }

    if (timeRemaining === 0 && status === 'running') {
      setStatus('idle');
      setShowSessionEnd(true);
      // Gọi API complete khi bộ đếm về 0
      if (currentSessionId) {
        focusService.completeSession(currentSessionId)
          .catch(() => {})
          .finally(() => setCurrentSessionId(null));
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, timeRemaining]);

  const handleStartPause = async () => {
    if (status === 'idle') {
      if (!selectedTask) {
        onToast(createToast('error', 'Vui lòng chọn một task trước khi bắt đầu.'));
        return;
      }
      // Gọi API start session
      try {
        const resp = await focusService.startSession(selectedTask.id);
        setCurrentSessionId(resp.sessionId);
        const totalSeconds = resp.durationMinutes * 60;
        totalTimeRef.current = totalSeconds;
        setTimeRemaining(totalSeconds);
      } catch {
        // Fallback: chạy local nếu API lỗi
        totalTimeRef.current = getTotalTime(phase);
        setTimeRemaining(getTotalTime(phase));
      }
      setStatus('running');
    } else if (status === 'running') {
      setStatus('paused');
      if (currentSessionId) {
        focusService.pauseSession(currentSessionId).catch(() => {});
      }
    } else if (status === 'paused') {
      setStatus('running');
      if (currentSessionId) {
        focusService.resumeSession(currentSessionId).catch(() => {});
      }
    }
  };

  const handleCancel = () => {
    if (status === 'running' || status === 'paused') {
      setShowCancelModal(true);
    }
  };

  const handleCancelReasonSelect = async (reason: string) => {
    setShowCancelModal(false);
    setStatus('idle');
    setTimeRemaining(getTotalTime(phase));

    if (currentSessionId) {
      try {
        await focusService.cancelSession(currentSessionId, reason as DropReason);
        await focusService.sendQuickFeedback(currentSessionId, reason as DropReason);
      } catch {
        // Ghi nhận thất bại nhưng vẫn reset UI
      }
      setCurrentSessionId(null);
    }
    onToast(createToast('error', 'Đã ghi nhận. Phiên này được tính là 1 lần Bỏ ngang'));
  };

  const handleReset = () => {
    setStatus('idle');
    setTimeRemaining(getTotalTime(phase));
    if (currentSessionId) {
      focusService.cancelSession(currentSessionId, 'interrupted').catch(() => {});
      setCurrentSessionId(null);
    }
  };

  const handleSessionEnd = () => {
    setShowSessionEnd(false);

    if (phase === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      onToast(createToast('success', '🎉 Hoàn thành phiên tập trung!'));

      const isLongBreak = newCompletedSessions % SESSIONS_UNTIL_LONG_BREAK === 0;
      const nextPhase: TimerPhase = isLongBreak ? 'long_break' : 'short_break';
      setPhase(nextPhase);
      setTimeRemaining(getTotalTime(nextPhase));
      totalTimeRef.current = getTotalTime(nextPhase);
    } else {
      setPhase('focus');
      setTimeRemaining(FOCUS_DURATION);
      totalTimeRef.current = FOCUS_DURATION;
    }
  };

  const handleDemoEndSession = () => {
    if (status === 'running') {
      setTimeRemaining(0);
      setStatus('idle');
      setShowSessionEnd(true);
    } else if (status === 'idle') {
      setShowSessionEnd(true);
    }
  };

  const progress = status === 'idle'
    ? 0
    : ((totalTimeRef.current - timeRemaining) / totalTimeRef.current) * 100;

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6"
      style={{ background: '#F4FAF4' }}
    >
      {/* Demo button */}
      <button
        onClick={handleDemoEndSession}
        className="fixed bottom-6 right-6 px-3 py-2 rounded-lg text-xs font-medium z-30 transition-all"
        style={{ background: 'rgba(95, 175, 110, 0.15)', color: '#5FAF6E' }}
      >
        ⏩ Kết thúc phiên (demo)
      </button>

      {/* Task selector */}
      <div className="mb-10">
        <TaskSelector selectedTask={selectedTask} onSelect={setSelectedTask} tasks={tasks} />
      </div>

      {/* Timer display */}
      <div className="relative mb-8">
        <ProgressRing
          value={progress}
          size={320}
          strokeWidth={12}
          color="#5FAF6E"
          trackColor="#DDF3DF"
          showValue={false}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-black tabular-nums"
            style={{ fontSize: 72, color: '#243024', letterSpacing: '-0.02em' }}
          >
            {formatTime(timeRemaining)}
          </span>
          <span className="text-sm font-medium mt-2" style={{ color: '#5F6E5F' }}>
            {status === 'idle' ? 'Sẵn sàng' : getPhaseLabel()}
          </span>
        </div>
      </div>

      {/* Session dots indicator */}
      <div className="flex items-center gap-2 mb-10">
        {Array.from({ length: SESSIONS_UNTIL_LONG_BREAK }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: 12,
              height: 12,
              background: i < (completedSessions % SESSIONS_UNTIL_LONG_BREAK) ? '#5FAF6E' : '#E8F5E8',
              border: i < (completedSessions % SESSIONS_UNTIL_LONG_BREAK) ? 'none' : '1px solid #5FAF6E',
            }}
          />
        ))}
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          disabled={status === 'idle'}
          className="flex items-center justify-center w-12 h-12 rounded-xl transition-all disabled:opacity-40"
          style={{ border: '2px solid #E8F5E8', color: '#5F6E5F' }}
        >
          <X size={22} />
        </button>

        <button
          onClick={handleStartPause}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all"
          style={{
            background: '#5FAF6E',
            color: '#FFFFFF',
            borderRadius: 14,
            boxShadow: '0 4px 16px rgba(95, 175, 110, 0.35)',
          }}
        >
          {status === 'running' ? (
            <><Pause size={22} /> Tạm dừng</>
          ) : (
            <><Play size={22} /> {status === 'paused' ? 'Tiếp tục' : 'Bắt đầu'}</>
          )}
        </button>

        <button
          onClick={handleReset}
          disabled={status === 'running'}
          className="flex items-center justify-center w-12 h-12 rounded-xl transition-all disabled:opacity-40"
          style={{ border: '2px solid #E8F5E8', color: '#5F6E5F' }}
        >
          <RotateCcw size={22} />
        </button>
      </div>

      <CancelModal open={showCancelModal} onSelect={handleCancelReasonSelect} />
      <SessionEndOverlay
        open={showSessionEnd}
        phase={phase}
        completedSessions={completedSessions}
        onStartBreak={handleSessionEnd}
      />
    </div>
  );
}
