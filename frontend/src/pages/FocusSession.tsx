import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, X, RotateCcw } from 'lucide-react';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Modal } from '../components/ui/Modal';
import { createToast, type ToastMessage } from '../components/common/Toast';
import focusService, {
  type DropReason,
  type FocusUnit,
  type PomodoroSession,
  type Attachment,
} from '../services/focus.service';
import tasksService from '../services/tasks.service';
import schedulerService from '../services/scheduler.service';
import { usePomodoroSound } from '../hooks/usePomodoroSound';
import { usePomodoroStore } from '../store/pomodoroStore';

// Workspace Components
import { TomatoProgress } from '../components/focus/TomatoProgress';
import { TaskSwitcherCard } from '../components/focus/TaskSwitcherCard';
import { TaskSwitcherPopover } from '../components/focus/TaskSwitcherPopover';
import { PerformanceBar } from '../components/focus/PerformanceBar';
import { LiveNotes } from '../components/focus/LiveNotes';
import { AttachmentsBlock } from '../components/focus/AttachmentsBlock';

/* ─── Constants ─── */
const FOCUS_DURATION = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const SESSIONS_UNTIL_LONG_BREAK = 4;

/*
 * Lưu session chưa complete thành công do mất mạng.
 */
const PENDING_COMPLETE_KEY = 'focusflow.pendingPomodoroComplete';

type TimerPhase = 'focus' | 'short_break' | 'long_break';
type TimerStatus = 'idle' | 'running' | 'paused';

/* ─── Cancel Reason Modal ─── */
interface CancelModalProps {
  open: boolean;
  onSelect: (reason: DropReason) => void;
}

const CANCEL_REASONS: Array<{
  id: DropReason;
  icon: string;
  label: string;
}> = [
  {
    id: 'Mệt',
    icon: '😴',
    label: 'Mệt',
  },
  {
    id: 'Task quá khó',
    icon: '🧩',
    label: 'Task quá khó',
  },
  {
    id: 'Bị cắt ngang',
    icon: '⚡',
    label: 'Bị cắt ngang',
  },
  {
    id: 'Bị phân tâm',
    icon: '📱',
    label: 'Bị phân tâm',
  },
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

// ========================= HELPERS =========================
function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const message = (
    error as {
      response?: {
        data?: {
          message?: string | string[];
        };
      };
    }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message[0] ?? fallback;
  }

  return message || fallback;
}

/* ─── Main Focus Sessions Page ─── */
interface FocusSessionsPageProps {
  onToast: (toast: ToastMessage) => void;
}

export default function FocusSessionsPage({ onToast }: FocusSessionsPageProps) {
  const [units, setUnits] = useState<FocusUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<FocusUnit | null>(null);

  const [timeRemaining, setTimeRemaining] = useState(FOCUS_DURATION);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSessionEnd, setShowSessionEnd] = useState(false);

  // Workspace States
  const [notes, setNotes] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [completedSessionsToday, setCompletedSessionsToday] = useState(0);
  const [totalSessionsToday, setTotalSessionsToday] = useState(6);

  const totalTimeRef = useRef(FOCUS_DURATION);
  const endAtRef = useRef<number | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const completingRef = useRef(false);
  const { unlockAudio, playSessionEndSound } = usePomodoroSound();

  useEffect(() => {
    if (showSessionEnd) {
      if (phase === 'focus') {
        playSessionEndSound('WORK');
      } else {
        playSessionEndSound('BREAK');
      }
    }
  }, [showSessionEnd, phase, playSessionEndSound]);

  /* ─── Fetch notes & attachments when unit changes ─── */
  const loadWorkspaceData = useCallback(async (unit: FocusUnit | null) => {
    if (!unit) {
      setNotes('');
      setAttachments([]);
      return;
    }
    try {
      const task = await tasksService.getTask(unit.taskId);
      if (unit.type === 'SUBTASK' && unit.subtaskId) {
        const sub = task.subtasks.find((s) => s.id === unit.subtaskId);
        setNotes(sub?.notes || '');
        const files = await focusService.getSubtaskAttachments(unit.subtaskId);
        setAttachments(files);
      } else {
        setNotes(task.notes || '');
        const files = await focusService.getTaskAttachments(unit.taskId);
        setAttachments(files);
      }
    } catch (err) {
      console.error('Failed to load notes or attachments:', err);
    }
  }, []);

  /* ─── Fetch completed sessions count today ─── */
  const loadDailySessionsCount = useCallback(async () => {
    try {
      const sessions = await focusService.getSessions('COMPLETED');
      const todayStr = new Date().toDateString();
      const count = sessions.filter((s) => {
        const d = new Date(s.endedAt || s.startedAt);
        return d.toDateString() === todayStr;
      }).length;
      setCompletedSessionsToday(count);
    } catch (err) {
      console.error('Failed to load completed sessions:', err);
    }
  }, []);

  /* ─── Fetch total sessions today (from schedule slots) ─── */
  const loadTotalSessionsToday = useCallback(async () => {
    try {
      const slots = await schedulerService.getWeeklySchedule();
      const todayStr = new Date().toDateString();
      const todaySlots = slots.filter((s) => {
        const d = new Date(s.startAt);
        return d.toDateString() === todayStr;
      });
      setTotalSessionsToday(todaySlots.length || 6);
    } catch (err) {
      console.error('Failed to load scheduled slots:', err);
      setTotalSessionsToday(6);
    }
  }, []);

  // Initialize workspace data and daily stats
  useEffect(() => {
    void loadDailySessionsCount();
    void loadTotalSessionsToday();
  }, [loadDailySessionsCount, loadTotalSessionsToday]);

  useEffect(() => {
    void loadWorkspaceData(selectedUnit);
  }, [selectedUnit, loadWorkspaceData]);

  /* ─── Notes autosave handler ─── */
  const handleSaveNotes = async (newNotes: string) => {
    if (!selectedUnit) return;
    try {
      if (selectedUnit.type === 'SUBTASK' && selectedUnit.subtaskId) {
        await focusService.updateSubtaskNotes(selectedUnit.subtaskId, newNotes);
      } else {
        await focusService.updateTaskNotes(selectedUnit.taskId, newNotes);
      }
    } catch (err) {
      onToast(createToast('error', 'Không thể tự động lưu ghi chú.'));
      throw err;
    }
  };

  /* ─── Attachment upload handler ─── */
  const handleUploadAttachment = async (file: File) => {
    if (!selectedUnit) throw new Error('No task selected');
    const sessionId = currentSessionIdRef.current || undefined;
    if (selectedUnit.type === 'SUBTASK' && selectedUnit.subtaskId) {
      const fileData = await focusService.uploadSubtaskAttachment(
        selectedUnit.subtaskId,
        file,
        sessionId,
      );
      setAttachments((prev) => [fileData, ...prev]);
      return fileData;
    } else {
      const fileData = await focusService.uploadTaskAttachment(
        selectedUnit.taskId,
        file,
        sessionId,
      );
      setAttachments((prev) => [fileData, ...prev]);
      return fileData;
    }
  };

  /* ─── Attachment delete handler ─── */
  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await focusService.deleteAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      onToast(createToast('success', 'Đã xóa file đính kèm.'));
    } catch (err) {
      onToast(createToast('error', 'Không thể xóa file.'));
    }
  };

  /* ─── Task Selector switcher selection handlers ─── */
  const handleSelectUnit = (unit: FocusUnit) => {
    setSelectedUnit(unit);
    // If timer is running or paused, reset it to idle state
    if (status !== 'idle') {
      const sessionId = currentSessionIdRef.current;
      if (sessionId) {
        focusService.cancelSession(sessionId, 'Không còn phù hợp').catch(() => {});
      }
      currentSessionIdRef.current = null;
      endAtRef.current = null;
      setStatus('idle');
      setTimeRemaining(FOCUS_DURATION);
    }
  };

  const handleSelectSuggestion = async (taskId: string) => {
    const matched = units.find((u) => u.taskId === taskId && u.type === 'TASK');
    if (matched) {
      handleSelectUnit(matched);
    } else {
      const refreshed = await loadUnits();
      const matchAfterRefresh = refreshed.find((u) => u.taskId === taskId);
      if (matchAfterRefresh) {
        handleSelectUnit(matchAfterRefresh);
      }
    }
  };

   /* ─── Áp dụng trạng thái session backend vào UI ─── */
  const applySession = useCallback(
    (session: PomodoroSession) => {
      currentSessionIdRef.current = session.id;

      const totalSeconds =
        session.plannedDuration * 60;

      totalTimeRef.current = totalSeconds;

      setTimeRemaining(
        Math.max(session.remainingSeconds, 0),
      );

      setPhase('focus');

      if (session.status === 'PAUSED') {
        endAtRef.current = null;
        setStatus('paused');
        return;
      }

      if (session.status === 'IN_PROGRESS') {
        endAtRef.current =
          Date.now() +
          Math.max(session.remainingSeconds, 0) *
            1000;

        setStatus(
          session.remainingSeconds > 0
            ? 'running'
            : 'idle',
        );

        return;
      }

      endAtRef.current = null;
      currentSessionIdRef.current = null;
      setStatus('idle');
    },
    [],
  );

  /* ── Load units ── */
  const loadUnits = useCallback(async () => {
    const data = await focusService.getUnits();

    setUnits(data);

    setSelectedUnit((currentUnit) => {
      if (!currentUnit) {
        return data[0] ?? null;
      }

      return (
        data.find(
          (unit) =>
            unit.taskId === currentUnit.taskId &&
            unit.subtaskId === currentUnit.subtaskId,
        ) ??
        data[0] ??
        null
      );
    });

    return data;
  }, []);

  const finishCurrentTimer =
  useCallback(async () => {
    if (completingRef.current) {
      return;
    }

    completingRef.current = true;
    endAtRef.current = null;

    setTimeRemaining(0);
    setStatus('idle');

    const sessionId =
      currentSessionIdRef.current;

    if (phase !== 'focus' || !sessionId) {
      setShowSessionEnd(true);
      completingRef.current = false;
      return;
    }

    localStorage.setItem(
      PENDING_COMPLETE_KEY,
      sessionId,
    );

    try {
      await focusService.completeSession(
        sessionId,
      );

      localStorage.removeItem(
        PENDING_COMPLETE_KEY,
      );

      currentSessionIdRef.current = null;

      await loadUnits();
      await loadDailySessionsCount();

      setShowSessionEnd(true);
    } catch {
      onToast(createToast('warning', 'Phiên đã hết giờ. Kết quả sẽ được đồng bộ lại khi có mạng.' ));
      setShowSessionEnd(true);
    } finally {
      completingRef.current = false;
    }
  }, [loadUnits, loadDailySessionsCount, onToast, phase]);

  //Effect timer tuyệt đối
  useEffect(() => {
    let mounted = true;

    const initializePomodoro = async () => {
      try {
        const [loadedUnits, currentResponse] =
          await Promise.all([
            focusService.getUnits(),
            focusService.getCurrentSession(),
          ]);

        if (!mounted) {
          return;
        }

        setUnits(loadedUnits);

        // -- ZUSTAND BREAK RESTORE LOGIC --
        const { breakEndTime, breakPhase, clearBreak } = usePomodoroStore.getState();
        if (breakEndTime && breakPhase && breakPhase !== 'focus') {
          const now = Date.now();
          if (now < breakEndTime) {
            setPhase(breakPhase);
            endAtRef.current = breakEndTime;
            const remaining = Math.max(0, Math.ceil((breakEndTime - now) / 1000));
            setTimeRemaining(remaining);
            totalTimeRef.current = breakPhase === 'short_break' ? SHORT_BREAK : LONG_BREAK;
            setStatus('running');
          } else {
            setPhase(breakPhase);
            setTimeRemaining(0);
            totalTimeRef.current = breakPhase === 'short_break' ? SHORT_BREAK : LONG_BREAK;
            setStatus('idle');
            setShowSessionEnd(true);
            clearBreak();
          }

          // Restore selected unit based on url or first unit
          const params = new URLSearchParams(window.location.search);
          const taskId = params.get('taskId');
          const subtaskId = params.get('subtaskId');
          const matchedFromUrl =
            loadedUnits.find(
              (unit) =>
                unit.taskId === taskId &&
                unit.subtaskId === subtaskId,
            ) ??
            loadedUnits.find((unit) => unit.taskId === taskId);

          setSelectedUnit(matchedFromUrl ?? loadedUnits[0] ?? null);
          return;
        }
        // ---------------------------------

        if (currentResponse) {
          const currentSession =
            currentResponse.session;
          
            if (
              currentSession.status === 'IN_PROGRESS' &&
              currentSession.remainingSeconds <= 0
            ) {
              currentSessionIdRef.current =
                currentSession.id;

              localStorage.setItem(
                PENDING_COMPLETE_KEY,
                currentSession.id,
              );

              try {
                await focusService.completeSession(
                  currentSession.id,
                );

                localStorage.removeItem(
                  PENDING_COMPLETE_KEY,
                );

                currentSessionIdRef.current = null;

                const refreshedUnits =
                  await focusService.getUnits();

                if (!mounted) {
                  return;
                }

                setUnits(refreshedUnits);
                setSelectedUnit(
                  refreshedUnits[0] ?? null,
                );

                setShowSessionEnd(true);
              } catch {
                /*
                * Giữ ID trong localStorage để effect
                * online retry lại sau.
                */
              }

              return;
            }

          const matchedUnit = loadedUnits.find(
            (unit) =>
              unit.taskId ===
                currentSession.taskId &&
              unit.subtaskId ===
                currentSession.subtaskId,
          );

          if (matchedUnit) {
            setSelectedUnit(matchedUnit);
            }

            applySession(currentSession);
            return;
          }

          const params =
            new URLSearchParams(
              window.location.search,
            );

          const taskId = params.get('taskId');
          const subtaskId =
            params.get('subtaskId');

          const matchedFromUrl =
            loadedUnits.find(
              (unit) =>
                unit.taskId === taskId &&
                unit.subtaskId === subtaskId,
            ) ??
            loadedUnits.find(
              (unit) => unit.taskId === taskId,
            );

          setSelectedUnit(
            matchedFromUrl ??
              loadedUnits[0] ??
              null,
          );
        } catch (error) {
          if (!mounted) {
            return;
          }

          onToast(
            createToast(
              'error',
              getApiErrorMessage(
                error,
                'Không thể tải dữ liệu Pomodoro.',
              ),
            ),
          );
        }
      };

      void initializePomodoro();

      return () => {
        mounted = false;
      };
    }, [applySession, onToast]);

  //Efect Timer retry
  useEffect(() => {
    const retryPendingCompletion =
      async () => {
        const pendingSessionId =
          localStorage.getItem(
            PENDING_COMPLETE_KEY,
          );

        if (!pendingSessionId) {
          return;
        }

        try {
          await focusService.completeSession(
            pendingSessionId,
          );

          localStorage.removeItem(
            PENDING_COMPLETE_KEY,
          );

          if (
            currentSessionIdRef.current ===
            pendingSessionId
          ) {
            currentSessionIdRef.current = null;
          }

          await loadUnits();
          await loadDailySessionsCount();
        } catch {
          /*
           * Không xóa localStorage.
           * Sẽ thử lại khi online lần tiếp theo
           * hoặc khi trang được mở lại.
           */
        }
      };

    /*
     * Thử ngay khi component được mount.
     */
    void retryPendingCompletion();

    /*
     * Thử lại khi trình duyệt báo có mạng.
     */
    window.addEventListener(
      'online',
      retryPendingCompletion,
    );

    return () => {
      window.removeEventListener(
        'online',
        retryPendingCompletion,
      );
    };
  }, [loadUnits, loadDailySessionsCount]);

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
    if (status !== 'running') {
      return;
    }

    const tick = () => {
      const endAt = endAtRef.current;

      if (!endAt) {
        return;
      }

      const remaining = Math.max(
        0,
        Math.ceil(
          (endAt - Date.now()) / 1000,
        ),
      );

      setTimeRemaining(remaining);

      if (remaining === 0) {
        if (phase !== 'focus') {
          usePomodoroStore.getState().clearBreak();
        }
        void finishCurrentTimer();
      }
    };

    tick();

    const intervalId =
      window.setInterval(tick, 500);

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible'
      ) {
        tick();
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(intervalId);

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
    };
  }, [status, finishCurrentTimer]);

  const handleStartPause = async () => {
      void unlockAudio();

      if (status === 'idle') {
        // Phiên nghỉ chạy local, không tạo PomodoroSession trong backend.
        if (phase !== 'focus') {
          const totalSeconds =
            getTotalTime(phase);

          totalTimeRef.current =
            totalSeconds;

          setTimeRemaining(totalSeconds);

          endAtRef.current =
            Date.now() +
            totalSeconds * 1000;

          setStatus('running');
          usePomodoroStore.getState().setBreak(phase, totalSeconds);
          return;
        }

        if (!selectedUnit) {
          onToast(
            createToast(
              'error',
              'Vui lòng chọn một công việc trước khi bắt đầu.',
            ),
          );
          return;
        }

        try {
          const response =
            await focusService.startSession(
              selectedUnit.taskId,
              selectedUnit.subtaskId,
              selectedUnit.scheduleSlotId,
            );

          applySession(response.session);
        } catch (error) {
          onToast(
            createToast(
              'error',
              getApiErrorMessage(
                error,
                'Không thể bắt đầu phiên Pomodoro.',
              ),
            ),
          );
        }

        return;
      }

      if (status === 'running') {
        const sessionId =
          currentSessionIdRef.current;

        // Pause phiên nghỉ local.
        if (!sessionId || phase !== 'focus') {
          endAtRef.current = null;
          setStatus('paused');
          return;
        }

        try {
          const response =
            await focusService.pauseSession(
              sessionId,
            );

          applySession(response.session);
        } catch (error) {
          onToast(
            createToast(
              'error',
              getApiErrorMessage(
                error,
                'Không thể tạm dừng phiên.',
              ),
            ),
          );
        }

        return;
      }

      if (status === 'paused') {
        const sessionId =
          currentSessionIdRef.current;

        // Resume phiên nghỉ local.
        if (!sessionId || phase !== 'focus') {
          endAtRef.current =
            Date.now() +
            timeRemaining * 1000;

          setStatus('running');
          return;
        }

        try {
          const response =
            await focusService.resumeSession(
              sessionId,
            );

          applySession(response.session);
        } catch (error) {
          onToast(
            createToast(
              'error',
              getApiErrorMessage(
                error,
                'Không thể tiếp tục phiên.',
              ),
            ),
          );
        }
      }
    };
  const handleCancel = () => {
    if (status === 'idle') {
      return;
    }

    /*
     * Break chỉ chạy local, không cần khảo sát drop.
     */
    if (
      phase !== 'focus' ||
      !currentSessionIdRef.current
    ) {
      const resetSeconds =
        getTotalTime(phase);

      endAtRef.current = null;
      totalTimeRef.current = resetSeconds;

      setStatus('idle');
      setTimeRemaining(resetSeconds);
      usePomodoroStore.getState().clearBreak();

      return;
    }

    /*
     * WORK session mới cần lý do drop.
     */
    setShowCancelModal(true);
  };
   
  const handleCancelReasonSelect =
    async (reason: DropReason) => {
      const sessionId =
        currentSessionIdRef.current;

      if (!sessionId) {
        setShowCancelModal(false);
        return;
      }

      try {
        await focusService.cancelSession(
          sessionId,
          reason,
        );

        currentSessionIdRef.current = null;

        endAtRef.current = null;
        setStatus('idle');
        setShowCancelModal(false);

        const resetSeconds =
          getTotalTime(phase);

        totalTimeRef.current =
          resetSeconds;

        setTimeRemaining(resetSeconds);

        await loadUnits();
        await loadDailySessionsCount();

        onToast(
          createToast(
            'success',
            'Đã ghi nhận phiên bỏ ngang.',
          ),
        );
      } catch (error) {
        onToast(
          createToast(
            'error',
            getApiErrorMessage(
              error,
              'Không thể dừng phiên Pomodoro.',
            ),
          ),
        );
      }
    };

  const handleReset = () => {
    if (
      status !== 'idle' ||
      currentSessionIdRef.current
    ) {
      onToast(
        createToast(
          'warning',
          'Hãy dừng phiên hiện tại trước khi đặt lại đồng hồ.',
        ),
      );

      return;
    }

    const resetSeconds =
      getTotalTime(phase);

    endAtRef.current = null;
    totalTimeRef.current = resetSeconds;

    setTimeRemaining(resetSeconds);
    if (phase !== 'focus') {
      usePomodoroStore.getState().clearBreak();
    }
  };

  const handleSessionEnd = () => {
    setShowSessionEnd(false);

    if (phase === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      onToast(createToast('success', 'Hoàn thành phiên tập trung!'));
      void loadDailySessionsCount();

      const isLongBreak = newCompletedSessions % SESSIONS_UNTIL_LONG_BREAK === 0;
      const nextPhase: TimerPhase = isLongBreak ? 'long_break' : 'short_break';
      setPhase(nextPhase);
      setTimeRemaining(getTotalTime(nextPhase));
      totalTimeRef.current = getTotalTime(nextPhase);
    } else {
      setPhase('focus');

      const nextFocusSeconds =
        selectedUnit
          ? Math.min(
              selectedUnit.workDurationMinutes,
              selectedUnit.remainingMinutes,
            ) * 60
          : FOCUS_DURATION;

      setTimeRemaining(nextFocusSeconds);
      totalTimeRef.current =
        nextFocusSeconds;
    }
  };

  const handleDemoEndSession = () => {
    void unlockAudio();
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

  const activeWorkspaceKey = selectedUnit
    ? `${selectedUnit.taskId}:${selectedUnit.subtaskId || 'main'}`
    : 'empty';

  return (
    <div
      className="focus-grid min-h-[calc(100vh-80px)]"
      style={{ background: '#F4FAF4' }}
    >
      {/* CỘT TRÁI (60%) - TRỰC QUAN HÓA ĐỒNG HỒ */}
      <div className="flex flex-col items-center justify-center p-6 relative lg:border-r border-[#D9E6D9]">
        {/* Demo button */}
        <button
          onClick={handleDemoEndSession}
          className="absolute bottom-6 left-6 px-3 py-2 rounded-lg text-xs font-medium z-30 transition-all"
          style={{ background: 'rgba(95, 175, 110, 0.15)', color: '#5FAF6E' }}
        >
          ⏩ Kết thúc phiên (demo)
        </button>

        {/* Progress labels & indicators */}
        {selectedUnit && (
          <div className="text-center mb-6">
            <p className="text-xs font-medium mb-2" style={{ color: '#5F6E5F' }}>
              Còn {selectedUnit.remainingMinutes} phút · {selectedUnit.remainingSessions} phiên
            </p>
            <TomatoProgress
              completedSessions={selectedUnit.completedSessions}
              totalSessions={selectedUnit.totalSessions}
              isRunning={status === 'running' && phase === 'focus'}
            />
          </div>
        )}

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
            disabled={status === 'idle'}
            className="flex items-center justify-center w-12 h-12 rounded-xl transition-all disabled:opacity-40"
            style={{ border: '2px solid #E8F5E8', color: '#5F6E5F' }}
          >
            <RotateCcw size={22} />
          </button>
        </div>
      </div>

      {/* CỘT PHẢI (40%) - SESSION WORKSPACE */}
      <div className="flex flex-col p-6 gap-6 max-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
        {/* 3.A Task Switcher Card */}
        <div className="relative">
          <TaskSwitcherCard
            selectedUnit={selectedUnit}
            onSwitchClick={() => setShowSwitcher(!showSwitcher)}
          />
          <TaskSwitcherPopover
            open={showSwitcher}
            onClose={() => setShowSwitcher(false)}
            onSelectUnit={handleSelectUnit}
            onSelectSuggestion={handleSelectSuggestion}
            currentUnit={selectedUnit}
            units={units}
            isRunning={status === 'running'}
          />
        </div>

        {/* 3.B Performance Bar */}
        <PerformanceBar
          completedSessionsToday={completedSessionsToday}
          totalSessionsToday={totalSessionsToday}
          selectedUnit={selectedUnit}
          units={units}
        />

        {/* 3.C Live Notes */}
        <LiveNotes
          notes={notes}
          onSave={handleSaveNotes}
          entityKey={activeWorkspaceKey}
        />

        {/* 3.D Attachments Block */}
        <AttachmentsBlock
          attachments={attachments}
          onUpload={handleUploadAttachment}
          onDelete={handleDeleteAttachment}
        />
      </div>

      {/* Cancel survey modal */}
      <CancelModal open={showCancelModal} onSelect={handleCancelReasonSelect} />

      {/* Break / End session overlay */}
      <SessionEndOverlay
        open={showSessionEnd}
        phase={phase}
        completedSessions={completedSessions}
        onStartBreak={handleSessionEnd}
      />
    </div>
  );
}

