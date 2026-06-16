export type Priority = 'high' | 'medium' | 'low'
export type Status = 'todo' | 'in-progress' | 'completed' | 'delayed'

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  status: Status
  dueDate: string
  estimatedTime: number // in minutes
  project: string
  tags: string[]
  subtasks: Subtask[]
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface TimeBlock {
  id: string
  startTime: string
  endTime: string
  taskId: string
  title: string
}

export interface FocusSession {
  id: string
  taskId: string
  duration: number // in minutes
  focusLevel: number // 1-5
  distractions: string[]
  startTime: string
  endTime: string
}

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Viết chương 2 báo cáo luận văn',
    description: 'Hoàn thành phần lý thuyết về quản lý thời gian và phân tích hành vi trì hoãn',
    priority: 'high',
    status: 'in-progress',
    dueDate: '2024-06-15',
    estimatedTime: 480,
    project: 'Luận văn tốt nghiệp',
    tags: ['writing', 'research'],
    subtasks: [
      { id: 's1', title: 'Tìm hiểu tài liệu tham khảo', completed: true },
      { id: 's2', title: 'Viết phần giới thiệu', completed: true },
      { id: 's3', title: 'Viết các đoạn nội dung chính', completed: false },
      { id: 's4', title: 'Kiểm tra và chỉnh sửa', completed: false },
    ],
  },
  {
    id: '2',
    title: 'Vẽ sơ đồ use case tổng quát',
    description: 'Thiết kế các use case chính cho hệ thống FocusFlow',
    priority: 'high',
    status: 'todo',
    dueDate: '2024-06-10',
    estimatedTime: 240,
    project: 'Luận văn tốt nghiệp',
    tags: ['design', 'architecture'],
    subtasks: [
      { id: 's5', title: 'Xác định các actor chính', completed: false },
      { id: 's6', title: 'Liệt kê các use case', completed: false },
      { id: 's7', title: 'Vẽ sơ đồ', completed: false },
    ],
  },
  {
    id: '3',
    title: 'Thiết kế database FocusFlow',
    description: 'Tạo schema và mối quan hệ giữa các bảng',
    priority: 'high',
    status: 'in-progress',
    dueDate: '2024-06-12',
    estimatedTime: 300,
    project: 'Luận văn tốt nghiệp',
    tags: ['database', 'backend'],
    subtasks: [
      { id: 's8', title: 'Xác định các entity', completed: true },
      { id: 's9', title: 'Vẽ ER diagram', completed: false },
      { id: 's10', title: 'Tạo SQL schema', completed: false },
    ],
  },
  {
    id: '4',
    title: 'Hoàn thiện giao diện dashboard',
    description: 'Cải thiện UX/UI cho trang dashboard chính',
    priority: 'medium',
    status: 'todo',
    dueDate: '2024-06-20',
    estimatedTime: 360,
    project: 'Luận văn tốt nghiệp',
    tags: ['frontend', 'ui'],
    subtasks: [
      { id: 's11', title: 'Thiết kế mockup', completed: true },
      { id: 's12', title: 'Code components', completed: false },
      { id: 's13', title: 'Responsive design', completed: false },
    ],
  },
  {
    id: '5',
    title: 'Chuẩn bị slide báo cáo tiến độ',
    description: 'Tạo slide thuyết trình cho buổi báo cáo giữa kỳ',
    priority: 'medium',
    status: 'todo',
    dueDate: '2024-06-05',
    estimatedTime: 180,
    project: 'Luận văn tốt nghiệp',
    tags: ['presentation'],
    subtasks: [
      { id: 's14', title: 'Thu thập nội dung', completed: false },
      { id: 's15', title: 'Thiết kế layout', completed: false },
    ],
  },
  {
    id: '6',
    title: 'Review code backend',
    description: 'Kiểm tra và review API endpoints',
    priority: 'low',
    status: 'todo',
    dueDate: '2024-06-25',
    estimatedTime: 120,
    project: 'Học tập',
    tags: ['code-review'],
    subtasks: [],
  },
]

export const mockTimeBlocks: TimeBlock[] = [
  {
    id: 'tb1',
    startTime: '09:00',
    endTime: '11:00',
    taskId: '1',
    title: 'Viết chương 2 báo cáo',
  },
  {
    id: 'tb2',
    startTime: '14:00',
    endTime: '16:00',
    taskId: '3',
    title: 'Thiết kế database',
  },
  {
    id: 'tb3',
    startTime: '16:30',
    endTime: '17:30',
    taskId: '4',
    title: 'Dashboard UI',
  },
]

export const mockFocusSessions: FocusSession[] = [
  {
    id: 'fs1',
    taskId: '1',
    duration: 25,
    focusLevel: 5,
    distractions: [],
    startTime: '2024-05-28T09:00:00',
    endTime: '2024-05-28T09:25:00',
  },
  {
    id: 'fs2',
    taskId: '1',
    duration: 25,
    focusLevel: 4,
    distractions: ['Email notification', 'Slack message'],
    startTime: '2024-05-28T09:30:00',
    endTime: '2024-05-28T09:55:00',
  },
  {
    id: 'fs3',
    taskId: '3',
    duration: 25,
    focusLevel: 4,
    distractions: [],
    startTime: '2024-05-28T14:00:00',
    endTime: '2024-05-28T14:25:00',
  },
]

export const mockDailyStats = {
  today: {
    totalTasks: 6,
    completedTasks: 1,
    delayedTasks: 2,
    totalFocusTime: 75, // minutes
  },
  week: [
    { date: '2024-05-22', completed: 3, total: 5 },
    { date: '2024-05-23', completed: 2, total: 4 },
    { date: '2024-05-24', completed: 4, total: 6 },
    { date: '2024-05-25', completed: 5, total: 7 },
    { date: '2024-05-26', completed: 3, total: 5 },
    { date: '2024-05-27', completed: 2, total: 4 },
    { date: '2024-05-28', completed: 1, total: 6 },
  ],
  monthlyProductivity: [
    { date: '2024-05-01', focusTime: 120, tasksCompleted: 4 },
    { date: '2024-05-02', focusTime: 150, tasksCompleted: 5 },
    { date: '2024-05-03', focusTime: 180, tasksCompleted: 6 },
    { date: '2024-05-04', focusTime: 90, tasksCompleted: 3 },
    { date: '2024-05-05', focusTime: 210, tasksCompleted: 7 },
    { date: '2024-05-06', focusTime: 120, tasksCompleted: 4 },
    { date: '2024-05-07', focusTime: 140, tasksCompleted: 5 },
    { date: '2024-05-28', focusTime: 75, tasksCompleted: 1 },
  ],
  hourlyProductivity: [
    { hour: '08:00', tasks: 0, focus: false },
    { hour: '09:00', tasks: 3, focus: true },
    { hour: '10:00', tasks: 2, focus: true },
    { hour: '11:00', tasks: 1, focus: true },
    { hour: '12:00', tasks: 0, focus: false },
    { hour: '13:00', tasks: 0, focus: false },
    { hour: '14:00', tasks: 2, focus: true },
    { hour: '15:00', tasks: 1, focus: true },
    { hour: '16:00', tasks: 1, focus: true },
    { hour: '17:00', tasks: 0, focus: false },
  ],
}

export const mockUserProfile = {
  id: '1',
  name: 'Huyền Trang',
  email: 'huyenT@example.com',
  avatar: 'HT',
  workStartTime: '08:00',
  workEndTime: '22:00',
  workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  pomodoroSettings: {
    focusTime: 25,
    shortBreak: 5,
    longBreak: 15,
  },
}

export const mockProjects = [
  'Luận văn tốt nghiệp',
  'Học tập',
  'Cá nhân',
]

export const mockNotifications = [
  {
    id: '1',
    type: 'due-soon',
    title: 'Task sắp đến hạn',
    message: 'Chuẩn bị slide báo cáo tiến độ sẽ đến hạn trong 1 ngày',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'delayed',
    title: 'Task quá hạn',
    message: 'Vẽ sơ đồ use case tổng quát đã quá hạn 2 ngày',
    timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    read: false,
  },
  {
    id: '3',
    type: 'focus-reminder',
    title: 'Nhắc tập trung',
    message: 'Thời gian tập trung lý tưởng sắp bắt đầu (9:00 - 11:00)',
    timestamp: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
    read: true,
  },
]

export const mockAIInsights = [
  'Bạn thường hoàn thành nhiều task nhất vào 9:00 - 11:00',
  'Task có độ khó cao thường bị trì hoãn 2 lần trước khi hoàn thành',
  'Bạn nên lên lịch các task quan trọng trước buổi chiều',
  'Tỷ lệ hoàn thành tăng 30% khi bạn chia task thành các subtask nhỏ',
  'Bạn có khuynh hướng trì hoãn các task sau 20:00 - hãy chuyển sang buổi sáng',
]
