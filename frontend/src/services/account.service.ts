import api from './api'
import type { ActivityEvent, ActivityType } from '../types'

export interface ProcrastinationScoreData {
  score: number
  classification: 'Tốt' | 'Trung bình' | 'Cần can thiệp'
  breakdown: {
    delayRate: number
    deadlineMissRate: number
    taskIdleDays: number
    rescheduleFrequency: number
    timeDurationAccuracy: number
  }
  comparedToLastWeek: number
}

// Map activity từ API response sang ActivityEvent type nội bộ
function mapActivity(raw: any): ActivityEvent {
  // Suy ra ActivityType từ loại event API
  let type: ActivityType = 'task'
  const t: string = raw.type ?? ''
  if (t.includes('pomodoro')) type = 'pomodoro'
  else if (t.includes('schedule')) type = 'schedule'
  else if (t.includes('ai')) type = 'ai'

  return {
    id: String(raw.id),
    type,
    title: raw.title ?? '',
    description: raw.description ?? raw.title ?? '',
    relativeTime: formatRelativeTime(raw.occurredAt ?? raw.createdAt),
  }
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

const accountService = {
  /** Lấy Procrastination Score theo ngày */
  async getProcrastinationScore(date: string): Promise<ProcrastinationScoreData> {
    const { data } = await api.get<ProcrastinationScoreData>('/analytics/procrastination-score', {
      params: { date },
    })
    return data
  },

  /** Lấy activity logs, hỗ trợ lọc theo type */
  async getActivityLogs(type: 'all' | ActivityType = 'all'): Promise<ActivityEvent[]> {
    const { data } = await api.get<{ items: any[]; nextCursor?: string }>('/account/activity-log', {
      params: { type: type === 'all' ? undefined : type },
    })
    return (data.items ?? []).map(mapActivity)
  },

  /** Lấy thông tin profile của user hiện tại */
  async getProfile(): Promise<{ id: string; email: string; displayName: string; role: string }> {
    const { data } = await api.get<any>('/account/me')
    return data
  },

  /** Cập nhật thông tin hồ sơ (displayName) */
  async updateProfile(payload: { displayName: string }): Promise<void> {
    await api.put('/account/me', { displayName: payload.displayName })
  },

  /** Đổi mật khẩu */
  async changePassword(payload: { current: string; next: string }): Promise<void> {
    await api.put('/account/password', {
      current: payload.current,
      next: payload.next,
    })
  },
}

export default accountService
