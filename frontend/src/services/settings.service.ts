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

export interface GeminiStatus {
  connected: boolean
  maskedKey: string | null
}

export interface GeminiTestSaveResult {
  connected: boolean
  maskedKey: string
  message: string
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

  // ─── GEMINI AI KEY ──────────────────────────────────────────

  /** Lấy trạng thái kết nối Gemini AI */
  async getGeminiStatus(): Promise<GeminiStatus> {
    const { data } = await api.get<GeminiStatus>('/preferences/gemini-status')
    return data
  },

  /**
   * Kiểm tra Gemini API key và lưu nếu hợp lệ.
   * @throws AxiosError với status 401 nếu key không hợp lệ
   */
  async testAndSaveGeminiKey(apiKey: string): Promise<GeminiTestSaveResult> {
    const { data } = await api.post<GeminiTestSaveResult>(
      '/preferences/gemini-key/test-save',
      { apiKey },
    )
    return data
  },

  /** Gỡ bỏ Gemini API key của user */
  async revokeGeminiKey(): Promise<void> {
    await api.delete('/preferences/gemini-key')
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
