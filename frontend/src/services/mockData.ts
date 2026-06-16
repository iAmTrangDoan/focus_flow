import type { DailyStats, Task, TimeBlock } from '../types'

// ── Mock Tasks ────────────────────────────────────────────────
export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Viết chương 2 báo cáo luận văn',
    description: 'Hoàn thành phần lý thuyết về quản lý thời gian',
    priority: 'high',
    status: 'in-progress',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    estimatedTime: 480,
    project: 'Luận văn',
    tags: ['writing', 'research'],
  },
  {
    id: '2',
    title: 'Vẽ sơ đồ use case tổng quát',
    description: 'Thiết kế các use case chính cho hệ thống FocusFlow',
    priority: 'high',
    status: 'todo',
    dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    estimatedTime: 240,
    project: 'Luận văn',
    tags: ['design'],
  },
  {
    id: '3',
    title: 'Thiết kế database FocusFlow',
    description: 'Tạo schema và mối quan hệ giữa các bảng',
    priority: 'high',
    status: 'in-progress',
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    estimatedTime: 300,
    project: 'Luận văn',
    tags: ['database', 'backend'],
  },
  {
    id: '4',
    title: 'Hoàn thiện giao diện dashboard',
    priority: 'medium',
    status: 'todo',
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    estimatedTime: 360,
    project: 'Luận văn',
    tags: ['frontend'],
  },
  {
    id: '5',
    title: 'Chuẩn bị slide báo cáo tiến độ',
    priority: 'medium',
    status: 'delayed',
    dueDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    estimatedTime: 180,
    project: 'Luận văn',
    tags: ['presentation'],
  },
  {
    id: '6',
    title: 'Review code backend API',
    priority: 'low',
    status: 'completed',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    estimatedTime: 120,
    project: 'Học tập',
    tags: ['code-review'],
  },
]

// ── Mock Time Blocks ──────────────────────────────────────────
export const mockTimeBlocks: TimeBlock[] = [
  { id: 'tb1', startTime: '09:00', endTime: '11:00', taskId: '1', title: 'Viết chương 2 báo cáo' },
  { id: 'tb2', startTime: '14:00', endTime: '16:00', taskId: '3', title: 'Thiết kế database' },
  { id: 'tb3', startTime: '16:30', endTime: '17:30', taskId: '4', title: 'Dashboard UI' },
]

// ── Mock Daily Stats ──────────────────────────────────────────
export const mockDailyStats: DailyStats = {
  today: {
    totalTasks: 6,
    completedTasks: 1,
    delayedTasks: 2,
    totalFocusTime: 75,
  },
  week: [
    { date: '2026-05-24', completed: 3, total: 5 },
    { date: '2026-05-25', completed: 2, total: 4 },
    { date: '2026-05-26', completed: 4, total: 6 },
    { date: '2026-05-27', completed: 5, total: 7 },
    { date: '2026-05-28', completed: 3, total: 5 },
    { date: '2026-05-29', completed: 2, total: 4 },
    { date: '2026-05-30', completed: 1, total: 6 },
  ],
}

// ── Mock AI Insights ──────────────────────────────────────────
export const mockAIInsights: string[] = [
  '💡 Bạn thường hoàn thành nhiều task nhất vào khung 9:00 – 11:00 sáng.',
  '⚠️ Task có độ khó cao thường bị trì hoãn 2 lần trước khi hoàn thành.',
  '📅 Hãy xếp các task quan trọng vào đầu buổi sáng để tối ưu năng lượng.',
  '✅ Tỷ lệ hoàn thành tăng 30% khi bạn chia task thành các subtask nhỏ.',
]
