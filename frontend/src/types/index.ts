// Types
export type Priority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'delayed'
export type Role = 'USER' | 'ADMIN'

export interface User {
  id: string
  email: string
  displayName: string | null
  role: Role
  timezone: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  status: TaskStatus
  dueDate: string
  estimatedTime: number // minutes
  project?: string
  tags?: string[]
}

export interface TimeBlock {
  id: string
  startTime: string
  endTime: string
  taskId: string
  title: string
}

export interface DailyStats {
  today: {
    totalTasks: number
    completedTasks: number
    delayedTasks: number
    totalFocusTime: number
  }
  week: { date: string; completed: number; total: number }[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface ApiError {
  message: string
  statusCode: number
}
