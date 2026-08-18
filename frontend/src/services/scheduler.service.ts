import api from './api'
import type { Importance } from '../types'

export type UnitType = 'TASK' | 'SUBTASK' | 'REMAINDER'
export type SlotStatus = 'SCHEDULED' | 'FROZEN_OVERDUE' | 'COMPLETED'

export interface ScheduleUnit {
  type: UnitType
  title: string
  taskId: string
  subtaskId: string | null
  /** Tổng thời gian chiếm dụng trên lịch: work + break */
  plannedMinutes: number
}

export interface ScheduleTaskRef {
  id: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  importance: Importance
  focusMode: 'STANDARD' | 'DEEP_FOCUS'
  isFixedTask: boolean
  subtasks: Array<{ id: string }>
}

export interface ScheduleSubtaskRef {
  id: string
  title: string
  estimatedMinutes: number | null
  isCompleted: boolean
  sortOrder: number
}

export interface ScheduleSlot {
  id: string
  userId: string
  taskId: string
  subtaskId: string | null
  startAt: string
  endAt: string
  isManual: boolean
  isCompleted: boolean
  status: SlotStatus
  restructureStrategy: 'NONE' | 'SHIFT_TIME' | 'TRIM_SUBTASKS'
  task: ScheduleTaskRef
  subtask: ScheduleSubtaskRef | null
  unit: ScheduleUnit
}

export interface ScheduleWarning {
  code: string
  message: string
  taskId?: string
  taskTitle?: string
  subtaskId?: string
  subtaskTitle?: string
}

export interface ScheduleOverflow {
  taskId: string
  taskTitle: string
  taskType: 'FIXED' | 'FLEXIBLE'
  requiredMinutes: number
  scheduledMinutes: number
  remainingMinutes: number
  reason: string
}

export interface GenerateScheduleResponse {
  message: string
  timezone: string
  weekStart: string
  weekEnd: string
  energyFit: {
    source: 'POMODORO_HISTORY' | 'COLD_START'
    totalSessions: number
  }
  summary: {
    fixedTasksPinned: number
    flexibleTasksScheduled: number
    newSlotsCreated: number
    overdueTaskCount: number
    overflowTaskCount: number
  }
  slots: ScheduleSlot[]
  overflow: ScheduleOverflow[]
  warnings: ScheduleWarning[]
}

const schedulerService = {
  /** Backend hiện trả trực tiếp mảng slot. */
  async getWeeklySchedule(): Promise<ScheduleSlot[]> {
    const { data } = await api.get<ScheduleSlot[]>('/schedule/weekly')
    return data
  },

  /** Truyền full ISO datetime để tránh hiểu nhầm date-only là UTC 00:00. */
  async getSlots(from: string, to: string): Promise<ScheduleSlot[]> {
    const { data } = await api.get<ScheduleSlot[]>('/schedule/slots', {
      params: { from, to },
    })
    return data
  },

  async generateWeekly(): Promise<GenerateScheduleResponse> {
    const { data } = await api.post<GenerateScheduleResponse>('/schedule/generate')
    return data
  },

  async updateSlot(
    slotId: string,
    startAt: string,
    endAt: string,
  ): Promise<ScheduleSlot> {
    const { data } = await api.patch<ScheduleSlot>(`/schedule/slots/${slotId}`, {
      startAt,
      endAt,
    })
    return data
  },

  async removeSlot(slotId: string): Promise<void> {
    await api.delete(`/schedule/slots/${slotId}`)
  },

  async restructure(): Promise<GenerateScheduleResponse> {
    const { data } = await api.post<GenerateScheduleResponse>('/schedule/restructure')
    return data
  },

  async previewOverdueRestructure(slotId: string): Promise<any> {
    const { data } = await api.post(`/schedule/slots/${slotId}/restructure/preview`, {
      strategy: 'SHIFT_TIME',
    })
    return data
  },

  async confirmOverdueRestructure(slotId: string): Promise<GenerateScheduleResponse> {
    const { data } = await api.post<GenerateScheduleResponse>(`/schedule/slots/${slotId}/restructure/confirm`, {
      strategy: 'SHIFT_TIME',
    })
    return data
  },
}

export default schedulerService
