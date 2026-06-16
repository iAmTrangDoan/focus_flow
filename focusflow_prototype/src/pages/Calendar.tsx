import { useState } from 'react'
import { ChevronLeft, ChevronRight, Grid2x2, Calendar as CalendarIcon } from 'lucide-react'
import { mockTasks } from '../services/mockData'

type ViewType = 'month' | 'week' | 'day'

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ViewType>('month')

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return mockTasks.filter((t) => t.dueDate === dateStr)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="bg-[#f4e6e3] opacity-50 min-h-24"></div>
      )
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const tasksForDay = getTasksForDate(date)
      const isToday =
        date.toDateString() === new Date().toDateString()
      const isOverdue = date < new Date() && date.toDateString() !== new Date().toDateString()

      days.push(
        <div
          key={day}
          className={`min-h-24 p-2 border rounded-lg transition-colors cursor-pointer hover:bg-[#f4e6e3] ${
            isToday
              ? 'bg-[#f4e6e3] border-[#e34432]'
              : isOverdue
                ? 'border-[#e34432] border-2'
                : 'border-[#d7d6d4] bg-white'
          }`}
        >
          <div className={`text-sm font-bold mb-1 ${isToday ? 'text-[#e34432]' : 'text-[#25221e]'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {tasksForDay.slice(0, 2).map((task) => (
              <div
                key={task.id}
                className={`text-xs p-1 rounded truncate text-white font-medium ${
                  task.priority === 'high'
                    ? 'bg-[#e34432]'
                    : task.priority === 'medium'
                      ? 'bg-[#f5a623]'
                      : 'bg-[#4c7a45]'
                }`}
              >
                {task.title}
              </div>
            ))}
            {tasksForDay.length > 2 && (
              <div className="text-xs text-[#6f6c69] px-1">+{tasksForDay.length - 2} khác</div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  const monthName = currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h2">Lịch trình</h1>
        <p className="text-body text-[#6f6c69] mt-2">Quản lý công việc theo lịch</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-6">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-h4">{monthName}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-[#f4e6e3] rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-medium bg-[#f4e6e3] text-[#e34432] rounded-lg hover:bg-[#ead6d0] transition-colors"
              >
                Hôm nay
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-[#f4e6e3] rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* View Type Buttons */}
          <div className="flex gap-2 mb-6 border-b border-[#d7d6d4] pb-4">
            {(['month', 'week', 'day'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewType === type
                    ? 'bg-[#e34432] text-white'
                    : 'text-[#6f6c69] hover:bg-[#f4e6e3]'
                }`}
              >
                {type === 'month' ? 'Tháng' : type === 'week' ? 'Tuần' : 'Ngày'}
              </button>
            ))}
          </div>

          {/* Month View */}
          {viewType === 'month' && (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-sm font-bold text-[#6f6c69] py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {renderCalendarDays()}
              </div>
            </>
          )}

          {/* Week View */}
          {viewType === 'week' && (
            <div className="space-y-4">
              <p className="text-body text-[#6f6c69]">Tuần bắt đầu từ {currentDate.toLocaleDateString('vi-VN')}</p>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date(currentDate)
                  date.setDate(date.getDate() + i)
                  const tasksForDay = getTasksForDate(date)

                  return (
                    <div key={i} className="card p-3">
                      <p className="text-sm font-medium text-[#25221e] mb-2">
                        {date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' })}
                      </p>
                      <div className="space-y-2">
                        {tasksForDay.map((task) => (
                          <div
                            key={task.id}
                            className="bg-[#f4e6e3] p-2 rounded text-xs font-medium text-[#e34432] line-clamp-2"
                          >
                            {task.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Day View */}
          {viewType === 'day' && (
            <div className="space-y-4">
              <p className="text-body font-medium">{currentDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <div className="space-y-3">
                {mockTasks.filter((t) => t.dueDate === currentDate.toISOString().split('T')[0]).length > 0 ? (
                  mockTasks
                    .filter((t) => t.dueDate === currentDate.toISOString().split('T')[0])
                    .map((task) => (
                      <div key={task.id} className="bg-[#f4e6e3] p-4 rounded-lg">
                        <p className="font-medium text-[#25221e]">{task.title}</p>
                        <p className="text-sm text-[#6f6c69] mt-1">{task.description}</p>
                        <div className="mt-3 flex gap-2">
                          {task.priority === 'high' && <span className="badge badge-priority-high">Cao</span>}
                          {task.priority === 'medium' && <span className="badge badge-priority-medium">Trung bình</span>}
                          {task.priority === 'low' && <span className="badge badge-priority-low">Thấp</span>}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-body text-[#6f6c69] text-center py-8">Không có công việc vào ngày này</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Unscheduled Tasks */}
        <div className="card p-6 h-fit">
          <h3 className="text-h4 mb-4">Công việc chưa xếp lịch</h3>
          <div className="space-y-2">
            {mockTasks
              .filter((t) => t.status !== 'completed')
              .slice(0, 5)
              .map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-white border border-[#d7d6d4] rounded-lg hover:bg-[#f4e6e3] transition-colors cursor-move"
                >
                  <p className="text-sm font-medium text-[#25221e] line-clamp-2">{task.title}</p>
                  <p className="text-xs text-[#6f6c69] mt-1">
                    {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              ))}
          </div>
          <button className="w-full mt-4 btn-primary text-sm">Tự động xếp lịch</button>
        </div>
      </div>
    </div>
  )
}
