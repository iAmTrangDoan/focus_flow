/* ─── PerformanceBar ───
 * Displays daily session count and progress bars for subtask and task.
 * Minimalist layout using theme variables:
 * - Fill: --color-primary
 * - Track: --color-primary-light
 */

import { useMemo } from 'react';
import type { FocusUnit } from '../../services/focus.service';

interface PerformanceBarProps {
  completedSessionsToday: number;
  totalSessionsToday: number;
  selectedUnit: FocusUnit | null;
  units: FocusUnit[];
}

export function PerformanceBar({
  completedSessionsToday,
  totalSessionsToday,
  selectedUnit,
  units,
}: PerformanceBarProps) {
  // Find parent task progress if active unit is a subtask
  const parentTaskProgress = useMemo(() => {
    if (!selectedUnit) return 0;
    if (selectedUnit.type === 'TASK') {
      return selectedUnit.progressPercent;
    }
    // Try to find the TASK unit itself in the loaded units
    const parentUnit = units.find(
      (u) => u.type === 'TASK' && u.taskId === selectedUnit.taskId
    );
    if (parentUnit) {
      return parentUnit.progressPercent;
    }
    // Fallback: calculate based on all subtasks of this parent task in units list
    const siblingSubtasks = units.filter(
      (u) => u.type === 'SUBTASK' && u.taskId === selectedUnit.taskId
    );
    if (siblingSubtasks.length === 0) return 0;
    const totalEst = siblingSubtasks.reduce((sum, s) => sum + s.estimatedMinutes, 0);
    const totalComp = siblingSubtasks.reduce((sum, s) => sum + s.completedMinutes, 0);
    return totalEst > 0 ? Math.round((totalComp / totalEst) * 100) : 0;
  }, [selectedUnit, units]);

  const subtaskProgress = selectedUnit ? selectedUnit.progressPercent : 0;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: '#FFFFFF',
        border: '1px solid #D9E6D9',
      }}
    >
      {/* Session summary */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-semibold" style={{ color: '#243024' }}>
          Phiên hôm nay
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: '#5FAF6E' }}
        >
          {completedSessionsToday}/{totalSessionsToday} phiên
        </span>
      </div>

      {/* Progress Bars */}
      <div className="flex flex-col gap-3">
        {/* Subtask Progress (only if current unit is a subtask) */}
        {selectedUnit?.type === 'SUBTASK' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium" style={{ color: '#5F6E5F' }}>
                Subtask
              </span>
              <span className="text-xs font-semibold" style={{ color: '#243024' }}>
                {Math.round(subtaskProgress)}%
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full"
              style={{ background: 'var(--color-primary-light)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(subtaskProgress, 100)}%`,
                  background: 'var(--color-primary)',
                }}
              />
            </div>
          </div>
        )}

        {/* Task Progress */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium" style={{ color: '#5F6E5F' }}>
              Công việc chính
            </span>
            <span className="text-xs font-semibold" style={{ color: '#243024' }}>
              {Math.round(parentTaskProgress)}%
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full"
            style={{ background: 'var(--color-primary-light)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(parentTaskProgress, 100)}%`,
                background: 'var(--color-primary)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
