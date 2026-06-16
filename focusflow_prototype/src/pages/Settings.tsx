import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Save, LogOut, Bell, Clock, Palette } from 'lucide-react'
import { mockUserProfile } from '../services/mockData'

interface SettingsProps {
  onLogout: () => void
}

export default function Settings({ onLogout }: SettingsProps) {
  const [formData, setFormData] = useState({
    name: mockUserProfile.name,
    email: mockUserProfile.email,
    workStartTime: mockUserProfile.workStartTime,
    workEndTime: mockUserProfile.workEndTime,
    focusTime: mockUserProfile.pomodoroSettings.focusTime,
    shortBreak: mockUserProfile.pomodoroSettings.shortBreak,
    longBreak: mockUserProfile.pomodoroSettings.longBreak,
    notificationsEnabled: true,
    emailNotifications: true,
    darkMode: false,
  })

  const [isSaved, setIsSaved] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleLogout = () => {
    if (confirm('Bạn chắc chắn muốn đăng xuất?')) {
      onLogout()
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-h2">Cài đặt</h1>
        <p className="text-body text-[#6f6c69] mt-2">Cá nhân hóa FocusFlow theo nhu cầu của bạn</p>
      </div>

      {/* Success Message */}
      {isSaved && (
        <div className="p-4 bg-[#f0f6df] border border-[#4c7a45] rounded-lg text-[#4c7a45]">
          ✓ Cài đặt đã được lưu thành công
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Account Settings */}
        <div className="card p-8">
          <h2 className="text-h3 mb-6">Thông tin tài khoản</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#25221e] mb-2">Tên</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#25221e] mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field w-full"
              />
            </div>

            <div className="pt-4 border-t border-[#d7d6d4]">
              <button type="button" className="text-[#e34432] hover:text-[#cf3520] font-medium text-sm">
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>

        {/* Work Schedule */}
        <div className="card p-8">
          <h2 className="text-h3 mb-6 flex items-center gap-2">
            <Clock size={24} className="text-[#e34432]" />
            Cấu hình lịch làm việc
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">Giờ bắt đầu</label>
                <input
                  type="time"
                  name="workStartTime"
                  value={formData.workStartTime}
                  onChange={handleInputChange}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">Giờ kết thúc</label>
                <input
                  type="time"
                  name="workEndTime"
                  value={formData.workEndTime}
                  onChange={handleInputChange}
                  className="input-field w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#25221e] mb-2">Ngày làm việc</label>
              <div className="grid grid-cols-4 gap-2">
                {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 p-2 border border-[#d7d6d4] rounded-lg cursor-pointer hover:bg-[#f4e6e3] transition-colors"
                  >
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pomodoro Settings */}
        <div className="card p-8">
          <h2 className="text-h3 mb-6">Cấu hình Pomodoro</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">Thời gian tập trung (phút)</label>
                <input
                  type="number"
                  name="focusTime"
                  value={formData.focusTime}
                  onChange={handleInputChange}
                  min="5"
                  max="60"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">Nghỉ ngắn (phút)</label>
                <input
                  type="number"
                  name="shortBreak"
                  value={formData.shortBreak}
                  onChange={handleInputChange}
                  min="1"
                  max="15"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#25221e] mb-2">Nghỉ dài (phút)</label>
                <input
                  type="number"
                  name="longBreak"
                  value={formData.longBreak}
                  onChange={handleInputChange}
                  min="5"
                  max="30"
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-8">
          <h2 className="text-h3 mb-6 flex items-center gap-2">
            <Bell size={24} className="text-[#e34432]" />
            Cấu hình thông báo
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-[#d7d6d4] rounded-lg cursor-pointer hover:bg-[#f4e6e3] transition-colors">
              <input
                type="checkbox"
                name="notificationsEnabled"
                checked={formData.notificationsEnabled}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-[#25221e]">Nhắc qua web</span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-[#d7d6d4] rounded-lg cursor-pointer hover:bg-[#f4e6e3] transition-colors">
              <input
                type="checkbox"
                name="emailNotifications"
                checked={formData.emailNotifications}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-[#25221e]">Nhắc qua email</span>
            </label>

            <div className="text-sm text-[#6f6c69] p-3 bg-[#f4e6e3] rounded-lg">
              <p>Chúng tôi sẽ gửi nhắc nhở:</p>
              <ul className="mt-2 space-y-1 ml-4">
                <li>• Trước deadline 1 ngày</li>
                <li>• Khi task quá hạn</li>
                <li>• Gợi ý phiên focus</li>
                <li>• Báo cáo hàng tuần</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card p-8">
          <h2 className="text-h3 mb-6 flex items-center gap-2">
            <Palette size={24} className="text-[#e34432]" />
            Giao diện
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#25221e] mb-3">Chế độ hiển thị</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 p-3 border-2 border-[#e34432] rounded-lg cursor-pointer bg-white">
                  <input type="radio" name="theme" value="light" defaultChecked className="w-4 h-4" />
                  <span className="text-sm font-medium">Light (mặc định)</span>
                </label>
                <label className="flex items-center gap-2 p-3 border border-[#d7d6d4] rounded-lg cursor-pointer hover:bg-[#f4e6e3]">
                  <input type="radio" name="theme" value="dark" className="w-4 h-4" />
                  <span className="text-sm font-medium">Dark</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#25221e] mb-3">Màu nhấn</label>
              <div className="flex gap-3">
                {[
                  { name: 'Tomato', color: '#e34432' },
                  { name: 'Blue', color: '#3498db' },
                  { name: 'Green', color: '#4c7a45' },
                  { name: 'Purple', color: '#8e44ad' },
                ].map((colorOption) => (
                  <label
                    key={colorOption.name}
                    className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-[#d7d6d4] cursor-pointer hover:border-[#e34432]"
                    style={{ backgroundColor: colorOption.color, opacity: colorOption.color === '#e34432' ? 1 : 0.3 }}
                  >
                    <input type="radio" name="accentColor" value={colorOption.name} defaultChecked className="hidden" />
                    {colorOption.color === '#e34432' && <span className="text-white font-bold">✓</span>}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Save size={18} />
            Lưu thay đổi
          </button>
          <button type="button" onClick={handleLogout} className="btn-ghost flex-1 flex items-center justify-center gap-2">
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="card p-8 border-2 border-[#e34432]">
        <h2 className="text-h4 text-[#e34432] mb-3">Vùng nguy hiểm</h2>
        <p className="text-body-sm text-[#6f6c69] mb-4">Hành động này không thể hoàn tác</p>
        <button className="text-[#e34432] hover:text-[#cf3520] font-medium text-sm">Xóa tài khoản</button>
      </div>
    </div>
  )
}
