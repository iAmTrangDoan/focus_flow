import api from './api'
import type { Task, Subtask, Importance, TaskType, TaskStatus } from '../types'

export interface CreateTaskPayload {
  title: string
  type: TaskType
  importance: Importance
  estimatedMinutes?: number;
  deadline?: string
  fixedStart?: string
  fixedEnd?: string
  subtasks: {
    title: string;
    estimatedMinutes: number;
    sortOrder?: number;
  }[]
}

export interface UpdateTaskPayload {
  title?: string
  type?: TaskType
  importance?: Importance
  status?: TaskStatus
  estimatedMinutes?: number;
  deadline?: string
  fixedStart?: string
  fixedEnd?: string
  subtasks?: Subtask[]
}

// Map trạng thái từ API sang type nội bộ 
function mapStatus(apiStatus: string): TaskStatus {
  if (!apiStatus) return 'todo'
  const statusLower = apiStatus.toLowerCase()
  switch (statusLower) {
    case 'in-progress':
    case 'in_progress':
      return 'in_progress'
    case 'completed':
    case 'done':
      return 'done'
    case 'todo':
      return 'todo'
    default:
      return statusLower as TaskStatus
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
    priorityScore: raw.priorityScore ?? 5,
    estimatedMinutes: raw.estimatedMinutes ?? undefined,
    deadline: raw.deadline ?? undefined,
    fixedTime: raw.fixedStart && raw.fixedEnd
      ? `${raw.fixedStart}–${raw.fixedEnd}`
      : undefined,
    notes: raw.notes ?? undefined,
    subtasks: (raw.subtasks ?? []).map((s: any) => ({
      id: String(s.id),
      title: s.title,
      done: s.isCompleted ?? false,
      estimatedMinutes: s.estimatedMinutes ?? 15,
      notes: s.notes ?? undefined,
    })),
  }
}

const tasksService = {
  /** Lấy danh sách task */
  async getTasks(params?: { status?: string; sort?: string; isFixedTask?: boolean }): Promise<Task[]> {
    const { data } = await api.get<any[]>('/tasks', { params })
    return data.map(mapTaskFromApi)
  },

  /** Lấy chi tiết 1 task */
  async getTask(id: string): Promise<Task> {
    const { data } = await api.get<any>(`/tasks/${id}`)
    return mapTaskFromApi(data)
  },

  /** Tạo task mới */
  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const body = {
      title: payload.title,
      isFixedTask: payload.type === 'fixed',
      importance: payload.importance,
      estimatedMinutes: payload.estimatedMinutes,
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
    const body: any = { title: payload.title, importance: payload.importance }

    if (payload.type !== undefined) {
      body.isFixedTask = payload.type === 'fixed';
    }

    if (payload.estimatedMinutes !== undefined) {
      body.estimatedMinutes = payload.estimatedMinutes;
    }

    if (payload.deadline !== undefined) {
      body.deadline = payload.deadline
        ? new Date(payload.deadline).toISOString()
        : undefined;
    }

    if (payload.fixedStart !== undefined) {
      body.fixedStart = payload.fixedStart
        ? new Date(payload.fixedStart).toISOString()
        : undefined;
    }

    if (payload.fixedEnd !== undefined) {
      body.fixedEnd = payload.fixedEnd
        ? new Date(payload.fixedEnd).toISOString()
        : undefined;
    }

    if (payload.subtasks !== undefined) {
      body.subtasks = payload.subtasks
        .filter((subtask) => subtask.title.trim())
        .map((subtask, index) => {
          const isTemporaryId =
            subtask.id.startsWith('new-') ||
            subtask.id.startsWith('ai-') ||
            subtask.id.startsWith('m-');

          return {
            ...(!isTemporaryId && subtask.id ? { id: subtask.id } : {}),
            title: subtask.title.trim(),
            estimatedMinutes: subtask.estimatedMinutes ?? 15,
            isCompleted: subtask.done,
            sortOrder: index,
          };
        });
    }

    const { data } = await api.put<any>(
      `/tasks/${id}`,
      body,
    );

    return mapTaskFromApi(data);
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
  async getAiSuggestedSubtasks(title: string, deadline?: string, importance?: string): Promise<{ title: string; aiEstimatedMinutes: number }[]> {
    const { data } = await api.post<{ subtasks: { title: string; aiEstimatedMinutes: number }[] }>(
      '/ai/suggest-subtasks',
      { taskTitle: title, deadline, importance }
    )
    return data.subtasks || []
  },
}

export default tasksService
