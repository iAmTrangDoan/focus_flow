import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from 'recharts';
import {
  CheckSquare,
  Sparkles,
  Activity,
  Users as UsersIcon,
  Download,
  UserPlus,
  Ban,
  Settings as SettingsIcon,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Badge, SkeletonLoader } from '../../components/ui';
import adminService, { type AdminDashboardData, type RecentActivity } from '../../services/admin.service';

const apiCallData = [
  { date: 'T2', calls: 1240 },
  { date: 'T3', calls: 1580 },
  { date: 'T4', calls: 1320 },
  { date: 'T5', calls: 1890 },
  { date: 'T6', calls: 1650 },
  { date: 'T7', calls: 980 },
  { date: 'CN', calls: 720 },
];

const procrastinationDistribution = [
  { level: 'Tốt (0-30)', count: 542, color: '#DDF3DF' },
  { level: 'Trung bình (31-60)', count: 318, color: '#F7E7A8' },
  { level: 'Cần can thiệp (61-100)', count: 140, color: '#F6D8C7' },
];

const activityConfig: Record<string, { icon: any; color: string; iconColor: string }> = {
  signup: { icon: UserPlus, color: 'bg-[#DDF3DF]', iconColor: 'text-[#5FAF6E]' },
  block: { icon: Ban, color: 'bg-red-100', iconColor: 'text-red-600' },
  config: { icon: SettingsIcon, color: 'bg-blue-100', iconColor: 'text-blue-600' },
  error: { icon: AlertTriangle, color: 'bg-amber-100', iconColor: 'text-amber-600' },
};

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    adminService
      .getDashboard()
      .then((data) => {
        setDashboardData(data);
      })
      .catch(() => {
        setDashboardData({
          tasksCreatedToday: 0,
          totalUsers: 0,
          avgProcrastinationScore: null,
        });
      })
      .finally(() => {
        setLoading(false);
      });

    adminService
      .getRecentActivities()
      .then((data) => {
        setRecentActivities(data);
      })
      .catch(() => {
        setRecentActivities([]);
      })
      .finally(() => {
        setActivitiesLoading(false);
      });
  }, []);

  const today = new Date().toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const avgProcr = dashboardData?.avgProcrastinationScore;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#243024]">Admin Overview</h1>
          <p className="mt-1 text-sm text-gray-500">{today}</p>
        </div>
        <button
          type="button"
          onClick={() => alert('Xuất báo cáo tổng quan thành công!')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8F5E8] bg-white text-sm font-semibold text-[#243024] hover:bg-[#F4FAF4] transition-colors"
        >
          <Download className="h-4 w-4 text-[#5FAF6E]" />
          Xuất báo cáo
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonLoader key={i} variant="card" />)
        ) : (
          <>
            <StatCard
              label="Task tạo hôm nay"
              value={dashboardData?.tasksCreatedToday.toLocaleString() ?? '0'}
              icon={<CheckSquare className="h-6 w-6 text-[#5FAF6E]" />}
              iconBg="bg-[#DDF3DF]"
              trend={{ value: '+12.5%', positive: true }}
            />
            <StatCard
              label="Lượt gọi Gemini API hôm nay"
              value=""
              icon={<Sparkles className="h-6 w-6 text-blue-600" />}
              iconBg="bg-blue-100"
              trend={{ value: '+8.2%', positive: true }}
            />
            <StatCard
              label="Procrastination Score trung bình"
              value={avgProcr != null ? String(avgProcr) : '--'}
              icon={<Activity className="h-6 w-6 text-amber-600" />}
              iconBg="bg-amber-100"
              badge={avgProcr != null ? <Badge variant="warning">Trung bình</Badge> : undefined}
              trend={{ value: '-3.1%', positive: true }}
            />
            <StatCard
              label="Tổng số người dùng"
              value={dashboardData?.totalUsers.toLocaleString() ?? '0'}
              icon={<UsersIcon className="h-6 w-6 text-[#5FAF6E]" />}
              iconBg="bg-[#DDF3DF]"
              trend={{ value: '+5.7%', positive: true }}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* API Calls Chart */}
        <div className="rounded-2xl border border-[#E8F5E8] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-bold text-[#243024]">Lượt gọi Gemini API theo 7 ngày</h3>
            <p className="mt-0.5 text-sm text-gray-500">Thống kê tự động từ hệ thống</p>
          </div>
          {loading ? (
            <SkeletonLoader variant="chart" className="h-[260px]" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={apiCallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E8" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#5F6E5F' }} axisLine={{ stroke: '#E8F5E8' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#5F6E5F' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E8F5E8',
                    fontSize: '13px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#5FAF6E"
                  strokeWidth={3}
                  dot={{ fill: '#5FAF6E', r: 5, strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 7, fill: '#5FAF6E', strokeWidth: 2, stroke: '#FFFFFF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Procrastination Distribution */}
        <div className="rounded-2xl border border-[#E8F5E8] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-bold text-[#243024]">Phân bổ Procrastination Score</h3>
            <p className="mt-0.5 text-sm text-gray-500">Toàn hệ thống FocusFlow</p>
          </div>
          {loading ? (
            <SkeletonLoader variant="chart" className="h-[260px]" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={procrastinationDistribution}
                layout="vertical"
                margin={{ top: 10, right: 40, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F5E8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#5F6E5F' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="level"
                  tick={{ fontSize: 12, fill: '#5F6E5F' }}
                  axisLine={false}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E8F5E8',
                    fontSize: '13px',
                  }}
                  cursor={{ fill: '#F4FAF4' }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={40}>
                  {procrastinationDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: '13px', fontWeight: 700, fill: '#243024' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-[#E8F5E8] bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-bold text-[#243024]">Hoạt động hệ thống gần đây</h3>
          <p className="mt-0.5 text-sm text-gray-500">Nhật ký sự kiện trong 24 giờ qua</p>
        </div>
        {activitiesLoading ? (
          <SkeletonLoader variant="text" lines={5} />
        ) : recentActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Activity className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Chưa có hoạt động nào trong 24 giờ qua</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((event) => {
              const cfg = activityConfig[event.type] || activityConfig.config;
              const Icon = cfg.icon;
              return (
                <div key={event.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-[#F4FAF4] transition-colors">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${cfg.color}`}>
                    <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#243024]">{event.message}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{event.timestamp}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  badge?: React.ReactNode;
  trend?: { value: string; positive: boolean };
}

function StatCard({ label, value, icon, iconBg, badge, trend }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[#E8F5E8] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold ${trend.positive ? 'text-[#5FAF6E]' : 'text-red-600'
              }`}
          >
            {trend.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trend.value}
          </div>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500">{label}</p>
      <div className="mt-1 flex items-center gap-3">
        <p className="text-3xl font-extrabold text-[#243024] tabular-nums">{value}</p>
        {badge}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
