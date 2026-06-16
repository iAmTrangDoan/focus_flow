import { useState } from 'react'
import { BarChart3, TrendingUp, Zap } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { mockDailyStats, mockAIInsights } from '../services/mockData'

type TimePeriod = 'today' | '7days' | '30days' | 'custom'

export default function Analytics() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7days')

  const completionData = mockDailyStats.week.map((day, idx) => ({
    date: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][idx],
    'Hoàn thành': day.completed,
    'Tổng': day.total,
  }))

  const productivityData = mockDailyStats.monthlyProductivity.slice(-7).map((day) => ({
    date: new Date(day.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
    'Focus Time (phút)': day.focusTime,
    'Tasks': day.tasksCompleted,
  }))

  const categoryData = [
    { name: 'Luận văn', value: 45, fill: '#e34432' },
    { name: 'Học tập', value: 30, fill: '#f5a623' },
    { name: 'Cá nhân', value: 25, fill: '#4c7a45' },
  ]

  const hourlyData = mockDailyStats.hourlyProductivity

  const stats = [
    {
      label: 'Tỷ lệ hoàn thành',
      value: '68%',
      change: '+5%',
      icon: TrendingUp,
    },
    {
      label: 'Số task trì hoãn',
      value: '2',
      change: '-1',
      icon: BarChart3,
    },
    {
      label: 'Tổng focus time',
      value: '47h',
      change: '+3h',
      icon: Zap,
    },
    {
      label: 'Chuỗi duy trì',
      value: '5 ngày',
      change: '+2 ngày',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h2">Báo cáo năng suất</h1>
        <p className="text-body text-[#6f6c69] mt-2">Xem chi tiết tiến độ và cải thiện hiệu suất công việc</p>
      </div>

      {/* Time Period Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['today', '7days', '30days', 'custom'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setTimePeriod(period)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              timePeriod === period
                ? 'bg-[#e34432] text-white'
                : 'bg-white border border-[#d7d6d4] text-[#6f6c69] hover:bg-[#f4e6e3]'
            }`}
          >
            {period === 'today' ? 'Hôm nay' : period === '7days' ? '7 ngày' : period === '30days' ? '30 ngày' : 'Tùy chỉnh'}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <p className="text-body-sm text-[#6f6c69]">{stat.label}</p>
                <Icon className="text-[#e34432]" size={20} />
              </div>
              <p className="text-3xl font-bold text-[#25221e]">{stat.value}</p>
              <p className="text-sm text-[#4c7a45] mt-2">{stat.change} so với tuần trước</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Chart */}
        <div className="card p-6">
          <h3 className="text-h4 mb-6">Tỷ lệ hoàn thành theo ngày</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7d6d4" />
              <XAxis dataKey="date" stroke="#6f6c69" />
              <YAxis stroke="#6f6c69" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #d7d6d4',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="Hoàn thành" fill="#e34432" />
              <Bar dataKey="Tổng" fill="#d7d6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Focus Time & Tasks Chart */}
        <div className="card p-6">
          <h3 className="text-h4 mb-6">Focus time & Tasks hoàn thành</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7d6d4" />
              <XAxis dataKey="date" stroke="#6f6c69" />
              <YAxis stroke="#6f6c69" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #d7d6d4',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Focus Time (phút)"
                stroke="#e34432"
                strokeWidth={2}
                dot={{ fill: '#e34432', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Tasks"
                stroke="#4c7a45"
                strokeWidth={2}
                dot={{ fill: '#4c7a45', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="card p-6">
          <h3 className="text-h4 mb-6">Phân bổ task theo danh mục</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #d7d6d4',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Heatmap */}
        <div className="card p-6">
          <h3 className="text-h4 mb-6">Khung giờ năng suất cao</h3>
          <div className="grid grid-cols-2 gap-2">
            {hourlyData.map((hour) => (
              <div
                key={hour.hour}
                className={`p-3 rounded-lg text-center border ${
                  hour.focus
                    ? 'bg-[#f4e6e3] border-[#e34432] font-medium text-[#e34432]'
                    : 'bg-white border-[#d7d6d4] text-[#6f6c69]'
                }`}
              >
                <p className="text-sm">{hour.hour}</p>
                <p className="text-xs mt-1">{hour.tasks} tasks</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="card p-6">
        <h3 className="text-h4 mb-4 flex items-center gap-2">
          <span className="text-lg">✨</span> AI Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockAIInsights.map((insight, idx) => (
            <div key={idx} className="p-4 bg-[#f0f6df] border border-[#4c7a45]/20 rounded-lg">
              <p className="text-sm text-[#4c7a45]">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="flex gap-4">
        <button className="btn-ghost flex-1">Chia sẻ báo cáo</button>
        <button className="btn-primary flex-1">Xuất PDF</button>
      </div>
    </div>
  )
}
