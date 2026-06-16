import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Volume2, VolumeX, Brain } from 'lucide-react'
import { mockTasks, mockUserProfile } from '../services/mockData'

type TimerMode = 'focus' | 'short-break' | 'long-break' | 'custom'

export default function FocusTimer() {
  const [mode, setMode] = useState<TimerMode>('focus')
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [totalTime, setTotalTime] = useState(25 * 60)
  const [selectedTask, setSelectedTask] = useState(mockTasks[0])
  const [focusLevel, setFocusLevel] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  const modes = [
    { id: 'focus', label: 'Pomodoro', duration: mockUserProfile.pomodoroSettings.focusTime * 60 },
    { id: 'short-break', label: 'Nghỉ ngắn', duration: mockUserProfile.pomodoroSettings.shortBreak * 60 },
    { id: 'long-break', label: 'Nghỉ dài', duration: mockUserProfile.pomodoroSettings.longBreak * 60 },
  ]

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false)
      if (soundEnabled) {
        // Play sound effect (mock)
        console.log('Timer finished!')
      }
      if (mode === 'focus') {
        setShowCompletionModal(true)
      }
    }

    return () => clearInterval(interval)
  }, [isRunning, timeLeft, soundEnabled, mode])

  const handleModeChange = (newMode: TimerMode) => {
    setMode(newMode)
    setIsRunning(false)
    const selectedModeConfig = modes.find((m) => m.id === newMode)
    if (selectedModeConfig) {
      setTimeLeft(selectedModeConfig.duration)
      setTotalTime(selectedModeConfig.duration)
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    const selectedModeConfig = modes.find((m) => m.id === mode)
    if (selectedModeConfig) {
      setTimeLeft(selectedModeConfig.duration)
      setTotalTime(selectedModeConfig.duration)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((totalTime - timeLeft) / totalTime) * 100

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-h2 text-[#243024]">Focus Timer</h1>
        <p className="text-body text-[#5F6E5F] mt-2">Bắt đầu phiên tập trung - Pomodoro 25 phút</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2 card-lg p-12 text-center bg-gradient-to-br from-white to-[#F4FAF4]">
          {/* Mode Selection */}
          <div className="flex gap-2 justify-center mb-8 flex-wrap">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id as TimerMode)}
                className={`px-5 py-2 rounded-[12px] font-semibold transition-colors ${
                  mode === m.id
                    ? 'bg-[#5FAF6E] text-white shadow-md'
                    : 'bg-[#DDF3DF] text-[#5F6E5F] hover:bg-[#C9EAC9]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Timer Display */}
          <div className="relative mb-12">
            <svg className="w-64 h-64 transform -rotate-90" style={{ margin: '0 auto' }}>
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="#D9E6D9"
                strokeWidth="8"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="#5FAF6E"
                strokeWidth="8"
                strokeDasharray={`${(120 * 2 * Math.PI * progress) / 100} ${120 * 2 * Math.PI}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-7xl font-bold text-[#243024]">{formatTime(timeLeft)}</div>
              <p className="text-lg text-[#5F6E5F] mt-3 font-semibold">{modes.find((m) => m.id === mode)?.label}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="bg-[#5FAF6E] text-white p-5 rounded-full hover:bg-[#4a9354] transition-colors shadow-md hover:shadow-lg"
            >
              {isRunning ? <Pause size={32} /> : <Play size={32} />}
            </button>
            <button
              onClick={handleReset}
              className="bg-[#DDF3DF] text-[#5FAF6E] p-5 rounded-full hover:bg-[#C9EAC9] transition-colors"
            >
              <RotateCcw size={24} />
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-5 rounded-full transition-colors ${
                soundEnabled ? 'bg-[#7BC47F] text-white' : 'bg-[#DDF3DF] text-[#5F6E5F]'
              }`}
            >
              {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
          </div>

          {/* Current Task */}
          {selectedTask && mode === 'focus' && (
            <div className="bg-gradient-to-br from-[#DDF3DF] to-[#E8F5EA] rounded-[16px] p-6 border border-[#D9E6D9]">
              <p className="text-sm text-[#5F6E5F] mb-2 font-semibold uppercase tracking-wide">Đang tập trung vào</p>
              <h3 className="text-h4 text-[#243024]">{selectedTask.title}</h3>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="badge badge-priority-high">
                  {selectedTask.priority === 'high' ? 'Cao' : 'TB'}
                </span>
                <span className="text-sm text-[#5F6E5F]">
                  {selectedTask.subtasks.length} subtask
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Task Selection */}
          <div className="card p-4">
            <h3 className="text-h4 mb-3">Chọn công việc</h3>
            <select
              value={selectedTask.id}
              onChange={(e) => {
                const task = mockTasks.find((t) => t.id === e.target.value)
                if (task) setSelectedTask(task)
              }}
              className="input-field w-full"
            >
              {mockTasks
                .filter((t) => t.status !== 'completed')
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
            </select>
          </div>

          {/* Subtasks */}
          {selectedTask.subtasks.length > 0 && mode === 'focus' && (
            <div className="card p-4">
              <h3 className="text-h4 mb-3">Subtask</h3>
              <div className="space-y-2">
                {selectedTask.subtasks.map((subtask) => (
                  <label key={subtask.id} className="flex items-start gap-2 p-2 hover:bg-[#f4e6e3] rounded cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={subtask.completed}
                      className="mt-1"
                    />
                    <span className={`text-sm ${subtask.completed ? 'line-through text-[#6f6c69]' : 'text-[#25221e]'}`}>
                      {subtask.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Ambient Focus */}
          <div className="card p-4">
            <h3 className="text-h4 mb-3">Hỗ trợ tập trung</h3>
            <div className="space-y-2">
              <button className="w-full btn-secondary text-sm">
                <Brain size={16} className="inline mr-2" />
                Tắt thông báo
              </button>
              <label className="flex items-center gap-2 p-2 border border-[#d7d6d4] rounded-lg cursor-pointer hover:bg-[#f4e6e3]">
                <input type="checkbox" />
                <span className="text-sm text-[#25221e]">Âm thanh xung quanh</span>
              </label>
            </div>
          </div>

          {/* Quick Notes */}
          <div className="card p-4">
            <h3 className="text-h4 mb-3">Ghi chú nhanh</h3>
            <textarea
              placeholder="Ghi chú điều gây xao nhãng..."
              className="input-field w-full text-sm h-20 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-8 max-w-md w-full">
            <h2 className="text-h3 text-center mb-6">🎉 Hoàn thành phiên tập trung</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">
                  Mức độ tập trung (1-5)
                </label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setFocusLevel(level)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        focusLevel === level
                          ? 'bg-[#e34432] text-white'
                          : 'bg-[#f4e6e3] text-[#6f6c69] hover:bg-[#ead6d0]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">
                  Điều gây xao nhãng
                </label>
                <textarea
                  placeholder="Ghi lại những yếu tố làm bạn mất tập trung..."
                  className="input-field w-full text-sm h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCompletionModal(false)}
                className="flex-1 btn-ghost"
              >
                Đóng
              </button>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="flex-1 btn-primary"
              >
                Lưu phiên
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
