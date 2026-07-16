import api from './api'

export interface StartSessionResponse {
  sessionId: string
  startedAt: string
  durationMinutes: number
}

export type DropReason = 'tired' | 'too_hard' | 'interrupted' | 'distracted'

const focusService = {
  /** Bắt đầu phiên Pomodoro cho task */
  async startSession(taskId: string): Promise<StartSessionResponse> {
    const { data } = await api.post<StartSessionResponse>('/focus-sessions/start', { taskId })
    return data
  },

  /** Tạm dừng phiên đang chạy */
  async pauseSession(sessionId: string): Promise<void> {
    await api.post(`/focus-sessions/${sessionId}/pause`)
  },

  /** Tiếp tục phiên đang tạm dừng */
  async resumeSession(sessionId: string): Promise<void> {
    await api.post(`/focus-sessions/${sessionId}/resume`)
  },

  /** Huỷ phiên — bắt buộc truyền lý do drop */
  async cancelSession(sessionId: string, dropReason: DropReason): Promise<void> {
    await api.post(`/focus-sessions/${sessionId}/cancel`, { dropReason })
  },

  /** Đánh dấu hoàn thành phiên Pomodoro */
  async completeSession(sessionId: string): Promise<void> {
    await api.post(`/focus-sessions/${sessionId}/complete`)
  },
}

export default focusService
