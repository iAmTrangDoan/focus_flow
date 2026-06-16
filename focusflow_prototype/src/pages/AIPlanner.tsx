import { useState } from 'react'
import { Sparkles, Zap, AlertTriangle, CheckCircle } from 'lucide-react'
import { mockAIInsights, mockTasks } from '../services/mockData'

export default function AIPlanner() {
  const [step, setStep] = useState<'form' | 'result'>('form')
  const [formData, setFormData] = useState({
    goal: '',
    deadline: '',
    estimatedTime: '',
    difficulty: 'medium',
    energyLevel: 'high',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('result')
  }

  const handleReset = () => {
    setStep('form')
    setFormData({
      goal: '',
      deadline: '',
      estimatedTime: '',
      difficulty: 'medium',
      energyLevel: 'high',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h2 flex items-center gap-3">
          <Sparkles className="text-[#e34432]" size={32} />
          AI Planner
        </h1>
        <p className="text-body text-[#6f6c69] mt-2">
          AI phân tích deadline, độ ưu tiên, thời gian rảnh và thói quen trì hoãn để đề xuất kế hoạch phù hợp
        </p>
      </div>

      {step === 'form' && (
        <div className="max-w-2xl">
          <div className="card p-8 mb-6 bg-gradient-to-r from-[#f4e6e3] to-white">
            <p className="text-body text-[#6f6c69]">
              FocusFlow sẽ phân tích deadline, độ ưu tiên, thời gian rảnh và thói quen trì hoãn để đề xuất kế hoạch
              phù hợp với bạn.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#25221e] mb-2">
                Tôi muốn hoàn thành...
              </label>
              <textarea
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="Ví dụ: Viết chương 2 báo cáo luận văn"
                className="input-field w-full h-24 resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">
                  Deadline (tùy chọn)
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">
                  Thời lượng ước tính (giờ)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.estimatedTime}
                  onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                  placeholder="4"
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">
                  Độ khó
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                  <option value="very-hard">Rất khó</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">
                  Mức năng lượng hiện tại
                </label>
                <select
                  value={formData.energyLevel}
                  onChange={(e) => setFormData({ ...formData, energyLevel: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <Zap size={18} />
              Tạo kế hoạch
            </button>
          </form>
        </div>
      )}

      {step === 'result' && (
        <div className="space-y-6">
          {/* Plan Result */}
          <div className="card p-8">
            <h2 className="text-h3 mb-6 flex items-center gap-2">
              <CheckCircle className="text-[#4c7a45]" size={28} />
              Kế hoạch được đề xuất
            </h2>

            <div className="space-y-6">
              {/* Timeline Suggestion */}
              <div>
                <h3 className="text-h4 mb-3">📅 Lịch làm việc đề xuất</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-[#f4e6e3] rounded-lg border border-[#d7d6d4]">
                    <p className="text-sm text-[#6f6c69] mb-1">Ngày đầu tiên</p>
                    <p className="font-medium text-[#25221e]">Hôm nay, 9:00 - 11:00</p>
                    <p className="text-xs text-[#6f6c69] mt-1">Thời gian năng suất cao</p>
                  </div>
                  <div className="p-4 bg-[#f4e6e3] rounded-lg border border-[#d7d6d4]">
                    <p className="text-sm text-[#6f6c69] mb-1">Ngày 2</p>
                    <p className="font-medium text-[#25221e]">Ngày mai, 9:00 - 11:00</p>
                    <p className="text-xs text-[#6f6c69] mt-1">Tiếp tục công việc</p>
                  </div>
                  <div className="p-4 bg-[#f4e6e3] rounded-lg border border-[#d7d6d4]">
                    <p className="text-sm text-[#6f6c69] mb-1">Ngày 3</p>
                    <p className="font-medium text-[#25221e]">15:00 - 16:30</p>
                    <p className="text-xs text-[#6f6c69] mt-1">Hoàn tất và review</p>
                  </div>
                </div>
              </div>

              {/* Task Breakdown */}
              <div>
                <h3 className="text-h4 mb-3">🎯 Nên chia nhỏ thành các subtask</h3>
                <div className="space-y-2">
                  {[
                    'Tìm hiểu tài liệu tham khảo (1 giờ)',
                    'Viết phần giới thiệu (1.5 giờ)',
                    'Viết nội dung chính (1.5 giờ)',
                    'Kiểm tra và chỉnh sửa (0.5 giờ)',
                  ].map((task, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-[#d7d6d4] rounded-lg">
                      <CheckCircle size={18} className="text-[#4c7a45] flex-shrink-0" />
                      <span className="text-sm text-[#25221e]">{task}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Score */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-[#f4e6e3] to-white rounded-lg border border-[#d7d6d4]">
                  <p className="text-sm text-[#6f6c69] mb-2">Priority Score</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-4xl font-bold text-[#e34432]">8.5</div>
                    <div className="text-sm text-[#6f6c69]">/ 10</div>
                  </div>
                  <div className="w-full bg-[#d7d6d4] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#e34432] h-full" style={{ width: '85%' }}></div>
                  </div>
                  <p className="text-xs text-[#6f6c69] mt-3">
                    Dựa trên deadline, độ khó, thời lượng, mức trì hoãn trước đó
                  </p>
                </div>

                <div className="p-4 bg-white border border-[#d7d6d4] rounded-lg">
                  <p className="text-sm text-[#6f6c69] mb-3">⚠️ Cảnh báo nguy cơ trì hoãn</p>
                  <ul className="space-y-2 text-sm text-[#25221e]">
                    <li className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-[#e34432] mt-0.5 flex-shrink-0" />
                      Task khó - nên chia nhỏ
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-[#e34432] mt-0.5 flex-shrink-0" />
                      Deadline gần - hãy bắt đầu ngay
                    </li>
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="text-h4 mb-3">💡 Gợi ý cải thiện</h3>
                <div className="space-y-2">
                  {mockAIInsights.slice(0, 3).map((insight, idx) => (
                    <div key={idx} className="p-3 bg-[#f0f6df] border border-[#4c7a45]/20 rounded-lg">
                      <p className="text-sm text-[#4c7a45]">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button onClick={handleReset} className="flex-1 btn-ghost">
              Tạo kế hoạch khác
            </button>
            <button className="flex-1 btn-primary">Chấp nhận và lên lịch</button>
          </div>
        </div>
      )}
    </div>
  )
}
