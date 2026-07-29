import { useState, useEffect } from 'react';
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
import { ChevronDown, TrendingUp, BarChart3, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import analyticsService, {
  type ProcrastinationScoreData,
  type CompletionRateDay,
  type WeeklyProductivity,
} from '../services/analytics.service';

/* ─── Types ─── */
type TimeRange = 'this_week' | 'last_week' | 'this_month';

/* ─── Sub-components ─── */

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
        style={{ background: '#FFFFFF', border: '1px solid #E8F5E8' }}
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
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
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
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm transition-colors"
                style={{ background: value === opt.value ? '#DDF3DF' : 'transparent', color: '#243024' }}
                onMouseEnter={(e) => { if (value !== opt.value) e.currentTarget.style.background = '#F4FAF4'; }}
                onMouseLeave={(e) => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
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

interface ProcrastinationScoreCardProps {
  data: ProcrastinationScoreData | null;
  loading: boolean;
}

function ProcrastinationScoreCard({ data, loading }: ProcrastinationScoreCardProps) {
  if (loading) {
    return (
      <Card className="h-full p-6">
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <span className="text-sm" style={{ color: '#9CA3AF' }}>Đang tải...</span>
        </div>
      </Card>
    );
  }
  if (!data) {
    return (
      <EmptyStateCard title="Procrastination Score" icon={<Clock size={32} />} />
    );
  }

  const classMap: Record<string, { color: string; label: string }> = {
    'Tốt': { color: '#5FAF6E', label: 'Tốt' },
    'Trung bình': { color: '#B8860B', label: 'Trung bình' },
    'Cần can thiệp': { color: '#C1644C', label: 'Cần can thiệp' },
  };
  const { color: scoreColor, label: levelLabel } = classMap[data.classification] ?? { color: '#5FAF6E', label: data.classification };

  const breakdownItems = [
    { label: 'Delay Rate', value: data.breakdown.delayRate, description: 'Tỷ lệ trì hoãn bắt đầu task', invert: true },
    { label: 'Deadline Miss Rate', value: data.breakdown.deadlineMissRate, description: 'Tỷ lệ trễ deadline', invert: true },
    { label: 'Task Idle Days', value: data.breakdown.taskIdleDays, description: 'Số ngày task nằm im', invert: true },
    { label: 'Reschedule Frequency', value: data.breakdown.rescheduleFrequency, description: 'Tần suất đổi lịch', invert: true },
    { label: 'Time Duration Accuracy', value: data.breakdown.timeDurationAccuracy, description: 'Độ chính xác ước lượng thời gian', invert: false },
  ];

  return (
    <Card className="h-full p-6">
      <div className="flex flex-col h-full">
        <div className="text-center mb-6">
          <div className="font-black tabular-nums" style={{ fontSize: 80, color: scoreColor, lineHeight: 1 }}>
            {Math.round(data.score)}
          </div>
          <Badge variant="neutral" className="mt-3">{levelLabel}</Badge>
        </div>

        <div className="flex-1 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
            Breakdown
          </h4>
          {breakdownItems.map((item) => {
            const barColor = item.invert
              ? (item.value > 50 ? '#C1644C' : item.value > 30 ? '#B8860B' : '#5FAF6E')
              : (item.value > 70 ? '#5FAF6E' : item.value > 50 ? '#B8860B' : '#C1644C');
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: '#5F6E5F' }}>{item.label}</span>
                  <span className="text-xs font-semibold" style={{ color: '#243024' }}>{item.value}%</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: '#E8F5E8' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(item.value, 100)}%`,
                      background: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function CompletionRateCard({ data }: { data: CompletionRateDay[] }) {
  return (
    <Card className="h-full p-6">
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#243024' }}>
        Completion Rate theo tuần
      </h3>
      <div className="min-h-[200px]">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E8" vertical={false} />
            <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false}
              tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: '#FFFFFF', border: '1px solid #E8F5E8', borderRadius: 12 }}
              formatter={(value: any) => [`${value}%`, 'Completion']}
            />
            <Line type="monotone" dataKey="rate" stroke="#5FAF6E" strokeWidth={3}
              dot={{ r: 4, fill: '#5FAF6E', stroke: '#FFFFFF', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#5FAF6E', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}



function WeeklyProductivityCard({ data }: { data: WeeklyProductivity[] }) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold mb-6" style={{ color: '#243024' }}>Weekly Productivity Report</h3>
      <div className="min-h-[200px]">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E8" vertical={false} />
            <XAxis dataKey="week" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#FFFFFF', border: '1px solid #E8F5E8', borderRadius: 12 }}
              cursor={{ fill: 'rgba(95, 175, 110, 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: 16 }} iconType="circle" iconSize={8} />
            <Bar dataKey="completed" name="Hoàn thành" fill="#5FAF6E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="total" name="Tổng số" fill="#E8F5E8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function EmptyStateCard({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 p-6">
      <div className="flex items-center justify-center rounded-3xl mb-4"
        style={{ width: 80, height: 80, background: '#E8F5E8', color: '#9CA3AF' }}>
        {icon}
      </div>
      <h3 className="text-base font-semibold text-center mb-2" style={{ color: '#243024' }}>{title}</h3>
      <p className="text-sm text-center max-w-xs" style={{ color: '#9CA3AF' }}>
        Chưa đủ dữ liệu để hiển thị, hãy tiếp tục sử dụng FocusFlow nhé!
      </p>
    </Card>
  );
}

/* ─── Main Analytics Page ─── */
export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('this_week');
  const [procrastinationScore, setProcrastinationScore] = useState<ProcrastinationScoreData | null>(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const [completionRate, setCompletionRate] = useState<CompletionRateDay[]>([]);
  const [weeklyProductivity, setWeeklyProductivity] = useState<WeeklyProductivity[]>([]);

  useEffect(() => {
    setLoadingScore(true);
    analyticsService.getProcrastinationScore()
      .then(setProcrastinationScore)
      .catch(() => setProcrastinationScore(null))
      .finally(() => setLoadingScore(false));

    analyticsService.getWeeklyProductivity().then(setWeeklyProductivity).catch(() => {});
  }, []);

  useEffect(() => {
    analyticsService.getCompletionRate(timeRange).then(setCompletionRate).catch(() => {});
  }, [timeRange]);

  const hasData = procrastinationScore !== null || completionRate.length > 0;

  return (
    <div className="flex flex-col min-h-full">
      <header
        className="sticky top-0 z-30 flex items-start justify-between gap-4 flex-wrap py-4 px-6 lg:px-10 mb-8"
        style={{ background: 'rgba(244, 250, 244, 0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #E8F5E8' }}
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>Phân tích năng suất</h1>
          <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
            Theo dõi tiến độ và cải thiện hiệu suất làm việc
          </p>
        </div>
        <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
      </header>

      <div className="px-6 lg:px-10 pb-8">
        {hasData ? (
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          <div className="col-span-12 lg:col-span-5">
            <ProcrastinationScoreCard data={procrastinationScore} loading={loadingScore} />
          </div>
          <div className="col-span-12 lg:col-span-7">
            <CompletionRateCard data={completionRate} />
          </div>

          <div className="col-span-12">
            <WeeklyProductivityCard data={weeklyProductivity} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          <div className="col-span-12 lg:col-span-5">
            <EmptyStateCard title="Procrastination Score" icon={<Clock size={32} />} />
          </div>
          <div className="col-span-12 lg:col-span-7">
            <EmptyStateCard title="Completion Rate" icon={<TrendingUp size={32} />} />
          </div>

          <div className="col-span-12">
            <EmptyStateCard title="Weekly Productivity" icon={<BarChart3 size={32} />} />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
