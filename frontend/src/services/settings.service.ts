import api from './api'

export interface UserPreferences {
  userId: string
  workStartTime: string
  workEndTime: string
  workDays: number[]
  mainGoal: string
}

export interface UpdatePreferencesPayload {
  workStartTime?: string
  workEndTime?: string
  workDays?: number[]
  mainGoal?: string
}

export interface SystemConfig {
  key: string
  value: string
  description?: string
}

const settingsService = {
  // ─── USER PREFERENCES ──────────────────────────────────────

  /** Lấy preferences của user hiện tại */
  async getPreferences(): Promise<UserPreferences> {
    const { data } = await api.get<UserPreferences>('/preferences')
    return data
  },

  /** Cập nhật preferences */
  async updatePreferences(payload: UpdatePreferencesPayload): Promise<UserPreferences> {
    const { data } = await api.put<UserPreferences>('/preferences', payload)
    return data
  },

  // ─── ADMIN CONFIGS ──────────────────────────────────────────

  /** Lấy toàn bộ cấu hình hệ thống (chỉ admin) */
  async getSystemConfigs(): Promise<SystemConfig[]> {
    const { data } = await api.get<SystemConfig[]>('/admin/configs')
    return data
  },

  /** Cập nhật cấu hình trọng số (chỉ admin) */
  async updateSystemConfigs(configs: { key: string; value: string }[]): Promise<SystemConfig[]> {
    const { data } = await api.patch<SystemConfig[]>('/admin/configs', { configs })
    return data
  },
}

export default settingsService
