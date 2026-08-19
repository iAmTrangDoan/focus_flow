import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, ScrollText, AlertTriangle } from 'lucide-react';
import { Badge, SkeletonLoader } from '../../components/ui';
import adminService, { type SystemLogItem, type SystemLogCategory, type SystemLogStatus } from '../../services/admin.service';

const CATEGORY_LABELS: Record<SystemLogCategory, string> = {
  API: 'API',
  SCHEDULER: 'Scheduler',
  ANALYTICS: 'Analytics',
  CRON: 'Cron Job',
  AI: 'AI',
  ADMIN: 'Admin',
};

const CATEGORY_COLORS: Record<SystemLogCategory, string> = {
  API: 'bg-gray-100 text-gray-700',
  SCHEDULER: 'bg-blue-100 text-blue-700',
  ANALYTICS: 'bg-teal-100 text-teal-700',
  CRON: 'bg-orange-100 text-orange-700',
  AI: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-slate-100 text-slate-600',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  SCHEDULE_GENERATED: 'Sinh lịch tuần',
  SCHEDULE_RESTRUCTURED: 'Tái cấu trúc lịch',
  PROCRASTINATION_SCORE_CALCULATED: 'Tính Procrastination Score',
  CRON_STARTED: 'Cron Bắt đầu',
  CRON_COMPLETED: 'Cron Hoàn tất',
  CRON_FAILED: 'Cron Thất bại',
  AI_SUBTASK_GENERATED: 'Gợi ý subtask AI',
  AI_INSIGHT_GENERATED: 'Sinh AI Insights',
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function MetadataBadges({ metadata }: { metadata?: Record<string, any> }) {
  if (!metadata) return null;
  const entries = Object.entries(metadata).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.slice(0, 4).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1 rounded-md bg-gray-50 border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
          <span className="font-medium text-gray-400">{k}:</span>
          <span>{String(v)}</span>
        </span>
      ))}
    </div>
  );
}

export function SystemLogsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SystemLogStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SystemLogCategory>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getSystemLogs({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search.trim() || undefined,
        limit: 200,
      });
      setLogs(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (log) =>
        log.eventType.toLowerCase().includes(q) ||
        log.source?.toLowerCase().includes(q) ||
        log.userId?.toLowerCase().includes(q) ||
        log.message?.toLowerCase().includes(q) ||
        log.errorMessage?.toLowerCase().includes(q),
    );
  }, [logs, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#243024]">Nhật ký hệ thống (System Logs)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Theo dõi truy vết các sự kiện Scheduler, AI, Analytics và Cron Jobs
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8F5E8] bg-white text-sm font-semibold text-[#243024] hover:bg-[#F4FAF4] transition-colors"
        >
          <RefreshCw className={`h-4 w-4 text-[#5FAF6E] ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status filter */}
          <div className="flex gap-1 rounded-2xl bg-[#F4FAF4] p-1 border border-[#E8F5E8]">
            {(['all', 'SUCCESS', 'FAILED', 'STARTED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === s
                    ? s === 'FAILED'
                      ? 'bg-white text-red-600 shadow-sm'
                      : s === 'SUCCESS'
                      ? 'bg-white text-[#5FAF6E] shadow-sm'
                      : 'bg-white text-[#243024] shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {s === 'all' ? 'Tất cả' : s === 'SUCCESS' ? 'Thành công' : s === 'FAILED' ? 'Thất bại' : 'Đang chạy'}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | SystemLogCategory)}
            className="rounded-xl border border-[#E8F5E8] bg-white px-3 py-2 text-xs font-semibold text-[#243024] focus:outline-none focus:ring-1 focus:ring-[#5FAF6E]"
          >
            <option value="all">Tất cả loại</option>
            {(Object.keys(CATEGORY_LABELS) as SystemLogCategory[]).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo event, user ID..."
            className="w-full rounded-xl border border-[#E8F5E8] bg-white pl-10 pr-4 py-2 text-xs text-[#243024] focus:outline-none focus:ring-1 focus:ring-[#5FAF6E]"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E8F5E8] bg-white shadow-sm">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader variant="table" rows={6} cols={5} />
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-300 mb-2" />
            <p className="text-sm font-semibold text-red-400">{error}</p>
            <button onClick={fetchLogs} className="mt-3 text-xs text-[#5FAF6E] underline">Thử lại</button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-400">Chưa có nhật ký nào</p>
            <p className="text-xs text-gray-400 mt-1">Các sự kiện sẽ xuất hiện khi hệ thống hoạt động</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E8F5E8] bg-[#F4FAF4]/50 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-5 py-3.5">Nhóm</th>
                  <th className="px-5 py-3.5">Sự kiện</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5">Thời gian xử lý</th>
                  <th className="px-5 py-3.5">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8F5E8]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F4FAF4]/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${CATEGORY_COLORS[log.category] || 'bg-gray-100 text-gray-600'}`}>
                        {CATEGORY_LABELS[log.category] || log.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-[#243024]">
                        {EVENT_TYPE_LABELS[log.eventType] || log.eventType}
                      </span>
                      {log.source && (
                        <span className="ml-1.5 text-[10px] text-gray-400">[{log.source}]</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {log.status === 'SUCCESS' ? (
                        <Badge variant="success">THÀNH CÔNG</Badge>
                      ) : log.status === 'FAILED' ? (
                        <Badge variant="danger">LỖI</Badge>
                      ) : log.status === 'STARTED' ? (
                        <Badge variant="info">ĐANG CHẠY</Badge>
                      ) : (
                        <Badge variant="warning">BỎ QUA</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {log.durationMs != null ? `${log.durationMs} ms` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 max-w-sm">
                      {log.errorMessage ? (
                        <span className="text-red-500">{log.errorMessage}</span>
                      ) : log.message ? (
                        <span>{log.message}</span>
                      ) : null}
                      <MetadataBadges metadata={log.metadata} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && (
        <p className="text-xs text-gray-400 text-right">
          Hiển thị {filteredLogs.length} bản ghi (tối đa 200)
        </p>
      )}
    </div>
  );
}

export default SystemLogsPage;
