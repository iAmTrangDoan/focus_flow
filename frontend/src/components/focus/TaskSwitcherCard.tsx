/* ─── TaskSwitcherCard ───
 * Displays current task/subtask info with a switch button.
 * Uses peach badge variant for High priority (calming, not alerting).
 */

import { RefreshCw } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { FocusUnit } from '../../services/focus.service';

interface TaskSwitcherCardProps {
  selectedUnit: FocusUnit | null;
  onSwitchClick: () => void;
  disabled?: boolean;
}

export function TaskSwitcherCard({
  selectedUnit,
  onSwitchClick,
  disabled = false,
}: TaskSwitcherCardProps) {
  if (!selectedUnit) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: '#FFFFFF',
          border: '1px solid #D9E6D9',
        }}
      >
        <p className="text-sm" style={{ color: '#5F6E5F' }}>
          Chưa chọn công việc
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 relative"
      style={{
        background: '#FFFFFF',
        border: '1px solid #D9E6D9',
      }}
    >
      {/* Switch button */}
      <button
        onClick={onSwitchClick}
        disabled={disabled}
        className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-[#F4FAF4] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ color: '#5F6E5F' }}
        title="Đổi công việc"
      >
        <RefreshCw size={16} />
      </button>

      {/* Content */}
      <p className="text-xs font-medium mb-1" style={{ color: '#5FAF6E' }}>
        Đang thực hiện
      </p>

      <p
        className="text-base font-bold pr-10 leading-snug"
        style={{ color: '#243024' }}
      >
        {selectedUnit.type === 'SUBTASK'
          ? selectedUnit.title
          : selectedUnit.title}
      </p>

      {selectedUnit.type === 'SUBTASK' && (
        <p
          className="text-sm mt-1 truncate"
          style={{ color: '#5F6E5F' }}
        >
          ↳ {selectedUnit.taskTitle}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <Badge
          variant={
            selectedUnit.importance === 'CRITICAL' ? 'danger' :
            selectedUnit.importance === 'HIGH' ? 'peach' :
            selectedUnit.importance === 'MEDIUM' ? 'warning' : 'secondary'
          }
        >
          {
            selectedUnit.importance === 'CRITICAL' ? 'Critical' :
            selectedUnit.importance === 'HIGH' ? 'High' :
            selectedUnit.importance === 'MEDIUM' ? 'Medium' : 'Low'
          }
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
  );
}
