import api from './api'
import type { Task, Subtask, Importance, TaskType, TaskStatus } from '../types'

export interface CreateTaskPayload {
  title: string
  type: TaskType
  importance: Importance
  deadline?: string
  fixedStart?: string
  fixedEnd?: string
  subtasks: { title: string; aiEstimatedMinutes: number }[]
}

export interface UpdateTaskPayload {
  title?: string
  type?: TaskType
  importance?: Importance
  status?: TaskStatus
  deadline?: string
  fixedStart?: string
  fixedEnd?: string
  subtasks?: Subtask[]
}

// Map trạng thái từ API (dấu gạch ngang) sang type nội bộ (gạch dưới)
function mapStatus(apiStatus: string): TaskStatus {
  switch (apiStatus) {
    case 'in-progress': return 'in_progress'
    case 'completed': return 'done'
    case 'todo': return 'todo'
    default: return apiStatus as TaskStatus
  }
}

// Map status nội bộ sang format API
function toApiStatus(status: TaskStatus): string {
  switch (status) {
    case 'in_progress': return 'in-progress'
    case 'done': return 'completed'
    default: return status
  }
}

// Map task từ API response sang Task type nội bộ
function mapTaskFromApi(raw: any): Task {
  return {
    id: String(raw.id),
    title: raw.title,
    type: raw.isFixedTask ? 'fixed' : 'flexible',
    importance: raw.importance ?? 'LOW',
    status: mapStatus(raw.status),
    priorityScore: raw.priorityScore ?? 50,
    deadline: raw.deadline ?? undefined,
    fixedTime: raw.fixedStart && raw.fixedEnd
      ? `${raw.fixedStart}–${raw.fixedEnd}`
      : undefined,
    subtasks: (raw.subtasks ?? []).map((s: any) => ({
      id: String(s.id),
      title: s.title,
      done: s.completed ?? s.done ?? false,
      estimatedMinutes: s.aiEstimatedMinutes ?? s.estimatedMinutes ?? 15,
    })),
  }
}

const tasksService = {
  /** Lấy danh sách task */
  async getTasks(params?: { status?: string; sort?: string; isFixedTask?: boolean }): Promise<Task[]> {
    const { data } = await api.get<any[]>('/tasks', { params })
    return data.map(mapTaskFromApi)
  },

  /** Tạo task mới */
  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const body = {
      title: payload.title,
      isFixedTask: payload.type === 'fixed',
      importance: payload.importance,
      deadline: payload.type === 'flexible' ? payload.deadline : undefined,
      fixedStart: payload.fixedStart,
      fixedEnd: payload.fixedEnd,
      subtasks: payload.subtasks,
    }
    const { data } = await api.post<any>('/tasks', body)
    return mapTaskFromApi(data)
  },

  /** Cập nhật task */
  async updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const body: any = { ...payload }
    if (payload.status) body.status = toApiStatus(payload.status)
    if (payload.type !== undefined) {
      body.isFixedTask = payload.type === 'fixed'
      delete body.type
    }
    if (payload.subtasks) {
      body.subtasks = payload.subtasks.map(s => ({
        id: s.id,
        title: s.title,
        completed: s.done,
        estimatedMinutes: s.estimatedMinutes ?? 15,
      }))
    }
    const { data } = await api.put<any>(`/tasks/${id}`, body)
    return mapTaskFromApi(data)
  },

  /** Xoá task */
  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`)
  },

  /** Nhanh cập nhật status task */
  async patchStatus(id: string, status: TaskStatus): Promise<Task> {
    const { data } = await api.patch<any>(`/tasks/${id}/status`, { status: toApiStatus(status) })
    return mapTaskFromApi(data)
  },

  /** Gọi AI gợi ý phân rã subtask */
  async getAiSuggestedSubtasks(title: string): Promise<{ title: string; aiEstimatedMinutes: number }[]> {
    const { data } = await api.post<{ subtasks: { title: string; aiEstimatedMinutes: number }[] }>(
      '/tasks/ai-suggest-subtasks',
      { title }
    )
    return data.subtasks
  },
}

export default tasksService
