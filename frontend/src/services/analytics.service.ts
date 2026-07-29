import api from './api'

export interface ProcrastinationScoreData {
  score: number
  classification: 'Tốt' | 'Trung bình' | 'Cần can thiệp'
  breakdown: {
    delayRate: number
    deadlineMissRate: number
    taskIdleDays: number
    rescheduleFrequency: number
    timeDurationAccuracy: number
  }
  calculatedDate: string
}

export interface CompletionRateDay {
  day: string
  date: string
  rate: number
  completed: number
  total: number
}

export interface WeeklyProductivity {
  week: string
  completed: number
  total: number
}

export interface HeatmapCell {
  day: string
  hour: number
  value: number
}

export interface OverdueSummary {
  current: {
    frozenSlotCount: number
    overdueTaskCount: number
  }
  last14Days: {
    delayedSlotCount: number
    deadlineMissCount: number
    averageSlotDelayMinutes: number
  }
  latestProcrastinationScore: ProcrastinationScoreData | null
  generatedAt: string
}

const analyticsService = {
  
  /** Lấy Procrastination Score theo ngày */
  async getProcrastinationScore(date?: string): Promise<ProcrastinationScoreData> {
    const target = date ?? new Date().toISOString().split('T')[0]
    const { data } = await api.get<ProcrastinationScoreData>('/analytics/procrastination-score', {
      params: { date: target },
    })
    return data
  },

  /** Tổng hợp slot trễ, task quá hạn và dữ liệu 14 ngày gần nhất */
  async getOverdueSummary(): Promise<OverdueSummary> {
    const { data } = await api.get<OverdueSummary>('/analytics/overdue-summary')
    return data
  },

  /** Thống kê tỷ lệ hoàn thành task theo ngày trong khoảng thời gian */
  async getCompletionRate(range: 'this_week' | 'last_week' | 'this_month' = 'this_week'): Promise<CompletionRateDay[]> {
    const { data } = await api.get<CompletionRateDay[]>('/analytics/completion-rate', {
      params: { range },
    })
    return data
  },

  /** Thống kê năng suất theo tuần (5 tuần gần nhất) */
  async getWeeklyProductivity(): Promise<WeeklyProductivity[]> {
    const { data } = await api.get<WeeklyProductivity[]>('/analytics/weekly-productivity')
    return data
  },

  /** Heatmap mật độ tập trung theo giờ × thứ trong tuần */
  async getHeatmap(): Promise<HeatmapCell[]> {
    const { data } = await api.get<HeatmapCell[]>('/analytics/heatmap')
    return data
  },
}

export default analyticsService
