import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, CheckCircle2, AlertCircle, Clock, Zap, Target } from 'lucide-react'
import { mockTasks, mockTimeBlocks, mockDailyStats, mockUserProfile, mockAIInsights } from '../services/mockData'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function Dashboard() {
  const todayTasks = mockTasks.filter((t) => new Date(t.dueDate).toDateString() === new Date().toDateString())
  const priorityTasks = mockTasks.filter((t) => t.status !== 'completed').slice(0, 5)
  const completedCount = mockTasks.filter((t) => t.status === 'completed').length
  const delayedCount = mockTasks.filter((t) => t.status === 'delayed').length

  const chartData = mockDailyStats.week.map((day) => ({
    date: new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' }),
    completed: day.completed,
    total: day.total,
  }))

  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-h2 text-[#243024]">
            Chào {mockUserProfile.name}! 👋
          </h1>
          <p className="text-body-sm text-[#5F6E5F] mt-2">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[#5FAF6E]">Streak 🔥</p>
          <p className="text-2xl font-bold text-[#5FAF6E]">7 ngày</p>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks Today */}
        <div className="card-lg p-5 bg-gradient-to-br from-white to-[#F4FAF4]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-caption text-[#5F6E5F] mb-2">Công việc hôm nay</p>
              <p className="text-4xl font-bold text-[#243024]">{mockDailyStats.today.totalTasks}</p>
              <p className="text-xs text-[#5F6E5F] mt-2">5 chưa hoàn thành</p>
            </div>
            <Target className="text-[#5FAF6E]" size={28} />
          </div>
        </div>

        {/* Completed */}
        <div className="card-lg p-5 bg-gradient-to-br from-white to-[#E8F5EA]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-caption text-[#5F6E5F] mb-2">Đã hoàn thành</p>
              <p className="text-4xl font-bold text-[#5FAF6E]">{completedCount}</p>
              <p className="text-xs text-[#5F6E5F] mt-2">Tiếp tục làm tốt!</p>
            </div>
            <CheckCircle2 className="text-[#5FAF6E]" size={28} />
          </div>
        </div>

        {/* At Risk */}
        <div className="card-lg p-5 bg-gradient-to-br from-white to-[#F6D8C7]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-caption text-[#5F6E5F] mb-2">Đang trì hoãn</p>
              <p className="text-4xl font-bold text-[#C1644C]">{delayedCount}</p>
              <p className="text-xs text-[#5F6E5F] mt-2">Cần chú ý</p>
            </div>
            <AlertCircle className="text-[#C1644C]" size={28} />
          </div>
        </div>

        {/* Focus Time */}
        <div className="card-lg p-5 bg-gradient-to-br from-white to-[#DCECF8]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-caption text-[#5F6E5F] mb-2">Focus Time</p>
              <p className="text-4xl font-bold text-[#4A7FB8]">{mockDailyStats.today.totalFocusTime}m</p>
              <p className="text-xs text-[#5F6E5F] mt-2">Hôm nay</p>
            </div>
            <Zap className="text-[#4A7FB8]" size={28} />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <div className="card-lg p-6">
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
                    className="flex items-center gap-4 p-4 rounded-[14px] bg-[#F4FAF4] hover:bg-[#E8F5EA] transition-colors group"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-[10px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] text-white text-xs font-bold flex items-center justify-center">
                        {block.startTime.split(':')[0]}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#243024]">{block.title}</p>
                      <p className="text-xs text-[#5F6E5F]">
                        {block.startTime} - {block.endTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="badge badge-status">Focus</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Priority */}
        <div className="card-lg p-6">
          <h2 className="text-h4 mb-4">Ưu tiên</h2>
          <div className="space-y-2">
            {priorityTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-[12px] bg-[#F4FAF4] hover:bg-[#E8F5EA] transition-colors border border-[#D9E6D9]"
              >
                <div className="flex items-start gap-2 mb-2">
                  <input type="checkbox" className="mt-1 accent-[#5FAF6E]" />
                  <p className="text-sm font-medium text-[#243024] line-clamp-2 flex-1">{task.title}</p>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  {task.priority === 'high' && <span className="badge badge-priority-high">Cao</span>}
                  {task.priority === 'medium' && <span className="badge badge-priority-medium">Trung bình</span>}
                  {task.priority === 'low' && <span className="badge badge-priority-low">Thấp</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress */}
        <div className="card-lg p-6">
          <h2 className="text-h4 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#5FAF6E]" />
            Tiến độ tuần này
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9E6D9" />
              <XAxis dataKey="date" stroke="#5F6E5F" style={{ fontSize: '12px' }} />
              <YAxis stroke="#5F6E5F" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D9E6D9',
                  borderRadius: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#5FAF6E"
                strokeWidth={3}
                dot={{ fill: '#5FAF6E', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Smart Insights */}
        <div className="card-lg p-6 bg-gradient-to-br from-white to-[#DDF3DF]">
          <h2 className="text-h4 mb-4 flex items-center gap-2">
            <span className="text-xl">💡</span> AI Insights
          </h2>
          <div className="space-y-2">
            {mockAIInsights.slice(0, 4).map((insight, idx) => (
              <div key={idx} className="p-3 rounded-[12px] bg-white/70 border border-[#5FAF6E]/20">
                <p className="text-sm text-[#243024]">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Focus CTA */}
      <div className="card-lg p-8 bg-gradient-to-r from-[#5FAF6E] via-[#7BC47F] to-[#5FAF6E] text-white rounded-[20px] text-center">
        <h2 className="text-h3 mb-2">Bắt đầu phiên tập trung?</h2>
        <p className="mb-6 text-white/90 text-lg">Pomodoro 25 phút - Tập trung hoàn toàn, không xao nhãng</p>
        <Link
          to="/focus"
          className="inline-block bg-white text-[#5FAF6E] font-bold py-3 px-8 rounded-[14px] hover:bg-[#DDF3DF] transition-colors"
        >
          Bắt đầu ngay
        </Link>
      </div>
    </div>
  )
}
