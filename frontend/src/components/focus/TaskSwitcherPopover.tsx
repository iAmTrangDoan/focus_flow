/* ─── TaskSwitcherPopover ───
 * Popover for quickly switching between subtasks or tasks.
 * - Group 1: Other subtasks in the same task
 * - Group 2: Top 3 suggested tasks by priority score
 * Desktop: floating popover, Mobile (<1024px): bottom sheet
 */

import { useState, useEffect, useRef } from 'react';
import { X, Calendar } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ProgressRing } from '../ui/ProgressRing';
import type { FocusUnit, TaskSuggestion } from '../../services/focus.service';
import focusService from '../../services/focus.service';

interface TaskSwitcherPopoverProps {
  open: boolean;
  onClose: () => void;
  onSelectUnit: (unit: FocusUnit) => void;
  onSelectSuggestion: (taskId: string) => void;
  currentUnit: FocusUnit | null;
  units: FocusUnit[];
  isRunning: boolean;
}

export function TaskSwitcherPopover({
  open,
  onClose,
  onSelectUnit,
  onSelectSuggestion,
  currentUnit,
  units,
  isRunning,
}: TaskSwitcherPopoverProps) {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [confirmingTaskId, setConfirmingTaskId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load suggestions when opened
  useEffect(() => {
    if (!open) return;
    setLoadingSuggestions(true);
    focusService
      .getNextSuggestions(3)
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open || isMobile) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, isMobile]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  // Filter subtasks in same task
  const sameTaskUnits = currentUnit
    ? units.filter(
        (u) =>
          u.taskId === currentUnit.taskId &&
          (u.subtaskId !== currentUnit.subtaskId || u.taskId !== currentUnit.taskId),
      )
    : [];
  const hasSameTaskGroup = sameTaskUnits.length > 0;

  const handleSuggestionClick = (taskId: string) => {
    if (isRunning) {
      setConfirmingTaskId(taskId);
    } else {
      onSelectSuggestion(taskId);
      onClose();
    }
  };

  const confirmSwitch = () => {
    if (confirmingTaskId) {
      onSelectSuggestion(confirmingTaskId);
      setConfirmingTaskId(null);
      onClose();
    }
  };

  const content = (
    <div className="py-3">
      {/* Group 1: Same task subtasks */}
      {hasSameTaskGroup && (
        <div className="mb-3">
          <p
            className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: '#5F6E5F' }}
          >
            Subtask khác trong task này
          </p>
          {sameTaskUnits.map((unit) => {
            const isActive =
              unit.taskId === currentUnit?.taskId &&
              unit.subtaskId === currentUnit?.subtaskId;
            return (
              <button
                key={`${unit.taskId}:${unit.subtaskId ?? 'TASK'}`}
                onClick={() => {
                  if (!isActive) {
                    onSelectUnit(unit);
                    onClose();
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: isActive ? '#DDF3DF' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#F4FAF4';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span className="text-sm" style={{ color: isActive ? '#5FAF6E' : '#5F6E5F' }}>
                  {unit.type === 'SUBTASK' && (unit as any).isCompleted ? '✓' : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: '#243024' }}>
                    {unit.title}
                  </p>
                </div>
                <span className="text-xs shrink-0" style={{ color: '#5F6E5F' }}>
                  {unit.estimatedMinutes}p
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Divider */}
      {hasSameTaskGroup && (
        <div className="mx-4 mb-3" style={{ borderTop: '1px solid #D9E6D9' }} />
      )}

      {/* Group 2: Suggestions */}
      <div>
        <p
          className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: '#5F6E5F' }}
        >
          Gợi ý tiếp theo (theo lịch)
        </p>

        {loadingSuggestions ? (
          <p className="px-4 py-3 text-sm" style={{ color: '#5F6E5F' }}>
            Đang tải...
          </p>
        ) : suggestions.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-sm" style={{ color: '#5F6E5F' }}>
              Chưa có lịch hôm nay
            </p>
            <a
              href="/schedule"
              className="text-xs font-medium mt-1 inline-flex items-center gap-1"
              style={{ color: '#5FAF6E' }}
            >
              <Calendar size={12} />
              Thử Lên lịch tự động ở trang Schedule
            </a>
          </div>
        ) : (
          suggestions.map((task) => (
            <button
              key={task.taskId}
              onClick={() => handleSuggestionClick(task.taskId)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F4FAF4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Badge
                variant={
                  task.importance === 'CRITICAL' ? 'danger' :
                  task.importance === 'HIGH' ? 'peach' :
                  task.importance === 'MEDIUM' ? 'warning' : 'secondary'
                }
              >
                {
                  task.importance === 'CRITICAL' ? 'C' :
                  task.importance === 'HIGH' ? 'H' :
                  task.importance === 'MEDIUM' ? 'M' : 'L'
                }
              </Badge>
              <p className="flex-1 min-w-0 text-sm truncate" style={{ color: '#243024' }}>
                {task.title}
              </p>
              <ProgressRing
                value={task.priorityScore}
                size={28}
                strokeWidth={3}
                label={String(Math.round(task.priorityScore))}
              />
            </button>
          ))
        )}
      </div>

      {/* Confirm dialog when running */}
      {confirmingTaskId && (
        <div className="mx-4 mt-3 p-3 rounded-xl" style={{ background: '#FEF3C7', border: '1px solid #F7E7A8' }}>
          <p className="text-sm font-medium mb-2" style={{ color: '#243024' }}>
            Phiên đang chạy sẽ bị dừng. Tiếp tục?
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmSwitch}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: '#5FAF6E', color: '#FFFFFF' }}
            >
              Đổi việc
            </button>
            <button
              onClick={() => setConfirmingTaskId(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: '#E8F5E8', color: '#5FAF6E' }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(36, 48, 36, 0.4)' }}
          onClick={onClose}
        />
        <div
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[70vh] overflow-y-auto"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 -8px 32px rgba(36, 48, 36, 0.15)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#D9E6D9' }}>
            <p className="text-sm font-bold" style={{ color: '#243024' }}>Đổi công việc</p>
            <button onClick={onClose} className="p-1" style={{ color: '#5F6E5F' }}>
              <X size={18} />
            </button>
          </div>
          {content}
        </div>
      </>
    );
  }

  // Desktop: floating popover
  return (
    <div
      ref={popoverRef}
      className="absolute top-full right-0 mt-2 rounded-xl overflow-hidden z-30"
      style={{
        width: 340,
        background: '#FFFFFF',
        boxShadow: '0 8px 32px rgba(36, 48, 36, 0.12)',
        border: '1px solid #D9E6D9',
        maxHeight: 420,
        overflowY: 'auto',
      }}
    >
      {content}
    </div>
  );
}
