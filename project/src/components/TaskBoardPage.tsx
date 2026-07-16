import { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  ChevronDown,
  Timer,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { CreateTaskDrawer, type NewTaskData } from './CreateTaskDrawer';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { mockTasks, type Task, type TaskStatus, type ToastMessage } from '../mockData';

/* ─── Priority badge config ─── */
const priorityBadge = {
  high: { bg: '#F6D8C7', text: '#C1644C', label: 'High' },
  low: { bg: '#F7E7A8', text: '#B8860B', label: 'Low' },
};

/* ─── Status filter config ─── */
const statusFilters: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'todo', label: 'Chưa bắt đầu' },
  { value: 'in_progress', label: 'Đang thực hiện' },
  { value: 'done', label: 'Hoàn thành' },
];

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  done: 'Hoàn thành',
};

/* ─── Mini Priority Score Ring ─── */
function MiniScoreRing({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? '#C1644C' : score >= 50 ? '#B8860B' : '#4A7FB8';
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: 44, height: 44 }}>
      <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="#E8F5E8" strokeWidth={4} />
        <circle
          cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color: '#243024' }}>{score}</span>
    </div>
  );
}

/* ─── Props ─── */
interface Props {
  onToast: (toast: ToastMessage) => void;
}

export default function TaskBoardPage({ onToast }: Props) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline'>('priority');
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Sort: done tasks at the end
    result = [...result].sort((a, b) => {
      // Done tasks go to end
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;

      // Then sort by criteria
      if (sortBy === 'priority') {
        return b.priorityScore - a.priorityScore;
      } else {
        // Deadline sort - tasks without deadline go to end
        if (!a.deadline && !a.fixedTime) return 1;
        if (!b.deadline && !b.fixedTime) return -1;
        return 0; // Simple string comparison won't work, just keep order
      }
    });

    return result;
  }, [tasks, statusFilter, sortBy]);

  const handleSaveNewTask = useCallback((data: NewTaskData) => {
    const newTask: Task = {
      id: Date.now(),
      title: data.title,
      type: data.type,
      priority: data.priority,
      status: 'todo',
      priorityScore: data.priority === 'high' ? 85 : 45,
      deadline: data.type === 'flexible' ? data.deadline : undefined,
      fixedTime: data.type === 'fixed' && data.date && data.startTime && data.endTime
        ? `${data.date}, ${data.startTime}–${data.endTime}`
        : undefined,
      subtasks: data.subtasks.map((s, i) => ({
        id: `new-${Date.now()}-${i}`,
        title: s.title,
        done: false,
        minutes: s.minutes || 15,
      })),
    };

    setTasks((prev) => [newTask, ...prev]);
    onToast({ id: Date.now(), type: 'success', message: 'Đã tạo công việc thành công' });
  }, [onToast]);

  const handleOpenTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setDetailDrawerOpen(true);
  }, []);

  const handleSaveTask = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    onToast({ id: Date.now(), type: 'success', message: 'Đã lưu thay đổi' });
  }, [onToast]);

  const handleDeleteTask = useCallback((id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    onToast({ id: Date.now(), type: 'success', message: 'Đã xoá công việc' });
  }, [onToast]);

  const toggleStatus = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: TaskStatus = t.status === 'done' ? 'todo' : 'done';
        return { ...t, status: next };
      })
    );
  };

  // Count tasks by status
  const statusCounts = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }), [tasks]);

  return (
    <div className="flex flex-col min-h-full">
      {/* ═══════ HEADER ═══════ */}
      <header className="sticky top-0 z-10 px-6 lg:px-10 py-6" style={{ background: '#F4FAF4', borderBottom: '1px solid #E8F5E8' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>Bảng công việc</h1>
            <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>Sắp xếp theo mức độ ưu tiên</p>
          </div>
          <button
            onClick={() => setCreateDrawerOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
            style={{ background: '#5FAF6E', color: '#fff' }}
          >
            <Plus size={18} /> Tạo công việc mới
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-4 mt-5 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #E8F5E8' }}>
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                style={statusFilter === f.value
                  ? { background: '#DDF3DF', color: '#243024' }
                  : { color: '#5F6E5F' }}
              >
                {f.label}
                <span
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                  style={statusFilter === f.value
                    ? { background: 'rgba(95,175,110,0.2)', color: '#5FAF6E' }
                    : { background: '#F4FAF4', color: '#9CA3AF' }}
                >
                  {statusCounts[f.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: '#FFFFFF', border: '1px solid #E8F5E8', color: '#5F6E5F' }}
            >
              <span>Sắp xếp theo:</span>
              <span className="font-semibold" style={{ color: '#243024' }}>
                {sortBy === 'priority' ? 'Priority Score' : 'Deadline'}
              </span>
              <ChevronDown size={16} style={{ color: '#9CA3AF' }} />
            </button>
            {sortDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSortDropdownOpen(false)}
                />
                <div
                  className="absolute top-full left-0 mt-1 z-20 rounded-xl overflow-hidden shadow-lg"
                  style={{ background: '#FFFFFF', border: '1px solid #E8F5E8', minWidth: 160 }}
                >
                  {[
                    { value: 'priority' as const, label: 'Priority Score' },
                    { value: 'deadline' as const, label: 'Deadline' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-[#F4FAF4]"
                      style={{ color: sortBy === opt.value ? '#5FAF6E' : '#243024', fontWeight: sortBy === opt.value ? 600 : 400 }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══════ TASK LIST ═══════ */}
      <div className="flex-1 px-6 lg:px-10 py-6">
        {filteredTasks.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="flex items-center justify-center rounded-3xl mb-5"
              style={{ width: 80, height: 80, background: '#DDF3DF' }}
            >
              <Inbox size={32} style={{ color: '#5FAF6E' }} />
            </div>
            <p className="text-base font-semibold mb-1" style={{ color: '#243024' }}>Không có công việc nào ở trạng thái này</p>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Hãy tạo công việc mới hoặc đổi bộ lọc</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTasks.map((task) => {
              const p = priorityBadge[task.priority];
              const doneSubtasks = task.subtasks.filter((s) => s.done).length;
              const totalSubtasks = task.subtasks.length;
              const isDone = task.status === 'done';

              return (
                <div
                  key={task.id}
                  onClick={() => handleOpenTask(task)}
                  className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 group"
                  style={{
                    background: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(36,48,36,0.06)',
                    border: '1px solid transparent',
                    opacity: isDone ? 0.65 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(36,48,36,0.12)';
                    e.currentTarget.style.borderColor = '#DDF3DF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(36,48,36,0.06)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleStatus(task.id, e)}
                    className="shrink-0 transition-transform hover:scale-110"
                  >
                    {isDone ? (
                      <CheckCircle2 size={24} style={{ color: '#5FAF6E' }} />
                    ) : (
                      <Circle size={24} style={{ color: '#D1D5DB' }} />
                    )}
                  </button>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="text-base font-semibold"
                        style={{
                          color: isDone ? '#9CA3AF' : '#243024',
                          textDecoration: isDone ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </p>
                      {/* Type tag */}
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: task.type === 'fixed' ? '#DCECF8' : '#DDF3DF', color: task.type === 'fixed' ? '#4A7FB8' : '#5FAF6E' }}
                      >
                        {task.type === 'fixed' ? <Timer size={10} /> : <RefreshCw size={10} />}
                        {task.type === 'fixed' ? 'Fixed' : 'Flexible'}
                      </span>
                      {/* Priority badge */}
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: p.bg, color: p.text }}
                      >
                        {p.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* Deadline or fixed time */}
                      {(task.deadline || task.fixedTime) && (
                        <span
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
                          style={{ background: '#DCECF8', color: '#4A7FB8' }}
                        >
                          {task.type === 'fixed' ? <Clock size={12} /> : <Calendar size={12} />}
                          {task.deadline || task.fixedTime}
                        </span>
                      )}
                      {/* Status */}
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-lg"
                        style={{
                          background: isDone ? '#DDF3DF' : task.status === 'in_progress' ? '#F7E7A8' : '#F4FAF4',
                          color: isDone ? '#5FAF6E' : task.status === 'in_progress' ? '#B8860B' : '#9CA3AF',
                        }}
                      >
                        {statusLabels[task.status]}
                      </span>
                    </div>

                    {/* Subtask progress */}
                    {totalSubtasks > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E8F5E8' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${(doneSubtasks / totalSubtasks) * 100}%`, background: isDone ? '#9CA3AF' : '#5FAF6E' }}
                            />
                          </div>
                          <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
                            {doneSubtasks}/{totalSubtasks} subtasks
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Priority Score ring */}
                  <MiniScoreRing score={task.priorityScore} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════ DRAWERS ═══════ */}
      <CreateTaskDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSave={handleSaveNewTask}
      />

      <TaskDetailDrawer
        task={selectedTask}
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
