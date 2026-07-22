import api from './api'

export interface ScheduleSlot {
  id: string
  taskId: string
  taskTitle: string
  taskPriority: 'HIGH' | 'LOW'
  taskType: 'fixed' | 'flexible'
  startAt: string
  endAt: string
  status: 'SCHEDULED' | 'FROZEN_OVERDUE' | 'COMPLETED'
  isManual: boolean
}

export interface WeeklySchedule {
  slots: ScheduleSlot[]
  weekStart: string
  weekEnd: string
}

const schedulerService = {
  /** Lấy lịch tuần hiện tại */
  async getWeeklySchedule(): Promise<WeeklySchedule> {
    const { data } = await api.get<WeeklySchedule>('/schedule/weekly')
    return data
  },

  /** Lấy slots theo khoảng ngày */
  async getSlots(from: string, to: string): Promise<ScheduleSlot[]> {
    const { data } = await api.get<ScheduleSlot[]>('/schedule/slots', {
      params: { from, to },
    })
    return data
  },

  /** Tạo lịch tuần tự động (Greedy Scheduling) */
  async generateWeekly(): Promise<{ message: string; slotsCreated: number }> {
    const { data } = await api.post<{ message: string; slotsCreated: number }>('/schedule/generate')
    return data
  },

  /** Cập nhật thời gian slot (kéo thả) */
  async updateSlot(slotId: string, startAt: string, endAt: string): Promise<ScheduleSlot> {
    const { data } = await api.patch<ScheduleSlot>(`/schedule/slots/${slotId}`, {
      startAt,
      endAt,
    })
    return data
  },

  /** Xóa slot khỏi lịch */
  async removeSlot(slotId: string): Promise<void> {
    await api.delete(`/schedule/slots/${slotId}`)
  },

  /** Tái cấu trúc lịch từ thời điểm hiện tại (cộng +1 Reschedule Penalty) */
  async restructure(): Promise<{ message: string; slotsUpdated: number }> {
    const { data } = await api.post<{ message: string; slotsUpdated: number }>('/schedule/restructure')
    return data
  },
}

export default schedulerService
