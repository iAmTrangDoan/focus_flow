// ─── Auth & User ───
export type Role = 'USER' | 'ADMIN'

export interface User {
  id: string
  email: string
  displayName: string | null
  role: Role
  timezone: string
  createdAt: string
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

// ─── Task & Subtask ───
export type Importance = 'HIGH' | 'LOW'
export type TaskType = 'flexible' | 'fixed'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Subtask {
  id: string
  title: string
  done: boolean
  estimatedMinutes?: number
}

export interface Task {
  id: string
  title: string
  type: TaskType
  importance: Importance
  estimatedMinutes?: number
  status: TaskStatus
  priorityScore: number
  deadline?: string
  fixedTime?: string
  subtasks: Subtask[]
}

// ─── Activity ───
export type ActivityType = 'task' | 'pomodoro' | 'schedule' | 'ai'

export interface ActivityEvent {
  id: string
  type: ActivityType
  title: string
  description: string
  relativeTime: string
}

// ─── User Profile (Bolt) ───
export interface UserProfile {
  name: string
  email: string
  avatarUrl: string | null
  streak: number
}

// ─── Schedule ───
export interface TimeBlock {
  id: string
  startTime: string
  endTime: string
  taskId: string
  title: string
}

// ─── Stats ───
export interface DailyStats {
  today: {
    totalTasks: number
    completedTasks: number
    delayedTasks: number
    totalFocusTime: number
  }
  week: { date: string; completed: number; total: number }[]
}
