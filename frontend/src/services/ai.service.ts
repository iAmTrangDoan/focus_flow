import api from './api'

export interface AiInsight {
  id: string
  weekStartDate: string
  status: 'PENDING' | 'GENERATED' | 'FAILED'
  isActionable: boolean
  content: {
    summary?: string
    strengths?: string[]
    concerns?: string[]
    actionableSuggestions?: {
      content: string
      actionType: 'reprioritize_morning' | 'reprioritize_evening' | 'shorten_tasks' | 'adjust_reminder' | 'none'
    }[]
  }
  inputSummary?: any
  createdAt: string
}

export interface WeekOption {
  weekStartDate: string
  label: string
  status: string
}

export interface SuggestedSubtask {
  title: string
  aiEstimatedMinutes: number
  estimatedMinutes: number
}

const aiService = {
  /** Lấy danh sách AI insights (lọc theo tuần nếu truyền weekStartDate) */
  async getInsights(weekStartDate?: string): Promise<AiInsight[]> {
    const { data } = await api.get<AiInsight[]>('/ai', {
      params: weekStartDate ? { weekStartDate } : {},
    })
    return data
  },

  /** Lấy danh sách các tuần đã có insight (dùng cho dropdown chọn tuần) */
  async getAvailableWeeks(): Promise<WeekOption[]> {
    const { data } = await api.get<WeekOption[]>('/ai/weeks')
    return data
  },

  /** Tạo AI Insight cho tuần trước (idempotent, không nhận tham số) */
  async generateInsight(weekStartDate?: string, force = false): Promise<AiInsight> {
    const { data } = await api.post<AiInsight>('/ai/generate', { weekStartDate, force })
    return data
  },

  async suggestSubtasks(taskTitle: string, deadline?: string, importance?: string): Promise<SuggestedSubtask[]> {
    const { data } = await api.post<{ subtasks: SuggestedSubtask[] }>('/ai/suggest-subtasks', {
      taskTitle,
      deadline,
      importance,
    })
    return data.subtasks || []
  },
}

export default aiService
