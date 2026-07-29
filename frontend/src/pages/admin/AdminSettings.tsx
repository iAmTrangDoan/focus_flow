import { useState } from 'react';
import { Settings, Shield, Save } from 'lucide-react';
import { ConfirmModal } from '../../components/ui';
import { createToast, type ToastMessage } from '../../components/common/Toast';

interface AdminSettingsProps {
  onToast?: (toast: ToastMessage) => void;
}

export function AdminSettingsPage({ onToast }: AdminSettingsProps) {
  const [appName, setAppName] = useState('FocusFlow');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [maxSubtasks, setMaxSubtasks] = useState(5);
  const [rateLimit, setRateLimit] = useState(60);

  // Destructive / Save confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setShowConfirm(false);
      if (onToast) {
        onToast(createToast('success', 'Đã lưu cài đặt hệ thống Admin thành công!'));
      }
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#243024]">Cài đặt hệ thống chung</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý tham số cấu hình chung cho môi trường hoạt động FocusFlow
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5FAF6E] text-white text-sm font-semibold hover:bg-[#4a9354] transition-colors"
        >
          <Save className="h-4 w-4" />
          Lưu cài đặt
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* General App Settings */}
        <div className="rounded-2xl border border-[#E8F5E8] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-[#E8F5E8] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DDF3DF]">
              <Settings className="h-5 w-5 text-[#5FAF6E]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#243024]">Tham số cơ bản</h3>
              <p className="text-xs text-gray-500">Cấu hình thông tin hệ thống</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tên ứng dụng</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full rounded-xl border border-[#E8F5E8] px-4 py-2.5 text-sm text-[#243024] font-semibold focus:outline-none focus:ring-2 focus:ring-[#5FAF6E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Múi giờ mặc định hệ thống</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border border-[#E8F5E8] px-4 py-2.5 text-sm text-[#243024] font-semibold focus:outline-none focus:ring-2 focus:ring-[#5FAF6E]"
            >
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+07:00)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
            </select>
          </div>
        </div>

        {/* AI & Security Settings */}
        <div className="rounded-2xl border border-[#E8F5E8] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-[#E8F5E8] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DDF3DF]">
              <Shield className="h-5 w-5 text-[#5FAF6E]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#243024]">Giới hạn AI & API</h3>
              <p className="text-xs text-gray-500">Bảo vệ tài nguyên và hạn chế rate limit</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Số subtask gợi ý tối đa mỗi lượt AI
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxSubtasks}
              onChange={(e) => setMaxSubtasks(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E8F5E8] px-4 py-2.5 text-sm text-[#243024] font-semibold focus:outline-none focus:ring-2 focus:ring-[#5FAF6E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              API Rate Limit (request / phút)
            </label>
            <input
              type="number"
              min={10}
              max={300}
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E8F5E8] px-4 py-2.5 text-sm text-[#243024] font-semibold focus:outline-none focus:ring-2 focus:ring-[#5FAF6E]"
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSave}
        loading={saving}
        title="Xác nhận áp dụng cài đặt"
        variant="warning"
        confirmLabel="Lưu cài đặt"
        message={<span>Bạn có chắc chắn muốn lưu lại các tham số cài đặt hệ thống này?</span>}
      />
    </div>
  );
}

export default AdminSettingsPage;
