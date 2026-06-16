import { TrendingUp, CheckCircle2, AlertCircle, Clock, Zap, Target } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import useAuthStore from '../store/authStore'
import {
  mockTasks,
  mockTimeBlocks,
  mockDailyStats,
  mockAIInsights,
} from '../services/mockData'
import type { Task } from '../types'

// ── Sub-components ────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  gradientTo: string
  valueColor?: string
}

function StatCard({ label, value, sub, icon, gradientTo, valueColor = 'text-[#243024]' }: StatCardProps) {
  return (
    <div className={`card-lg p-5 bg-gradient-to-br from-white ${gradientTo}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption mb-2">{label}</p>
          <p className={`text-4xl font-bold ${valueColor}`}>{value}</p>
          <p className="text-xs text-[#5F6E5F] mt-2">{sub}</p>
        </div>
        <div className="mt-1">{icon}</div>
      </div>
    </div>
  )
}

interface PriorityTaskRowProps {
  task: Task
}

function PriorityTaskRow({ task }: PriorityTaskRowProps) {
  const badgeClass =
    task.priority === 'high' ? 'badge badge-priority-high'
    : task.priority === 'medium' ? 'badge badge-priority-medium'
    : 'badge badge-priority-low'
  const badgeLabel =
    task.priority === 'high' ? 'Cao'
    : task.priority === 'medium' ? 'Trung bình'
    : 'Thấp'

  return (
    <div className="p-3 rounded-[12px] bg-[#F4FAF4] hover:bg-[#E8F5EA] transition-colors border border-[#D9E6D9]">
      <div className="flex items-start gap-2 mb-2">
        <input type="checkbox" className="mt-1 accent-[#5FAF6E] flex-shrink-0" />
        <p className="text-sm font-medium text-[#243024] line-clamp-2 flex-1">{task.title}</p>
      </div>
      <div className="ml-6">
        <span className={badgeClass}>{badgeLabel}</span>
      </div>
    </div>
  )
}

// ── Dashboard Page ────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)

  const completedCount = mockTasks.filter((t) => t.status === 'completed').length
  const delayedCount = mockTasks.filter((t) => t.status === 'delayed').length
  const priorityTasks = mockTasks.filter((t) => t.status !== 'completed').slice(0, 5)

  const chartData = mockDailyStats.week.map((day) => ({
    date: new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' }),
    completed: day.completed,
    total: day.total,
  }))

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Chào buổi sáng'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  })()

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'bạn'

  return (
    <div className="space-y-6">
      {/* ── Greeting ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h2">
            {greeting}, {displayName}! 👋
          </h1>
          <p className="text-body-sm mt-1">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-[#5FAF6E]">Streak 🔥</p>
          <p className="text-2xl font-bold text-[#5FAF6E]">7 ngày</p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Công việc hôm nay"
          value={mockDailyStats.today.totalTasks}
          sub={`${mockDailyStats.today.totalTasks - mockDailyStats.today.completedTasks} chưa hoàn thành`}
          icon={<Target className="text-[#5FAF6E]" size={26} />}
          gradientTo="to-[#F4FAF4]"
        />
        <StatCard
          label="Đã hoàn thành"
          value={completedCount}
          sub="Tiếp tục làm tốt!"
          icon={<CheckCircle2 className="text-[#5FAF6E]" size={26} />}
          gradientTo="to-[#E8F5EA]"
          valueColor="text-[#5FAF6E]"
        />
        <StatCard
          label="Đang trì hoãn"
          value={delayedCount}
          sub="Cần chú ý"
          icon={<AlertCircle className="text-[#C1644C]" size={26} />}
          gradientTo="to-[#F6D8C7]"
          valueColor="text-[#C1644C]"
        />
        <StatCard
          label="Focus Time"
          value={`${mockDailyStats.today.totalFocusTime}m`}
          sub="Hôm nay"
          icon={<Zap className="text-[#4A7FB8]" size={26} />}
          gradientTo="to-[#DCECF8]"
          valueColor="text-[#4A7FB8]"
        />
      </div>

      {/* ── Schedule + Priority ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule */}
        <div className="lg:col-span-2 card-lg p-6">
          <h2 className="text-h4 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-[#5FAF6E]" />
            Lịch hôm nay
          </h2>
          <div className="space-y-2">
            {mockTimeBlocks.length === 0 ? (
              <p className="text-center py-8 text-[#5F6E5F]">Không có lịch hôm nay</p>
            ) : (
              mockTimeBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center gap-4 p-4 rounded-[14px] bg-[#F4FAF4] hover:bg-[#E8F5EA] transition-colors"
                >
                  <div className="w-12 h-12 rounded-[10px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {block.startTime.split(':')[0]}h
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#243024] truncate">{block.title}</p>
                    <p className="text-xs text-[#5F6E5F]">
                      {block.startTime} – {block.endTime}
                    </p>
                  </div>
                  <span className="badge badge-status flex-shrink-0">Focus</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority tasks */}
        <div className="card-lg p-6">
          <h2 className="text-h4 mb-4">⚡ Ưu tiên</h2>
          <div className="space-y-2">
            {priorityTasks.map((task) => (
              <PriorityTaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Analytics + AI Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly progress chart */}
        <div className="card-lg p-6">
          <h2 className="text-h4 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#5FAF6E]" />
            Tiến độ tuần này
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9E6D9" />
              <XAxis dataKey="date" stroke="#5F6E5F" style={{ fontSize: '12px' }} />
              <YAxis stroke="#5F6E5F" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D9E6D9',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                name="Hoàn thành"
                stroke="#5FAF6E"
                strokeWidth={3}
                dot={{ fill: '#5FAF6E', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Tổng"
                stroke="#D9E6D9"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div className="card-lg p-6 bg-gradient-to-br from-white to-[#DDF3DF]">
          <h2 className="text-h4 mb-4 flex items-center gap-2">
            <span className="text-xl">🤖</span> FocusFlow AI
          </h2>
          <div className="space-y-2.5">
            {mockAIInsights.map((insight, idx) => (
              <div key={idx} className="p-3 rounded-[12px] bg-white/80 border border-[#5FAF6E]/20">
                <p className="text-sm text-[#243024]">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Focus CTA ── */}
      <div className="card-lg p-8 bg-gradient-to-r from-[#5FAF6E] via-[#7BC47F] to-[#5FAF6E] text-white text-center rounded-[20px]">
        <h2 className="text-2xl font-bold mb-2">Bắt đầu phiên tập trung? 🎯</h2>
        <p className="mb-6 text-white/90">Pomodoro 25 phút – Tập trung hoàn toàn, không xao nhãng</p>
        <button className="inline-block bg-white text-[#5FAF6E] font-bold py-3 px-8 rounded-[14px] hover:bg-[#DDF3DF] transition-colors shadow-md">
          Bắt đầu ngay
        </button>
      </div>
    </div>
  )
}
