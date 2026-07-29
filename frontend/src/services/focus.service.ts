// import api from './api'

// export interface PomodoroSession {
//   id: string
//   taskId: string | null
//   subtaskId: string | null
//   scheduleSlotId: string | null
//   status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
//   sessionType: 'WORK' | 'BREAK'
//   startedAt: string
//   lastResumedAt: string | null
//   plannedDuration: number
//   accumulatedActiveSeconds: number
//   remainingSeconds: number
//   task: {
//     id: string
//     title: string
//   } | null
//   subtask: {
//     id: string
//     title: string
//   } | null
// }

// export interface PomodoroResponse {
//   session: PomodoroSession
//   progress: PomodoroProgress | null
// }



// export type DropReason = 'tired' | 'too_hard' | 'interrupted' | 'distracted'

// const focusService = {
//   /** Bắt đầu phiên Pomodoro mới cho task */
//   async startSession(
//     taskId: string,
//     subtaskId?: string | null,
//     scheduleSlotId?: string | null,
//   ): Promise<PomodoroResponse> {
//     const { data } = await api.post<PomodoroResponse>('/pomodoro/sessions', {
//       taskId,
//       subtaskId: subtaskId || undefined,
//       scheduleSlotId: scheduleSlotId || undefined,
//       sessionType: 'WORK',
//     })
//     return data
//   },

//   /** Lấy phiên đang hoạt động (để khôi phục khi reload trang) */
//   async getCurrentSession(): Promise<PomodoroResponse | null> {
//     try {
//       const { data } = await api.get<PomodoroResponse>('/pomodoro/sessions/current')
//       if (!data) return null
//       return data
//     } catch {
//       return null
//     }
//   },

//   /** Tạm dừng phiên đang chạy */
//   async pauseSession(sessionId: string): Promise<void> {
//     await api.patch(`/pomodoro/sessions/${sessionId}/pause`)
//   },

//   /** Tiếp tục phiên đang tạm dừng */
//   async resumeSession(sessionId: string): Promise<void> {
//     await api.patch(`/pomodoro/sessions/${sessionId}/resume`)
//   },

//   /** Huỷ phiên — bắt buộc truyền lý do drop */
//   async cancelSession(sessionId: string, dropReason: DropReason): Promise<void> {
//     await api.patch(`/pomodoro/sessions/${sessionId}/cancel`, { dropReason })
//   },

//   /** Đánh dấu hoàn thành phiên Pomodoro */
//   async completeSession(sessionId: string): Promise<void> {
//     await api.patch(`/pomodoro/sessions/${sessionId}/complete`)
//   },

//   /** Gửi lý do bỏ ngang (khảo sát nhanh 3 giây) */
//   async sendQuickFeedback(sessionId: string, reason: DropReason): Promise<void> {
//     await api.post(`/pomodoro/sessions/${sessionId}/quick-feedback`, { reason })
//   },
// }

// export default focusService


import api from './api'

export type PomodoroStatus =
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'

export type PomodoroSessionType =
  | 'WORK'
  | 'BREAK'

export type DropReason =
  | 'Mệt'
  | 'Task quá khó'
  | 'Bị cắt ngang'
  | 'Bị phân tâm'
  | 'Không còn phù hợp'
  | 'Khác'

export interface FocusUnit {
  id: string
  type: 'TASK' | 'SUBTASK'

  taskId: string
  subtaskId: string | null

  taskTitle: string
  title: string

  importance: 'HIGH' | 'LOW'
  priorityScore: number
  focusMode: 'STANDARD' | 'DEEP_FOCUS'

  estimatedMinutes: number
  completedMinutes: number
  remainingMinutes: number
  progressPercent: number

  workDurationMinutes: number
  totalSessions: number
  completedSessions: number
  remainingSessions: number

  scheduleSlotId: string | null
  scheduledStartAt: string | null
  scheduledEndAt: string | null
}

export interface PomodoroSession {
  id: string
  taskId: string | null
  subtaskId: string | null
  scheduleSlotId: string | null

  status: PomodoroStatus
  sessionType: PomodoroSessionType

  startedAt: string
  lastResumedAt: string | null
  pausedAt: string | null
  endedAt: string | null

  plannedDuration: number
  actualDuration: number | null

  accumulatedActiveSeconds: number
  activeElapsedSeconds: number
  remainingSeconds: number

  task: {
    id: string
    title: string
    focusMode: 'STANDARD' | 'DEEP_FOCUS'
    status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  } | null

  subtask: {
    id: string
    title: string
    estimatedMinutes: number | null
    isCompleted: boolean
  } | null
}

export interface PomodoroProgressUnit {
  type: 'TASK' | 'SUBTASK'
  id: string
  title: string
  estimatedMinutes: number
  completedMinutes: number
  remainingMinutes: number
  progressPercent: number
  isCompleted: boolean
  estimateMet: boolean
}

export interface PomodoroProgress {
  task: {
    id: string
    title: string
    estimatedMinutes: number
    completedMinutes: number
    remainingMinutes: number
    progressPercent: number
    status: 'TODO' | 'IN_PROGRESS' | 'DONE'
    isCompleted: boolean
    estimateMet: boolean
  }
  unit: PomodoroProgressUnit | null
}

export interface SessionResponse {
  session: PomodoroSession
  progress: PomodoroProgress | null
  nextAction?: string
}

const focusService = {
  async getUnits(): Promise<FocusUnit[]> {
    const { data } = await api.get<FocusUnit[]>(
      '/pomodoro/units',
    )

    return data
  },

  async startSession(
    taskId: string,
    subtaskId?: string | null,
    scheduleSlotId?: string | null,
  ): Promise<SessionResponse> {
    const { data } = await api.post<SessionResponse>(
      '/pomodoro/sessions',
      {
        taskId,
        subtaskId: subtaskId || undefined,
        scheduleSlotId:
          scheduleSlotId || undefined,
        sessionType: 'WORK',
      },
    )

    return data
  },

  async getCurrentSession():
    Promise<SessionResponse | null> {
    const { data } =
      await api.get<SessionResponse | null>(
        '/pomodoro/sessions/current',
      )

    return data
  },

  async pauseSession(
    sessionId: string,
  ): Promise<SessionResponse> {
    const { data } =
      await api.patch<SessionResponse>(
        `/pomodoro/sessions/${sessionId}/pause`,
      )

    return data
  },

  async resumeSession(
    sessionId: string,
  ): Promise<SessionResponse> {
    const { data } =
      await api.patch<SessionResponse>(
        `/pomodoro/sessions/${sessionId}/resume`,
      )

    return data
  },

  async completeSession(
    sessionId: string,
  ): Promise<SessionResponse> {
    const { data } =
      await api.patch<SessionResponse>(
        `/pomodoro/sessions/${sessionId}/complete`,
      )

    return data
  },

  async cancelSession(
    sessionId: string,
    reason: DropReason,
    details?: string,
  ): Promise<SessionResponse> {
    const { data } =
      await api.patch<SessionResponse>(
        `/pomodoro/sessions/${sessionId}/cancel`,
        {
          reason,
          details,
        },
      )

    return data
  },

  async sendQuickFeedback(
    sessionId: string,
    reason: DropReason,
    details?: string,
  ): Promise<void> {
    await api.post(
      `/pomodoro/sessions/${sessionId}/quick-feedback`,
      {
        reason,
        details,
      },
    )
  },
}

export default focusService