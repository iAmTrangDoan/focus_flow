/* ─── ProgressRing Component ───
 * SVG circular progress for Priority Score and Pomodoro Timer
 */

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showValue?: boolean;
  label?: string;
}

export function ProgressRing({
  value,
  size = 44,
  strokeWidth = 4,
  color = '#5FAF6E',
  trackColor = '#E8F5E8',
  showValue = true,
  label,
}: ProgressRingProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - normalizedValue / 100);

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {showValue && (
        <span
          className="absolute text-xs font-bold"
          style={{ color: '#243024' }}
        >
          {label ?? Math.round(normalizedValue)}
        </span>
      )}
    </div>
  );
}
