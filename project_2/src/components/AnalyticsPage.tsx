import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { ChevronDown, TrendingDown, TrendingUp, BarChart3, Clock } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

/* ─── Types ─── */
type TimeRange = 'this_week' | 'last_week' | 'this_month';
type ScoreLevel = 'good' | 'average' | 'needs_attention';

/* ─── Mock Data ─── */
const procrastinationData = {
  this_week: {
    score: 28,
    level: 'good' as ScoreLevel,
    change: -12,
    breakdown: [
      { label: 'Delay Rate', value: 18, description: 'Tỷ lệ trì hoãn bắt đầu task' },
      { label: 'Deadline Miss Rate', value: 12, description: 'Tỷ lệ trễ deadline' },
      { label: 'Task Idle Days', value: 25, description: 'Số ngày task nằm im' },
      { label: 'Reschedule Frequency', value: 8, description: 'Tần suất đổi lịch' },
      { label: 'Time Duration Accuracy', value: 85, description: 'Độ chính xác ước lượng thời gian' },
    ],
  },
  last_week: {
    score: 40,
    level: 'average' as ScoreLevel,
    change: 5,
    breakdown: [
      { label: 'Delay Rate', value: 28, description: 'Tỷ lệ trì hoãn bắt đầu task' },
      { label: 'Deadline Miss Rate', value: 22, description: 'Tỷ lệ trễ deadline' },
      { label: 'Task Idle Days', value: 35, description: 'Số ngày task nằm im' },
      { label: 'Reschedule Frequency', value: 15, description: 'Tần suất đổi lịch' },
      { label: 'Time Duration Accuracy', value: 72, description: 'Độ chính xác ước lượng thời gian' },
    ],
  },
  this_month: {
    score: 35,
    level: 'average' as ScoreLevel,
    change: -8,
    breakdown: [
      { label: 'Delay Rate', value: 22, description: 'Tỷ lệ trì hoãn bắt đầu task' },
      { label: 'Deadline Miss Rate', value: 18, description: 'Tỷ lệ trễ deadline' },
      { label: 'Task Idle Days', value: 30, description: 'Số ngày task nằm im' },
      { label: 'Reschedule Frequency', value: 12, description: 'Tần suất đổi lịch' },
      { label: 'Time Duration Accuracy', value: 78, description: 'Độ chính xác ước lượng thời gian' },
    ],
  },
};

const completionRateData = [
  { day: 'T2', rate: 75, date: '27/06' },
  { day: 'T3', rate: 82, date: '28/06' },
  { day: 'T4', rate: 68, date: '29/06' },
  { day: 'T5', rate: 90, date: '30/06' },
  { day: 'T6', rate: 85, date: '01/07' },
  { day: 'T7', rate: 60, date: '02/07' },
  { day: 'CN', rate: 45, date: '03/07' },
];

const weeklyProductivityData = [
  { week: 'Tuần 22', completed: 18, total: 24 },
  { week: 'Tuần 23', completed: 22, total: 28 },
  { week: 'Tuần 24', completed: 15, total: 20 },
  { week: 'Tuần 25', completed: 25, total: 30 },
  { week: 'Tuần 26', completed: 20, total: 25 },
];

// Heatmap data: 7 days x 16 hours (7am - 10pm)
const generateHeatmapData = () => {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7-22

  return days.map((day) =>
    hours.map((hour) => ({
      day,
      hour,
      value: Math.floor(Math.random() * 100),
    }))
  ).flat();
};

const heatmapData = generateHeatmapData();

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

/* ─── Sub-components ─── */

// Time Range Dropdown
interface TimeRangeDropdownProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

function TimeRangeDropdown({ value, onChange }: TimeRangeDropdownProps) {
  const [open, setOpen] = useState(false);

  const options: { value: TimeRange; label: string }[] = [
    { value: 'this_week', label: 'Tuần này' },
    { value: 'last_week', label: 'Tuần trước' },
    { value: 'this_month', label: 'Tháng này' },
  ];

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" style={{ minWidth: 140 }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl transition-colors"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8F5E8',
        }}
      >
        <span className="text-sm font-medium" style={{ color: '#243024' }}>
          {selected?.label}
        </span>
        <ChevronDown
          size={16}
          style={{ color: '#9CA3AF' }}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-20"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(36, 48, 36, 0.12)',
              border: '1px solid #E8F5E8',
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm transition-colors"
                style={{
                  background: value === opt.value ? '#DDF3DF' : 'transparent',
                  color: '#243024',
                }}
                onMouseEnter={(e) => {
                  if (value !== opt.value) {
                    e.currentTarget.style.background = '#F4FAF4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== opt.value) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Procrastination Score Card
interface ProcrastinationScoreCardProps {
  data: typeof procrastinationData.this_week;
}

function ProcrastinationScoreCard({ data }: ProcrastinationScoreCardProps) {
  const scoreColor =
    data.level === 'good'
      ? '#5FAF6E'
      : data.level === 'average'
      ? '#B8860B'
      : '#C1644C';

  const levelBadge =
    data.level === 'good'
      ? { variant: 'neutral' as const, label: 'Tốt' }
      : data.level === 'average'
      ? { variant: 'medium-low' as const, label: 'Trung bình' }
      : { variant: 'high' as const, label: 'Cần can thiệp' };

  return (
    <Card className="h-full">
      <div className="flex flex-col h-full">
        {/* Main score */}
        <div className="text-center mb-6">
          <div
            className="font-black tabular-nums"
            style={{
              fontSize: 80,
              color: scoreColor,
              lineHeight: 1,
            }}
          >
            {data.score}
          </div>
          <Badge variant={levelBadge.variant} className="mt-3">
            {levelBadge.label}
          </Badge>

          {/* Comparison badge */}
          <div className="flex items-center justify-center gap-1 mt-3">
            {data.change < 0 ? (
              <TrendingDown size={14} style={{ color: '#5FAF6E' }} />
            ) : (
              <TrendingUp size={14} style={{ color: '#C1644C' }} />
            )}
            <span
              className="text-xs font-medium"
              style={{ color: data.change < 0 ? '#5FAF6E' : '#C1644C' }}
            >
              {data.change < 0 ? '↓' : '↑'} {Math.abs(data.change)}% so với tuần trước
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-4">
          <h4
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: '#9CA3AF' }}
          >
            Breakdown
          </h4>
          {data.breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: '#5F6E5F' }}
                >
                  {item.label}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: '#243024' }}
                >
                  {item.value}%
                </span>
              </div>
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ height: 6, background: '#E8F5E8' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.value}%`,
                    background:
                      item.value > 50
                        ? '#C1644C'
                        : item.value > 30
                        ? '#B8860B'
                        : '#5FAF6E',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Completion Rate Chart Card
function CompletionRateCard() {
  return (
    <Card className="h-full">
      <div className="flex flex-col h-full">
        <h3
          className="text-sm font-semibold mb-4"
          style={{ color: '#243024' }}
        >
          Completion Rate theo tuần
        </h3>

        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={completionRateData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E8F5E8"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E8F5E8',
                  borderRadius: 12,
                  boxShadow: '0 4px 16px rgba(36, 48, 36, 0.1)',
                }}
                formatter={(value: number) => [`${value}%`, 'Completion']}
                labelFormatter={(label) => {
                  const dataPoint = completionRateData.find((d) => d.day === label);
                  return `${label} (${dataPoint?.date})`;
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#5FAF6E"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: '#5FAF6E',
                  stroke: '#FFFFFF',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: '#5FAF6E',
                  stroke: '#FFFFFF',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

// Heatmap Card
interface HeatmapTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function HeatmapCard() {
  // Get color intensity based on value
  const getHeatColor = (value: number) => {
    if (value >= 80) return '#2E7D32';
    if (value >= 60) return '#4CAF50';
    if (value >= 40) return '#81C784';
    if (value >= 20) return '#C8E6C9';
    return '#E8F5E8';
  };

  const getHeatmapValue = (day: string, hour: number) => {
    const found = heatmapData.find((d) => d.day === day && d.hour === hour);
    return found?.value ?? 0;
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3
          className="text-sm font-semibold"
          style={{ color: '#243024' }}
        >
          Heatmap hiệu suất
        </h3>
      </div>

      <div className="overflow-x-auto">
        {/* Hour labels on left */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}
        >
          {/* Header row (days) */}
          <div />
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium py-1"
              style={{ color: '#5F6E5F' }}
            >
              {day}
            </div>
          ))}

          {/* Data rows */}
          {HOURS.map((hour) => (
            <>
              {/* Hour label */}
              <div
                key={`hour-${hour}`}
                className="text-right text-xs py-1 pr-2"
                style={{ color: '#9CA3AF' }}
              >
                {hour}:00
              </div>

              {/* Day cells */}
              {DAYS.map((day) => {
                const value = getHeatmapValue(day, hour);
                return (
                  <div
                    key={`${day}-${hour}`}
                    className="relative group"
                    title={`${day}, ${hour}:00 - Hiệu suất ${value}%`}
                  >
                    <div
                      className="rounded-sm transition-transform hover:scale-110 hover:z-10"
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        background: getHeatColor(value),
                        minWidth: 20,
                      }}
                    />

                    {/* Tooltip on hover */}
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                      style={{
                        background: '#243024',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(36, 48, 36, 0.2)',
                      }}
                    >
                      {day}, {hour}:00 - {value}%
                    </div>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          Ít
        </span>
        {[20, 40, 60, 80, 100].map((val) => (
          <div
            key={val}
            className="w-4 h-4 rounded-sm"
            style={{ background: getHeatColor(val) }}
          />
        ))}
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          Nhiều
        </span>
      </div>
    </Card>
  );
}

// Weekly Productivity Bar Chart
function WeeklyProductivityCard() {
  return (
    <Card>
      <h3
        className="text-sm font-semibold mb-6"
        style={{ color: '#243024' }}
      >
        Weekly Productivity Report
      </h3>

      <div className="min-h-[200px]">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={weeklyProductivityData}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E8F5E8"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#FFFFFF',
                border: '1px solid #E8F5E8',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(36, 48, 36, 0.1)',
              }}
              cursor={{ fill: 'rgba(95, 175, 110, 0.1)' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="completed"
              name="Hoàn thành"
              fill="#5FAF6E"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="total"
              name="Tổng số"
              fill="#E8F5E8"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Empty State Card
interface EmptyStateCardProps {
  title: string;
  icon: React.ReactNode;
}

function EmptyStateCard({ title, icon }: EmptyStateCardProps) {
  return (
    <Card className="flex flex-col items-center justify-center py-16">
      <div
        className="flex items-center justify-center rounded-3xl mb-4"
        style={{
          width: 80,
          height: 80,
          background: '#E8F5E8',
          color: '#9CA3AF',
        }}
      >
        {icon}
      </div>
      <h3
        className="text-base font-semibold text-center mb-2"
        style={{ color: '#243024' }}
      >
        {title}
      </h3>
      <p
        className="text-sm text-center max-w-xs"
        style={{ color: '#9CA3AF' }}
      >
        Chưa đủ dữ liệu để hiển thị, hãy tiếp tục sử dụng FocusFlow nhé!
      </p>
    </Card>
  );
}

/* ─── Main Analytics Page ─── */
export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('this_week');

  const procrastinationScore = procrastinationData[timeRange];
  const hasData = true; // Toggle to test empty state

  return (
    <div className="flex flex-col min-h-full px-6 lg:px-10 py-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>
            Phân tích năng suất
          </h1>
          <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
            Theo dõi tiến độ và cải thiện hiệu suất làm việc
          </p>
        </div>

        <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
      </header>

      {hasData ? (
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* Procrastination Score Card - 5 columns */}
          <div className="col-span-12 lg:col-span-5">
            <ProcrastinationScoreCard data={procrastinationScore} />
          </div>

          {/* Completion Rate Card - 7 columns */}
          <div className="col-span-12 lg:col-span-7">
            <CompletionRateCard />
          </div>

          {/* Heatmap - Full width */}
          <div className="col-span-12">
            <HeatmapCard />
          </div>

          {/* Weekly Productivity - Full width */}
          <div className="col-span-12">
            <WeeklyProductivityCard />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* Empty states */}
          <div className="col-span-12 lg:col-span-5">
            <EmptyStateCard title="Procrastination Score" icon={<Clock size={32} />} />
          </div>
          <div className="col-span-12 lg:col-span-7">
            <EmptyStateCard title="Completion Rate" icon={<TrendingUp size={32} />} />
          </div>
          <div className="col-span-12">
            <EmptyStateCard title="Heatmap hiệu suất" icon={<BarChart3 size={32} />} />
          </div>
          <div className="col-span-12">
            <EmptyStateCard title="Weekly Productivity" icon={<BarChart3 size={32} />} />
          </div>
        </div>
      )}
    </div>
  );
}
