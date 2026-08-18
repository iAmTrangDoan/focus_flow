/* ─── TomatoProgress ───
 * Replaces dot indicators with tomato icons 🍅 for session progress.
 * - Completed: solid tomato
 * - Current (running): pulsing tomato
 * - Remaining: faded outline tomato
 * - Compact mode when totalSessions > 8
 */

interface TomatoProgressProps {
  completedSessions: number;
  totalSessions: number;
  isRunning: boolean;
}

export function TomatoProgress({
  completedSessions,
  totalSessions,
  isRunning,
}: TomatoProgressProps) {
  // Compact mode for > 8 sessions
  if (totalSessions > 8) {
    return (
      <div className="flex items-center justify-center gap-2">
        <span
          className="text-lg"
          style={{ filter: 'none' }}
        >
          🍅
        </span>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: '#243024' }}
        >
          ×{completedSessions}
        </span>
        <span
          className="text-xs"
          style={{ color: '#5F6E5F' }}
        >
          / {totalSessions}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-sm">
      {Array.from({ length: totalSessions }).map((_, index) => {
        const isCompleted = index < completedSessions;
        const isCurrent =
          index === completedSessions && isRunning;

        let style: React.CSSProperties = {};
        let className = 'text-lg transition-all';

        if (isCompleted) {
          // Full solid tomato
          style = { filter: 'none', opacity: 1 };
        } else if (isCurrent) {
          // Pulsing tomato (breathing effect)
          className += ' tomato-active';
          style = { filter: 'none', opacity: 1 };
        } else {
          // Faded outline
          style = {
            filter: 'grayscale(0.8)',
            opacity: 0.35,
          };
        }

        return (
          <span
            key={index}
            className={className}
            style={style}
            title={`Phiên ${index + 1}/${totalSessions}`}
          >
            🍅
          </span>
        );
      })}
    </div>
  );
}
