import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw,  ScrollText } from 'lucide-react';
import { Badge, SkeletonLoader } from '../../components/ui';

export interface SystemLogItem {
  id: string;
  timestamp: string;
  type: 'subtask_suggestion' | 'ai_feedback' | 'priority_calc' | 'procrastination_calc';
  status: 'success' | 'error';
  responseTime: number;
  userId: string;
  details?: string;
}

const mockSystemLogs: SystemLogItem[] = [
  { id: 'l1', timestamp: '2026-07-22 17:30:18', type: 'subtask_suggestion', status: 'success', responseTime: 1240, userId: 'u1', details: 'Gemini API trả về 4 subtasks hợp lệ' },
  { id: 'l2', timestamp: '2026-07-22 17:28:55', type: 'ai_feedback', status: 'success', responseTime: 980, userId: 'u2', details: 'Sinh nhận xét Pomodoro thành công' },
  { id: 'l3', timestamp: '2026-07-22 17:25:42', type: 'priority_calc', status: 'success', responseTime: 45, userId: 'u4', details: 'Tính toán lại Priority Score cho 15 tasks' },
  { id: 'l4', timestamp: '2026-07-22 17:20:18', type: 'subtask_suggestion', status: 'error', responseTime: 5000, userId: 'u3', details: 'Gemini API timeout sau 5000ms' },
  { id: 'l5', timestamp: '2026-07-22 17:15:03', type: 'ai_feedback', status: 'success', responseTime: 1120, userId: 'u6', details: 'Phân tích AI Insights hoàn tất' },
  { id: 'l6', timestamp: '2026-07-22 17:10:45', type: 'procrastination_calc', status: 'success', responseTime: 230, userId: 'u7', details: 'Cập nhật Procrastination Score: 45' },
  { id: 'l7', timestamp: '2026-07-22 17:05:12', type: 'subtask_suggestion', status: 'success', responseTime: 1380, userId: 'u1', details: 'Tạo danh sách subtask' },
];

const logTypeLabels: Record<SystemLogItem['type'], string> = {
  subtask_suggestion: 'Gợi ý subtask AI',
  ai_feedback: 'Nhận xét AI Insights',
  priority_calc: 'Tính Priority Score',
  procrastination_calc: 'Tính Procrastination Score',
};

export function SystemLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchLogs = () => {
    setLoading(true);
    setTimeout(() => {
      setLogs(mockSystemLogs);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesStatus = statusFilter === 'all' ? true : log.status === statusFilter;
      const matchesType = typeFilter === 'all' ? true : log.type === typeFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.id.toLowerCase().includes(q) ||
        log.userId.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q));
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [logs, statusFilter, typeFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#243024]">Nhật ký hệ thống (System Logs)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Theo dõi truy vết các sự kiện API, tính toán thuật toán và phản hồi AI
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8F5E8] bg-white text-sm font-semibold text-[#243024] hover:bg-[#F4FAF4] transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-[#5FAF6E]" />
          Làm mới
        </button>
      </div>


      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 rounded-2xl bg-[#F4FAF4] p-1 border border-[#E8F5E8]">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'all' ? 'bg-white text-[#243024] shadow-sm' : 'text-gray-500'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('success')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'success' ? 'bg-white text-[#5FAF6E] shadow-sm' : 'text-gray-500'
              }`}
            >
              Thành công
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('error')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'error' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Thất bại
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-[#E8F5E8] bg-white px-3 py-2 text-xs font-semibold text-[#243024] focus:outline-none focus:ring-1 focus:ring-[#5FAF6E]"
          >
            <option value="all">Tất cả loại sự kiện</option>
            <option value="subtask_suggestion">Gợi ý subtask AI</option>
            <option value="ai_feedback">Nhận xét AI Insights</option>
            <option value="priority_calc">Tính Priority Score</option>
            <option value="procrastination_calc">Tính Procrastination Score</option>
          </select>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo ID hoặc chi tiết..."
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
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-400">Không tìm thấy nhật ký phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E8F5E8] bg-[#F4FAF4]/50 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-5 py-3.5">Loại sự kiện</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5">Phản hồi</th>
                  <th className="px-5 py-3.5">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8F5E8]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F4FAF4]/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{log.timestamp}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-[#243024]">
                        {logTypeLabels[log.type] || log.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {log.status === 'success' ? (
                        <Badge variant="success">THÀNH CÔNG</Badge>
                      ) : (
                        <Badge variant="danger">LỖI</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{log.responseTime} ms</td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 truncate max-w-md">
                      {log.details || 'Không có chi tiết'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemLogsPage;
