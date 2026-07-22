import api from './api'

export interface StartSessionResponse {
  sessionId: string
  startedAt: string
  durationMinutes: number
  status: string
}

export type DropReason = 'tired' | 'too_hard' | 'interrupted' | 'distracted'

const focusService = {
  /** Bắt đầu phiên Pomodoro mới cho task */
  async startSession(taskId: string): Promise<StartSessionResponse> {
    const { data } = await api.post<any>('/pomodoro/sessions', { taskId, sessionType: 'WORK' })
    return {
      sessionId: data.id,
      startedAt: data.startedAt,
      durationMinutes: data.plannedDuration ?? 25,
      status: data.status,
    }
  },

  /** Lấy phiên đang hoạt động (để khôi phục khi reload trang) */
  async getCurrentSession(): Promise<StartSessionResponse | null> {
    try {
      const { data } = await api.get<any>('/pomodoro/sessions/current')
      if (!data) return null
      return {
        sessionId: data.id,
        startedAt: data.startedAt,
        durationMinutes: data.plannedDuration ?? 25,
        status: data.status,
      }
    } catch {
      return null
    }
  },

  /** Tạm dừng phiên đang chạy */
  async pauseSession(sessionId: string): Promise<void> {
    await api.patch(`/pomodoro/sessions/${sessionId}/pause`)
  },

  /** Tiếp tục phiên đang tạm dừng */
  async resumeSession(sessionId: string): Promise<void> {
    await api.patch(`/pomodoro/sessions/${sessionId}/resume`)
  },

  /** Huỷ phiên — bắt buộc truyền lý do drop */
  async cancelSession(sessionId: string, dropReason: DropReason): Promise<void> {
    await api.patch(`/pomodoro/sessions/${sessionId}/cancel`, { dropReason })
  },

  /** Đánh dấu hoàn thành phiên Pomodoro */
  async completeSession(sessionId: string): Promise<void> {
    await api.patch(`/pomodoro/sessions/${sessionId}/complete`)
  },

  /** Gửi lý do bỏ ngang (khảo sát nhanh 3 giây) */
  async sendQuickFeedback(sessionId: string, reason: DropReason): Promise<void> {
    await api.post(`/pomodoro/sessions/${sessionId}/quick-feedback`, { reason })
  },
}

export default focusService
