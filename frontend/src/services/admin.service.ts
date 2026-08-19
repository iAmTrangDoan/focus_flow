import api from './api';

export interface AdminDashboardData {
  tasksCreatedToday: number;
  totalUsers: number;
  avgProcrastinationScore: number | null;
}

export interface RecentActivity {
  id: string;
  type: 'signup' | 'block' | 'config' | 'error';
  message: string;
  timestamp: string;
  rawTimestamp: string;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  procrScore?: number;
  avatar?: string;
  tasksCreated?: number;
  pomodoroCompleted?: number;
  pomodoroAbandoned?: number;
  weeklyScores?: { week: string; score: number }[];
}

export interface AdminUserDetail extends AdminUserListItem {
  timezone?: string;
  updatedAt?: string;
  _count?: {
    tasks: number;
    pomodoroSessions: number;
  };
}

export interface SystemConfigItem {
  id?: string;
  key: string;
  value: string;
  description?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type SystemLogCategory = 'API' | 'SCHEDULER' | 'ANALYTICS' | 'CRON' | 'AI' | 'ADMIN';
export type SystemLogStatus = 'STARTED' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface SystemLogItem {
  id: string;
  category: SystemLogCategory;
  eventType: string;
  status: SystemLogStatus;
  userId?: string;
  adminId?: string;
  source?: string;
  message?: string;
  metadata?: Record<string, any>;
  durationMs?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface GetSystemLogsParams {
  status?: SystemLogStatus;
  category?: SystemLogCategory;
  eventType?: string;
  search?: string;
  limit?: number;
}

const adminService = {
  /** Lấy chỉ số tổng quan hệ thống */
  async getDashboard(): Promise<AdminDashboardData> {
    const { data } = await api.get<AdminDashboardData>('/admin/dashboard');
    return data;
  },

  /** Lấy danh sách hoạt động hệ thống gần đây */
  async getRecentActivities(): Promise<RecentActivity[]> {
    const { data } = await api.get<RecentActivity[]>('/admin/recent-activities');
    return data;
  },

  /** Lấy danh sách toàn bộ người dùng */
  async getUsers(): Promise<AdminUserListItem[]> {
    const { data } = await api.get<AdminUserListItem[]>('/admin/users');
    return data;
  },

  /** Xem chi tiết 1 người dùng theo ID */
  async getUserDetail(id: string): Promise<AdminUserDetail> {
    const { data } = await api.get<AdminUserDetail>(`/admin/users/${id}`);
    return data;
  },

  /** Khóa hoặc mở khóa tài khoản người dùng */
  async toggleUserActive(id: string): Promise<{ id: string; email: string; isActive: boolean }> {
    const { data } = await api.patch<{ id: string; email: string; isActive: boolean }>(
      `/admin/users/${id}/toggle-active`,
    );
    return data;
  },

  /** Lấy cấu hình hệ thống & trọng số thuật toán */
  async getConfigs(): Promise<SystemConfigItem[]> {
    const { data } = await api.get<SystemConfigItem[]>('/admin/configs');
    return data;
  },

  /** Cập nhật mảng cấu hình hệ thống */
  async updateConfigs(configs: { key: string; value: string }[]): Promise<SystemConfigItem[]> {
    const { data } = await api.patch<SystemConfigItem[]>('/admin/configs', { configs });
    return data;
  },

  /** Nhật ký hệ thống — lấy từ DB thật */
  async getSystemLogs(params?: GetSystemLogsParams): Promise<SystemLogItem[]> {
    const { data } = await api.get<SystemLogItem[]>('/admin/system-logs', {
      params: {
        ...(params?.status && { status: params.status }),
        ...(params?.category && { category: params.category }),
        ...(params?.eventType && { eventType: params.eventType }),
        ...(params?.search && { search: params.search }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },
};

export default adminService;

