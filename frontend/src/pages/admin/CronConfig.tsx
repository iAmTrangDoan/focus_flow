import { useEffect, useState } from 'react';
import { Clock, Bell, Sparkles, CheckCircle2, XCircle, Save } from 'lucide-react';
import { Badge, ConfirmModal, SkeletonLoader } from '../../components/ui';
import { createToast, type ToastMessage } from '../../components/common/Toast';

interface CronJob {
  id: string;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  type: 'procrastination' | 'reminder' | 'ai_insights';
  enabled: boolean;
  time: string;
  day?: string;
  lastRun: { status: 'success' | 'error'; timestamp: string; message: string };
}

const dayOptions = [
  { value: 'mon', label: 'Thứ Hai' },
  { value: 'tue', label: 'Thứ Ba' },
  { value: 'wed', label: 'Thứ Tư' },
  { value: 'thu', label: 'Thứ Năm' },
  { value: 'fri', label: 'Thứ Sáu' },
  { value: 'sat', label: 'Thứ Bảy' },
  { value: 'sun', label: 'Chủ Nhật' },
];

const initialJobs: CronJob[] = [
  {
    id: 'procrastination',
    type: 'procrastination',
    title: 'Tính Procrastination Score hằng ngày',
    description: 'Tự động tính lại điểm trì hoãn cho tất cả người dùng vào cuối ngày',
    iconBg: 'bg-[#DDF3DF]',
    iconColor: 'text-[#5FAF6E]',
    enabled: true,
    time: '00:00',
    lastRun: { status: 'success', timestamp: '2026-07-22 00:00:12', message: 'Đã cập nhật tất cả người dùng' },
  },
  // {
  //   id: 'reminder',
  //   type: 'reminder',
  //   title: 'Gửi reminder hằng ngày',
  //   description: 'Gửi thông báo nhắc nhở task đến hạn qua Socket & Notification Gateway',
  //   iconBg: 'bg-blue-100',
  //   iconColor: 'text-blue-600',
  //   enabled: true,
  //   time: '08:00',
  //   lastRun: { status: 'success', timestamp: '2026-07-22 08:00:05', message: 'Đã gửi thông báo nhắc nhở' },
  // },
  {
    id: 'ai_insights',
    type: 'ai_insights',
    title: 'Tổng hợp AI Insights hằng tuần ',
    description: 'Phân tích dữ liệu tuần và sinh nhận xét AI tự động lúc 07:00 sáng Thứ Hai',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    enabled: true,
    time: '07:00',
    day: 'mon',
    lastRun: { status: 'success', timestamp: '2026-07-20 07:00:00', message: 'Hoàn tất sinh nhận xét AI hàng tuần' },
  },
];

interface CronConfigProps {
  onToast?: (toast: ToastMessage) => void;
}

export function CronConfigPage({ onToast }: CronConfigProps) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<CronJob[]>(initialJobs);

  // Destructive/Saving Confirm modal
  const [jobToToggle, setJobToToggle] = useState<{ id: string; nextState: boolean } | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const updateJob = (id: string, updates: Partial<CronJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
  };

  const confirmToggleJob = () => {
    if (!jobToToggle) return;
    updateJob(jobToToggle.id, { enabled: jobToToggle.nextState });
    if (onToast) {
      onToast(
        createToast(
          'info',
          `Đã ${jobToToggle.nextState ? 'kích hoạt' : 'tắt'} Cron Job "${
            jobs.find((j) => j.id === jobToToggle.id)?.title
          }"`
        )
      );
    }
    setJobToToggle(null);
  };

  const confirmSaveAll = () => {
    setShowSaveConfirm(false);
    if (onToast) {
      onToast(createToast('success', 'Đã ghi nhận cấu hình lịch trình Cron Job!'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#243024]">Cấu hình Cron Job</h1>
          <p className="mt-1 text-sm text-gray-500">
            Lên lịch các tác vụ tự động ngầm của hệ thống FocusFlow
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSaveConfirm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5FAF6E] text-white text-sm font-semibold hover:bg-[#4a9354] transition-colors"
        >
          <Save className="h-4 w-4" />
          Lưu thay đổi
        </button>
      </div>

      {/* Backend API Note Banner
      <div className="flex items-start gap-3 rounded-2xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div>
          <p className="font-bold">Ghi chú tích hợp Backend:</p>
          <p className="mt-0.5">
            Cron job hàng tuần <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">@Cron('0 0 7 * * 1')</code> đã được kích hoạt trực tiếp trong <strong>AiService</strong> (NestJS ScheduleModule).
          </p>
        </div>
      </div> */}

      {/* Jobs List */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const Icon = job.type === 'procrastination' ? Clock : job.type === 'reminder' ? Bell : Sparkles;
            return (
              <div
                key={job.id}
                className={`rounded-2xl border border-[#E8F5E8] bg-white p-6 shadow-sm transition-all ${
                  job.enabled ? '' : 'opacity-60 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${job.iconBg}`}>
                    <Icon className={`h-6 w-6 ${job.iconColor}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-[#243024]">{job.title}</h3>
                        <p className="mt-0.5 text-sm text-gray-500">{job.description}</p>
                      </div>

                      {/* Custom Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => setJobToToggle({ id: job.id, nextState: !job.enabled })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          job.enabled ? 'bg-[#5FAF6E]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            job.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Schedule Controls */}
                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      {job.day && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-gray-500">Ngày chạy:</label>
                          <select
                            value={job.day}
                            onChange={(e) => updateJob(job.id, { day: e.target.value })}
                            className="rounded-xl border border-[#E8F5E8] bg-white px-3 py-1.5 text-xs text-[#243024] font-semibold focus:outline-none focus:ring-1 focus:ring-[#5FAF6E]"
                          >
                            {dayOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-gray-500">Giờ chạy:</label>
                        <input
                          type="time"
                          value={job.time}
                          onChange={(e) => updateJob(job.id, { time: e.target.value })}
                          className="rounded-xl border border-[#E8F5E8] bg-white px-3 py-1.5 text-xs text-[#243024] font-semibold focus:outline-none focus:ring-1 focus:ring-[#5FAF6E]"
                        />
                      </div>
                    </div>

                    {/* Last Run Log */}
                    <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#F4FAF4] px-4 py-3 border border-[#E8F5E8]">
                      {job.lastRun.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-[#5FAF6E] shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500">Lần chạy gần nhất:</span>
                          <Badge variant={job.lastRun.status === 'success' ? 'success' : 'danger'}>
                            {job.lastRun.status === 'success' ? 'Thành công' : 'Lỗi'}
                          </Badge>
                          <span className="text-xs text-gray-400 font-mono">{job.lastRun.timestamp}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600 truncate">{job.lastRun.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Toggling Job */}
      <ConfirmModal
        open={!!jobToToggle}
        onClose={() => setJobToToggle(null)}
        onConfirm={confirmToggleJob}
        title={jobToToggle?.nextState ? 'Kích hoạt Cron Job' : 'Xác nhận tắt Cron Job'}
        variant={jobToToggle?.nextState ? 'info' : 'warning'}
        confirmLabel={jobToToggle?.nextState ? 'Kích hoạt' : 'Tắt tác vụ'}
        message={
          <span>
            Bạn có chắc muốn {jobToToggle?.nextState ? 'bật' : 'tắt'} tác vụ Cron này không?
          </span>
        }
      />

      {/* Confirmation Modal for Saving All */}
      <ConfirmModal
        open={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={confirmSaveAll}
        title="Lưu lịch trình Cron Job"
        variant="info"
        confirmLabel="Lưu lại"
        message={<span>Bạn có muốn áp dụng thời gian lên lịch Cron Job mới cho hệ thống?</span>}
      />
    </div>
  );
}

export default CronConfigPage;
