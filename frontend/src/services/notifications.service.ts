import api from './api'

export interface NotificationItem {
  id: string
  category: 'pomodoro' | 'schedule' | 'ai_insights' | 'productivity'
  title: string
  description: string
  time: string
  timeGroup: 'today' | 'yesterday' | 'week'
  read: boolean
  actionType?: 'start_pomodoro' | 'view_details'
}

const notificationsService = {
  /** Lấy danh sách thông báo */
  async getNotifications(): Promise<NotificationItem[]> {
    const { data } = await api.get<NotificationItem[]>('/notifications')
    return data
  },

  /** Đánh dấu một thông báo là đã đọc */
  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },

  /** Đánh dấu tất cả là đã đọc */
  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/read-all')
  },
}

export default notificationsService
