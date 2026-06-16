import { useState } from 'react'
import { Search, Grid3x3, List, Trash2, Edit2, CheckCircle2, Circle } from 'lucide-react'
import { mockTasks, Task } from '../services/mockData'

export default function TaskManagement() {
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [filter, setFilter] = useState<string>('all')
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filters = [
    { id: 'all', label: 'Tất cả' },
    { id: 'today', label: 'Hôm nay' },
    { id: 'upcoming', label: 'Sắp tới' },
    { id: 'overdue', label: 'Quá hạn' },
    { id: 'completed', label: 'Đã hoàn thành' },
    { id: 'delayed', label: 'Đang trì hoãn' },
  ]

  const getFilteredTasks = () => {
    let filtered = tasks
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (searchTerm) {
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (filter !== 'all') {
      filtered = filtered.filter((t) => {
        if (filter === 'today') {
          const taskDate = new Date(t.dueDate)
          const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate())
          return taskDateOnly.getTime() === today.getTime()
        }
        if (filter === 'completed') return t.status === 'completed'
        if (filter === 'delayed') return t.status === 'delayed'
        return t.status === filter
      })
    }

    return filtered
  }

  const toggleTaskComplete = (id: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === id ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' } : t
      )
    )
  }

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id))
  }

  const filteredTasks = getFilteredTasks()

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'badge-priority-high'
      case 'medium':
        return 'badge-priority-medium'
      case 'low':
        return 'badge-priority-low'
      default:
        return ''
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'todo': '⏱️ Chưa làm',
      'in-progress': '⚙️ Đang làm',
      'completed': '✓ Hoàn thành',
      'delayed': '⚠️ Trì hoãn',
    }
    return statusMap[status] || status
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h2">Công việc của tôi</h1>
        <p className="text-body text-[#6f6c69] mt-2">Quản lý và theo dõi các công việc của bạn</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="text-[#6f6c69]" size={20} />
          <input
            type="text"
            placeholder="Tìm công việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-[#e34432] text-white' : 'bg-white border border-[#d7d6d4] text-[#6f6c69]'
            }`}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'board' ? 'bg-[#e34432] text-white' : 'bg-white border border-[#d7d6d4] text-[#6f6c69]'
            }`}
          >
            <Grid3x3 size={20} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-[#e34432] text-white'
                : 'bg-white border border-[#d7d6d4] text-[#6f6c69] hover:bg-[#f4e6e3]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {viewMode === 'list' && (
        <div className="card overflow-hidden">
          <div className="divide-y divide-[#d7d6d4]">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[#6f6c69] mb-2">Chưa có công việc nào</p>
                <p className="text-body-sm text-[#6f6c69]">Hãy thêm công việc đầu tiên của bạn</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 hover:bg-[#f4e6e3] transition-colors ${
                    task.status === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className="mt-1 flex-shrink-0 text-[#6f6c69] hover:text-[#e34432]"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 size={20} className="text-[#4c7a45]" />
                      ) : (
                        <Circle size={20} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-[#25221e] ${task.status === 'completed' ? 'line-through' : ''}`}>
                        {task.title}
                      </h4>
                      <p className="text-sm text-[#6f6c69] mt-1">{task.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs px-2 py-1 bg-[#f0f6df] text-[#4c7a45] rounded">{task.project}</span>
                        <span className={`badge ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                        </span>
                        <span className="text-xs text-[#6f6c69]">
                          {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs bg-white border border-[#d7d6d4] px-2 py-1 rounded">
                        {getStatusBadge(task.status)}
                      </span>
                      <button className="p-2 hover:bg-white rounded-lg text-[#6f6c69] hover:text-[#25221e]">
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 hover:bg-white rounded-lg text-[#6f6c69] hover:text-[#e34432]"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['todo', 'in-progress', 'completed', 'delayed'].map((status) => (
            <div key={status} className="card p-4">
              <h3 className="font-bold text-[#25221e] mb-4">
                {status === 'todo'
                  ? '📋 Chưa làm'
                  : status === 'in-progress'
                    ? '⚙️ Đang làm'
                    : status === 'completed'
                      ? '✓ Hoàn thành'
                      : '⚠️ Trì hoãn'}
              </h3>
              <div className="space-y-3">
                {filteredTasks
                  .filter((t) => t.status === status)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="bg-white border border-[#d7d6d4] rounded-lg p-3 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <p className="text-sm font-medium text-[#25221e] line-clamp-2">{task.title}</p>
                      <div className="mt-2 flex gap-2">
                        <span className={`badge ${getPriorityColor(task.priority)} text-xs`}>
                          {task.priority === 'high' ? 'Cao' : 'TB'}
                        </span>
                        <span className="text-xs text-[#6f6c69]">
                          {new Date(task.dueDate).toLocaleDateString('vi-VN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
