import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, X, RotateCcw, ChevronDown } from 'lucide-react';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { createToast, type ToastMessage } from '../components/common/Toast';
import focusService, {
  type DropReason,
  type FocusUnit,
  type PomodoroSession,
} from '../services/focus.service';


/* ─── Constants ─── */
const FOCUS_DURATION = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const SESSIONS_UNTIL_LONG_BREAK = 4;

/*
 * Lưu session chưa complete thành công do mất mạng.
 */
const PENDING_COMPLETE_KEY ='focusflow.pendingPomodoroComplete';


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

/* ─── Unit Selector ─── */
interface UnitSelectorProps {
  selectedUnit: FocusUnit | null;
  onSelect: (unit: FocusUnit) => void;
  units: FocusUnit[];
  disabled?: boolean;
}

function UnitSelector({
  selectedUnit,
  onSelect,
  units,
  disabled = false,
}: UnitSelectorProps) {
  const [open, setOpen] = useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  /*
   * GET /pomodoro/units đã chỉ trả về
   * các unit chưa hoàn thành.
   */
  const availableUnits = units;

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside,
      );
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className="relative inline-block"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8F5E8',
          boxShadow:
            '0 2px 8px rgba(36, 48, 36, 0.06)',
          minWidth: 320,
        }}
      >
        {selectedUnit ? (
          <>
            <div className="flex-1 min-w-0 text-left">
              {/* Tên task cha hoặc tên task */}
              <p
                className="text-sm font-semibold truncate"
                style={{ color: '#243024' }}
              >
                {selectedUnit.type === 'SUBTASK'
                  ? selectedUnit.taskTitle
                  : selectedUnit.title}
              </p>

              {/* Nếu là subtask thì hiển thị bên dưới */}
              {selectedUnit.type === 'SUBTASK' && (
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: '#5F6E5F' }}
                >
                  ↳ {selectedUnit.title}
                </p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    selectedUnit.importance === 'HIGH'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {selectedUnit.importance === 'HIGH'
                    ? 'High'
                    : 'Low'}
                </Badge>

                <span
                  className="text-xs font-medium"
                  style={{ color: '#5FAF6E' }}
                >
                  {selectedUnit.completedMinutes}/
                  {selectedUnit.estimatedMinutes} phút
                </span>
              </div>
            </div>

            <ChevronDown
              size={18}
              style={{ color: '#9CA3AF' }}
              className={`transition-transform ${
                open ? 'rotate-180' : ''
              }`}
            />
          </>
        ) : (
          <>
            <p
              className="flex-1 text-left text-sm"
              style={{ color: '#9CA3AF' }}
            >
              Chọn công việc để tập trung
            </p>

            <ChevronDown
              size={18}
              style={{ color: '#9CA3AF' }}
              className={`transition-transform ${
                open ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {open && !disabled && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-20"
          style={{
            background: '#FFFFFF',
            boxShadow:
              '0 8px 24px rgba(36, 48, 36, 0.12)',
            border: '1px solid #E8F5E8',
          }}
        >
          <div className="max-h-72 overflow-y-auto">
            {availableUnits.length === 0 ? (
              <p
                className="px-4 py-4 text-sm text-center"
                style={{ color: '#9CA3AF' }}
              >
                Không có công việc chưa hoàn thành
              </p>
            ) : (
              availableUnits.map((unit) => {
                const isSelected =
                  selectedUnit?.taskId === unit.taskId &&
                  selectedUnit?.subtaskId ===
                    unit.subtaskId;

                return (
                  <button
                    type="button"
                    key={`${unit.taskId}:${
                      unit.subtaskId ?? 'TASK'
                    }`}
                    onClick={() => {
                      onSelect(unit);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      background: isSelected
                        ? '#DDF3DF'
                        : 'transparent',
                    }}
                    onMouseEnter={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.background =
                          '#F4FAF4';
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.background =
                          'transparent';
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      {/* Hiển thị tiêu đề task cha  */}
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: '#243024' }}
                      >
                        {unit.type === 'SUBTASK'
                          ? unit.taskTitle
                          : unit.title}
                      </p>

                      {unit.type === 'SUBTASK' && (
                        <p
                          className="text-xs truncate mt-0.5"
                          style={{ color: '#5F6E5F' }}
                        >
                          ↳ {unit.title}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            unit.importance === 'HIGH'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {unit.importance === 'HIGH'
                            ? 'High'
                            : 'Low'}
                        </Badge>

                        <span
                          className="text-xs"
                          style={{ color: '#5FAF6E' }}
                        >
                          Còn {unit.remainingMinutes} phút
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
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
  const [selectedUnit, setSelectedUnit] =useState<FocusUnit | null>(null);

  const [timeRemaining, setTimeRemaining] = useState(FOCUS_DURATION);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSessionEnd, setShowSessionEnd] = useState(false);


  const totalTimeRef = useRef(FOCUS_DURATION);
  const endAtRef = useRef<number | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const completingRef = useRef(false);

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

    /*
     * Break chạy local, không có session backend
     * nên chỉ mở modal kết thúc.
     */
    if (phase !== 'focus' || !sessionId) {
      setShowSessionEnd(true);
      completingRef.current = false;
      return;
    }

    /*
     * Lưu trước khi gọi API.
     * Nếu request lỗi do mất mạng thì session ID vẫn còn.
     */
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

      setShowSessionEnd(true);
    } catch {
      onToast(createToast('warning', 'Phiên đã hết giờ. Kết quả sẽ được đồng bộ lại khi có mạng.' ));
      setShowSessionEnd(true);
    } finally {
      completingRef.current = false;
    }
  }, [loadUnits, onToast, phase]);

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
}, [loadUnits]);

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

  // useEffect(() => {
  //   if (status === 'running' && timeRemaining > 0) {
  //     intervalRef.current = setInterval(() => {
  //       setTimeRemaining((prev) => Math.max(0, prev - 1));
  //     }, 1000);
  //   }

  //   if (timeRemaining === 0 && status === 'running') {
  //     setStatus('idle');
  //     setShowSessionEnd(true);
  //     // Gọi API complete khi bộ đếm về 0
  //     if (currentSessionId) {
  //       focusService.completeSession(currentSessionId)
  //         .catch(() => {})
  //         .finally(() => setCurrentSessionId(null));
  //     }
  //   }

  //   return () => {
  //     if (intervalRef.current) clearInterval(intervalRef.current);
  //   };
  // }, [status, timeRemaining]);

  // const handleStartPause = async () => {
  //   if (status === 'idle') {
  //     if (!selectedTask) {
  //       onToast(createToast('error', 'Vui lòng chọn một task trước khi bắt đầu.'));
  //       return;
  //     }
  //     // Gọi API start session
  //     try {
  //       const params = new URLSearchParams(window.location.search);
  //       const subtaskId = params.get('subtaskId');
  //       const scheduleSlotId = params.get('scheduleSlotId');
  //       const response = await focusService.startSession(
  //         selectedTask.id,
  //         subtaskId,
  //         scheduleSlotId,
  //       );

  //         setCurrentSessionId(response.session.id);

  //         const totalSeconds = response.session.plannedDuration * 60;
  //         totalTimeRef.current = totalSeconds;

  //         setTimeRemaining(
  //           response.session.remainingSeconds ?? totalSeconds,
  //         );

  //         // Chỉ chuyển sang running khi backend đã tạo phiên thành công
  //         setStatus('running');
  //     } catch {
  //       onToast(
  //         createToast(
  //           'error',
  //           'Không thể bắt đầu phiên Pomodoro. Vui lòng kiểm tra lại công việc hoặc kết nối mạng.',
  //         ),
  //       );  
  //       return;
  //     }
  //   } else if (status === 'running') {
  //       setStatus('paused');
  //       if (currentSessionId) {
  //         focusService.pauseSession(currentSessionId).catch(() => {});
  //       }
  //   } else if (status === 'paused') {
  //       setStatus('running');
  //       if (currentSessionId) {
  //         focusService.resumeSession(currentSessionId).catch(() => {});
  //       }
  //   }
  // };

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

    return;
  }

  /*
   * WORK session mới cần lý do drop.
   */
  setShowCancelModal(true);
};

  // const handleCancelReasonSelect = async (reason: string) => {
  //   setShowCancelModal(false);
  //   setStatus('idle');
  //   setTimeRemaining(getTotalTime(phase));

  //   if (currentSessionId) {
  //     try {
  //       await focusService.cancelSession(currentSessionId, reason as DropReason);
  //       await focusService.sendQuickFeedback(currentSessionId, reason as DropReason);
  //     } catch {
  //       // Ghi nhận thất bại nhưng vẫn reset UI
  //     }
  //     setCurrentSessionId(null);
  //   }
  //   onToast(createToast('error', 'Đã ghi nhận. Phiên này được tính là 1 lần Bỏ ngang'));
  // };
   
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
};

  const handleSessionEnd = () => {
    setShowSessionEnd(false);

    if (phase === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      onToast(createToast('success', 'Hoàn thành phiên tập trung!'));

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

      {/* Unit selector */}
<div className="mb-4">
  <UnitSelector
    selectedUnit={selectedUnit}
    onSelect={setSelectedUnit}
    units={units}
    disabled={status !== 'idle'}
  />
</div>

      {/* Tiến độ của task/subtask đang chọn */}
      {selectedUnit && (
        <div className="text-center mb-6">
          <p
            className="text-sm font-semibold"
            style={{ color: '#243024' }}
          >
            {selectedUnit.completedMinutes}/
            {selectedUnit.estimatedMinutes} phút
          </p>

          <p
            className="text-xs mt-1"
            style={{ color: '#5F6E5F' }}
          >
            Còn {selectedUnit.remainingMinutes} phút ·{' '}
            {selectedUnit.remainingSessions} phiên
          </p>
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

      {/* Tiến độ số phiên thực tế của unit */}
    {selectedUnit &&
      selectedUnit.totalSessions <= 12 && (
        <div className="mb-10">
          <p
            className="text-xs text-center mb-2"
            style={{ color: '#5F6E5F' }}
          >
            Tiến độ phiên của công việc
          </p>

          <div className="flex items-center justify-center gap-2 flex-wrap max-w-sm">
            {Array.from({
              length: selectedUnit.totalSessions,
            }).map((_, index) => {
              const isCompleted =
                index <
                selectedUnit.completedSessions;

              return (
                <div
                  key={index}
                  className="rounded-full transition-all"
                  title={`Phiên ${index + 1}/${
                    selectedUnit.totalSessions
                  }`}
                  style={{
                    width: 12,
                    height: 12,
                    background: isCompleted
                      ? '#5FAF6E'
                      : '#E8F5E8',
                    border: isCompleted
                      ? 'none'
                      : '1px solid #5FAF6E',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

    {/* Unit có quá nhiều phiên thì dùng progress bar */}
    {selectedUnit &&
      selectedUnit.totalSessions > 12 && (
        <div className="w-64 mb-10">
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: '#E8F5E8' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: '#5FAF6E',
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    selectedUnit.progressPercent,
                  ),
                )}%`,
              }}
            />
          </div>

          <p
            className="text-xs text-center mt-2"
            style={{ color: '#5F6E5F' }}
          >
            {selectedUnit.completedSessions}/
            {selectedUnit.totalSessions} phiên
          </p>
        </div>
      )}

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

