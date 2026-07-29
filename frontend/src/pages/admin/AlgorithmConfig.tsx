import { useEffect, useState } from 'react';
import { Save, RotateCcw, AlertTriangle, SlidersHorizontal, Brain } from 'lucide-react';
import { ConfirmModal, SkeletonLoader } from '../../components/ui';
import adminService from '../../services/admin.service';
import { createToast, type ToastMessage } from '../../components/common/Toast';

interface SliderConfig {
  key: string;
  label: string;
  description: string;
  value: number; // Percentage integer e.g., 30 for 0.3
}

const defaultPriorityWeights: SliderConfig[] = [
  { key: 'priority_weight_urgency', label: 'Urgency', description: 'Mức độ khẩn cấp của task', value: 30 },
  { key: 'priority_weight_importance', label: 'Importance', description: 'Tầm quan trọng đối với mục tiêu', value: 25 },
  { key: 'priority_weight_deadline_pressure', label: 'Deadline Pressure', description: 'Áp lực từ deadline gần', value: 20 },
  { key: 'priority_weight_energy_fit', label: 'Energy Fit', description: 'Phù hợp mức năng lượng hiện tại', value: 15 },
  { key: 'priority_weight_procrastination_risk', label: 'Procrastination Risk', description: 'Nguy cơ trì hoãn', value: 10 },
];

const defaultProcrastinationWeights: SliderConfig[] = [
  { key: 'procrastination_weight_delay_rate', label: 'Delay Rate', description: 'Tỷ lệ trễ deadline', value: 25 },
  { key: 'procrastination_weight_deadline_miss', label: 'Deadline Miss Rate', description: 'Tỷ lệ bỏ lỡ deadline', value: 25 },
  { key: 'procrastination_weight_idle_days', label: 'Task Idle Days', description: 'Số ngày task nằm im', value: 20 },
  { key: 'procrastination_weight_reschedule', label: 'Reschedule Frequency', description: 'Tần suất dời lịch', value: 15 },
  { key: 'procrastination_weight_duration_accuracy', label: 'Time Duration Accuracy', description: 'Độ chính xác ước lượng thời gian', value: 15 },
];

interface AlgorithmConfigProps {
  onToast?: (toast: ToastMessage) => void;
}

export function AlgorithmConfigPage({ onToast }: AlgorithmConfigProps) {
  const [loading, setLoading] = useState(true);
  const [priorityWeights, setPriorityWeights] = useState<SliderConfig[]>(defaultPriorityWeights);
  const [procrastinationWeights, setProcrastinationWeights] = useState<SliderConfig[]>(defaultProcrastinationWeights);

  // Modal confirmation state
  const [confirmSaveGroup, setConfirmSaveGroup] = useState<'priority' | 'procrastination' | null>(null);
  const [confirmResetGroup, setConfirmResetGroup] = useState<'priority' | 'procrastination' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService
      .getConfigs()
      .then((configs) => {
        if (configs && configs.length > 0) {
          const configMap = new Map(configs.map((c) => [c.key, parseFloat(c.value)]));

          setPriorityWeights((prev) =>
            prev.map((w) => {
              const val = configMap.get(w.key);
              return val !== undefined ? { ...w, value: Math.round(val * 100) } : w;
            })
          );

          setProcrastinationWeights((prev) =>
            prev.map((w) => {
              const val = configMap.get(w.key);
              return val !== undefined ? { ...w, value: Math.round(val * 100) } : w;
            })
          );
        }
      })
      .catch(() => {
        if (onToast) onToast(createToast('info', 'Sử dụng cấu hình trọng số mặc định'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const saveWeights = async (group: 'priority' | 'procrastination') => {
    const targetWeights = group === 'priority' ? priorityWeights : procrastinationWeights;
    const payload = targetWeights.map((w) => ({
      key: w.key,
      value: (w.value / 100).toFixed(2),
    }));

    setSaving(true);
    try {
      await adminService.updateConfigs(payload);
      if (onToast) {
        onToast(
          createToast(
            'success',
            `Cập nhật trọng số ${group === 'priority' ? 'Priority Score' : 'Procrastination Score'} thành công`
          )
        );
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lưu cấu hình thất bại. Vui lòng kiểm tra lại tổng trọng số = 100%';
      if (onToast) onToast(createToast('error', msg));
    } finally {
      setSaving(false);
      setConfirmSaveGroup(null);
    }
  };

  const resetWeights = (group: 'priority' | 'procrastination') => {
    if (group === 'priority') {
      setPriorityWeights(defaultPriorityWeights.map((w) => ({ ...w })));
    } else {
      setProcrastinationWeights(defaultProcrastinationWeights.map((w) => ({ ...w })));
    }
    setConfirmResetGroup(null);
    if (onToast) {
      onToast(createToast('info', 'Đã khôi phục trọng số về mặc định'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#243024]">Cấu hình thuật toán</h1>
        <p className="mt-1 text-sm text-gray-500">
          Điều chỉnh trọng số các yếu tố ảnh hưởng đến Priority Score và Procrastination Score
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <WeightCard
            title="Trọng số Priority Score"
            subtitle="Xác định mức độ ưu tiên của các công việc"
            icon={<SlidersHorizontal className="h-5 w-5 text-[#5FAF6E]" />}
            weights={priorityWeights}
            setWeights={setPriorityWeights}
            onSave={() => setConfirmSaveGroup('priority')}
            onReset={() => setConfirmResetGroup('priority')}
          />

          <WeightCard
            title="Trọng số Procrastination Score"
            subtitle="Xác định mức độ chấm điểm chì hoãn người dùng"
            icon={<Brain className="h-5 w-5 text-[#5FAF6E]" />}
            weights={procrastinationWeights}
            setWeights={setProcrastinationWeights}
            onSave={() => setConfirmSaveGroup('procrastination')}
            onReset={() => setConfirmResetGroup('procrastination')}
          />
        </div>
      )}

      {/* Confirmation Modal for Saving */}
      <ConfirmModal
        open={!!confirmSaveGroup}
        onClose={() => setConfirmSaveGroup(null)}
        onConfirm={() => confirmSaveGroup && saveWeights(confirmSaveGroup)}
        loading={saving}
        title="Xác nhận lưu cấu hình"
        variant="warning"
        confirmLabel="Áp dụng ngay"
        message={
          <span>
            Bạn có chắc chắn muốn lưu thay đổi trọng số cho{' '}
            <strong className="text-black">
              {confirmSaveGroup === 'priority' ? 'Priority Score' : 'Procrastination Score'}
            </strong>
            ? Thay đổi này sẽ ảnh hưởng trực tiếp tới kết quả tính toán trên toàn bộ ứng dụng.
          </span>
        }
      />

      {/* Confirmation Modal for Resetting */}
      <ConfirmModal
        open={!!confirmResetGroup}
        onClose={() => setConfirmResetGroup(null)}
        onConfirm={() => confirmResetGroup && resetWeights(confirmResetGroup)}
        title="Khôi phục mặc định"
        variant="info"
        confirmLabel="Khôi phục"
        message={
          <span>
            Bạn có muốn đưa các trọng số{' '}
            <strong>
              {confirmResetGroup === 'priority' ? 'Priority Score' : 'Procrastination Score'}
            </strong>{' '}
            trở về giá trị mặc định ban đầu?
          </span>
        }
      />
    </div>
  );
}

function WeightCard({
  title,
  subtitle,
  icon,
  weights,
  setWeights,
  onSave,
  onReset,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  weights: SliderConfig[];
  setWeights: React.Dispatch<React.SetStateAction<SliderConfig[]>>;
  onSave: () => void;
  onReset: () => void;
}) {
  const total = weights.reduce((sum, w) => sum + w.value, 0);
  const isOff = total !== 100;

  const handleChange = (key: string, value: number) => {
    setWeights((prev) => prev.map((w) => (w.key === key ? { ...w, value } : w)));
  };

  return (
    <div className="rounded-2xl border border-[#E8F5E8] bg-white p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DDF3DF]">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#243024]">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>

        {/* Total indicator */}
        <div
          className={`mb-4 flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${
            isOff ? 'bg-amber-100 text-amber-900' : 'bg-[#DDF3DF] text-[#243024]'
          }`}
        >
          <span className="text-sm font-semibold">Tổng trọng số</span>
          <div className="flex items-center gap-2">
            {isOff && <AlertTriangle className="h-4 w-4 text-amber-700" />}
            <span className={`text-lg font-extrabold tabular-nums ${isOff ? 'text-amber-700' : 'text-[#5FAF6E]'}`}>
              {total}%
            </span>
          </div>
        </div>

        {isOff && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Tổng trọng số phải đúng 100%. Hiện tại đang lệch {Math.abs(100 - total)}%.</span>
          </div>
        )}

        {/* Sliders list */}
        <div className="divide-y divide-[#E8F5E8]">
          {weights.map((w) => (
            <div key={w.key} className="py-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-[#243024]">{w.label}</label>
                  <p className="text-xs text-gray-400">{w.description}</p>
                </div>
                <span className="rounded-full bg-[#DDF3DF] px-3 py-1 text-xs font-bold text-[#5FAF6E] min-w-[50px] text-center">
                  {w.value}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={w.value}
                onChange={(e) => handleChange(w.key, Number(e.target.value))}
                className="w-full accent-[#5FAF6E] cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-6 flex gap-3 pt-4 border-t border-[#E8F5E8]">
        <button
          type="button"
          onClick={onSave}
          disabled={isOff}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5FAF6E] text-white text-sm font-semibold hover:bg-[#4a9354] transition-colors disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          Lưu cấu hình
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8F5E8] bg-white text-sm font-semibold text-gray-600 hover:bg-[#F4FAF4] transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Mặc định
        </button>
      </div>
    </div>
  );
}

export default AlgorithmConfigPage;
