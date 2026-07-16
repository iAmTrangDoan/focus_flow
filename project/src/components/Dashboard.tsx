import { useState, useEffect } from 'react';
import {
  Sparkles,
  Bell,
  Search,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Circle,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
  Info,
  Target,
  TrendingDown,
  Zap,
} from 'lucide-react';

/* ─── Types ─── */
interface TaskItem {
  id: number;
  title: string;
  deadline: string;
  priority: 'high' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  score: number;
  duration: string;
}

interface TimeSlot {
  id: number;
  time: string;
  taskTitle: string;
  status: 'scheduled' | 'active' | 'completed';
}

/* ─── Demo Data ─── */
const todayTasks: TaskItem[] = [
  { id: 1, title: 'Review Q2 OKRs with team', deadline: 'Today, 5:00 PM', priority: 'high', status: 'done', score: 92, duration: '25 min' },
  { id: 2, title: 'Write user interview synthesis', deadline: 'Today, 6:00 PM', priority: 'high', status: 'in_progress', score: 87, duration: '50 min' },
  { id: 3, title: 'Update project roadmap doc', deadline: 'Tomorrow, 9:00 AM', priority: 'low', status: 'todo', score: 64, duration: '25 min' },
  { id: 4, title: 'Reply to stakeholder emails', deadline: 'Today, 4:00 PM', priority: 'low', status: 'todo', score: 58, duration: '15 min' },
  { id: 5, title: 'Prototype navigation micro-interactions', deadline: 'Wed, Jun 5', priority: 'high', status: 'todo', score: 95, duration: '50 min' },
];

const timeSlots: TimeSlot[] = [
  { id: 1, time: '9:00 AM', taskTitle: 'Review Q2 OKRs with team', status: 'completed' },
  { id: 2, time: '10:00 AM', taskTitle: 'Write user interview synthesis', status: 'active' },
  { id: 3, time: '11:30 AM', taskTitle: 'Reply to stakeholder emails', status: 'scheduled' },
  { id: 4, time: '2:00 PM', taskTitle: 'Update project roadmap doc', status: 'scheduled' },
  { id: 5, time: '3:30 PM', taskTitle: 'Prototype navigation micro-interactions', status: 'scheduled' },
];

type AiBannerState = 'ready' | 'new_user' | 'loading' | 'error';

function getPriorityStyle(p: 'high' | 'low') {
  return p === 'high'
    ? { bg: '#F6D8C7', text: '#C1644C', label: 'High' }
    : { bg: '#DCECF8', text: '#4A7FB8', label: 'Low' };
}

function getStatusStyle(s: TaskItem['status']) {
  switch (s) {
    case 'done': return { dot: '#5FAF6E', label: 'Done' };
    case 'in_progress': return { dot: '#B8860B', label: 'In Progress' };
    default: return { dot: '#9CA3AF', label: 'To Do' };
  }
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<TaskItem[]>(todayTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<number>(2);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [aiBannerState] = useState<AiBannerState>('ready');
  const [showReshuffleBanner, setShowReshuffleBanner] = useState(true);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0) setRunning(false);
  }, [secondsLeft]);

  const resetTimer = () => { setRunning(false); setSecondsLeft(25 * 60); };
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (secondsLeft / (25 * 60));

  const procrastScore = 28;
  const scoreColor = '#5FAF6E';
  const scoreBg = '#DDF3DF';

  const sortedTasks = [...tasks].sort((a, b) => b.score - a.score);

  const toggleStatus = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: TaskItem['status'] = t.status === 'done' ? 'todo' : t.status === 'todo' ? 'in_progress' : 'done';
        return { ...t, status: next };
      })
    );
  };

  const startPomodoroFromSlot = (taskTitle: string) => {
    const task = tasks.find((t) => t.title === taskTitle);
    if (task) { setSelectedTaskId(task.id); setRunning(true); setSecondsLeft(25 * 60); }
  };

  return (
    <div className="px-6 lg:px-8 py-0">
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between py-4 -mx-6 lg:-mx-8 px-6 lg:px-8 mb-6"
        style={{ background: 'rgba(244,250,244,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid #E8F5E8' }}
      >
        <div>
          <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#243024' }}>Good morning, Alex</h1>
          <p className="text-sm mt-0.5" style={{ color: '#5F6E5F' }}>Thứ 3, 1 tháng 7 — Tập trung vào điều quan trọng nhất hôm nay.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: '#FFFFFF', border: '1px solid #E8F5E8', color: '#9CA3AF' }}>
            <Search size={15} /><span>Tìm kiếm task...</span>
          </div>
          <button className="relative flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E8F5E8' }}>
            <Bell size={18} style={{ color: '#5F6E5F' }} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
          </button>
          <div className="flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold" style={{ background: '#DDF3DF', color: '#5FAF6E' }}>AK</div>
        </div>
      </header>

      <div className="space-y-6 max-w-5xl pb-8">
        {/* AI Banner */}
        {aiBannerState === 'ready' && (
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, #F0FBF0 0%, #E8F5E9 100%)', border: '1px solid rgba(95,175,110,0.25)' }}>
            <div className="flex items-center justify-center rounded-full shrink-0 mt-0.5" style={{ width: 32, height: 32, background: '#DDF3DF' }}>
              <Sparkles size={16} style={{ color: '#5FAF6E' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: '#243024' }}>
                "Giờ cao điểm của bạn là <strong style={{ color: '#5FAF6E' }}>9–11 SA</strong>. Hãy đặt lịch deep work trong khung giờ này — bạn hoàn thành{' '}
                <strong style={{ color: '#5FAF6E' }}>40% nhiều hơn</strong> trong khoảng đó."
              </p>
              <a href="#" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color: '#5FAF6E' }}>
                Xem phân tích AI chi tiết <ArrowRight size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Tasks + Schedule */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Priority Tasks */}
          <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: '#243024' }}>Công việc ưu tiên hôm nay</h2>
                <p className="text-xs mt-0.5" style={{ color: '#5F6E5F' }}>Sắp xếp theo Priority Score</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#F4FAF4', color: '#5F6E5F' }}>
                {tasks.filter((t) => t.status !== 'done').length} còn lại
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {sortedTasks.map((task) => {
                const pStyle = getPriorityStyle(task.priority);
                const sStyle = getStatusStyle(task.status);
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150"
                    style={selectedTaskId === task.id
                      ? { background: '#F4FAF4', border: '1px solid #DDF3DF' }
                      : { border: '1px solid transparent' }}
                    onMouseEnter={(e) => { if (selectedTaskId !== task.id) (e.currentTarget as HTMLElement).style.background = '#F9FCF9'; }}
                    onMouseLeave={(e) => { if (selectedTaskId !== task.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <button onClick={(e) => { e.stopPropagation(); toggleStatus(task.id); }} className="shrink-0 transition-transform hover:scale-110">
                      {task.status === 'done'
                        ? <div className="flex items-center justify-center w-5 h-5 rounded-full" style={{ background: '#5FAF6E' }}><Check size={12} color="#fff" strokeWidth={3} /></div>
                        : <Circle size={20} style={{ color: '#D1D5DB' }} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: task.status === 'done' ? '#9CA3AF' : '#243024', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#5F6E5F' }}><Clock size={11} /> {task.deadline}</span>
                        <span className="w-1 h-1 rounded-full" style={{ background: '#D1D5DB' }} />
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#5F6E5F' }}><Target size={11} /> Score {task.score}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: pStyle.bg, color: pStyle.text }}>{pStyle.label}</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: sStyle.dot }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: sStyle.dot }} /> {sStyle.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: '#243024' }}>Lịch hôm nay</h2>
                <p className="text-xs mt-0.5" style={{ color: '#5F6E5F' }}>Nhấn để bắt đầu tập trung</p>
              </div>
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#5FAF6E', border: '1px solid rgba(95,175,110,0.40)' }}>+ Thêm slot</button>
            </div>
            <div className="flex flex-col gap-0 relative">
              <div className="absolute left-[52px] top-2 bottom-2 w-px" style={{ background: '#E8F5E8' }} />
              {timeSlots.map((slot) => {
                const isActive = slot.status === 'active';
                const isCompleted = slot.status === 'completed';
                return (
                  <div key={slot.id} className="flex items-start gap-4 py-3 relative">
                    <span className="text-xs font-medium w-10 text-right shrink-0 pt-1.5" style={{ color: '#5F6E5F' }}>{slot.time}</span>
                    <div
                      className="flex-1 rounded-xl p-3 transition-all"
                      style={isActive
                        ? { background: '#F0FBF0', border: '1px solid #DDF3DF' }
                        : isCompleted
                        ? { background: '#FAFAFA', opacity: 0.7 }
                        : { background: '#FFFFFF', border: '1px solid #F4FAF4' }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium" style={{ color: isCompleted ? '#9CA3AF' : '#243024', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                          {slot.taskTitle}
                        </p>
                        {!isCompleted && (
                          <button
                            onClick={() => startPomodoroFromSlot(slot.taskTitle)}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-90"
                            style={{ background: isActive ? '#5FAF6E' : '#F4FAF4', color: isActive ? '#fff' : '#5FAF6E' }}
                          >
                            <Play size={12} /> {isActive ? 'Đang focus' : 'Bắt đầu'}
                          </button>
                        )}
                        {isCompleted && <Check size={14} style={{ color: '#5FAF6E' }} />}
                      </div>
                      {isActive && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs" style={{ color: '#5FAF6E' }}><Zap size={12} /> Pomodoro đang chạy</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pomodoro + Score */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Pomodoro */}
          <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}>
            <div className="relative shrink-0 flex items-center justify-center" style={{ width: 148, height: 148 }}>
              <svg width={148} height={148} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={74} cy={74} r={radius} fill="none" stroke="#DDF3DF" strokeWidth={8} />
                <circle cx={74} cy={74} r={radius} fill="none" stroke="#5FAF6E" strokeWidth={8} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
              </svg>
              <div className="relative flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums" style={{ color: '#243024' }}>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
                <span className="text-xs font-medium mt-0.5" style={{ color: '#5F6E5F' }}>{running ? 'đang chạy' : 'sẵn sàng'}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: getPriorityStyle(selectedTask.priority).bg, color: getPriorityStyle(selectedTask.priority).text }}>
                  {getPriorityStyle(selectedTask.priority).label}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: '#243024' }}>{selectedTask.title}</h3>
              <p className="text-xs mb-3" style={{ color: '#5F6E5F' }}>{selectedTask.duration} · Due {selectedTask.deadline} · Score {selectedTask.score}/100</p>
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                  style={{ background: '#5FAF6E', color: '#fff' }}
                >
                  {running ? <Pause size={16} /> : <Play size={16} />}
                  {running ? 'Dừng' : 'Bắt đầu Focus'}
                </button>
                <button
                  onClick={resetTimer}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-gray-50"
                  style={{ background: '#FFFFFF', color: '#5F6E5F', border: '1px solid #E5E7EB' }}
                >
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Procrastination Score */}
          <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6" style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(36,48,36,0.07)' }}>
            <div className="relative shrink-0 flex items-center justify-center" style={{ width: 140, height: 140 }}>
              <svg width={140} height={140} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={70} cy={70} r={56} fill="none" stroke="#E5E7EB" strokeWidth={10} />
                <circle cx={70} cy={70} r={56} fill="none" stroke={scoreColor} strokeWidth={10} strokeLinecap="round" strokeDasharray={2 * Math.PI * 56} strokeDashoffset={2 * Math.PI * 56 * (1 - procrastScore / 100)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
              </svg>
              <div className="relative flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: scoreColor }}>{procrastScore}</span>
                <span className="text-xs" style={{ color: '#5F6E5F' }}>/ 100</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                <h3 className="text-base font-semibold" style={{ color: '#243024' }}>Procrastination Score</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: scoreBg, color: scoreColor }}>Tốt</span>
              </div>
              <p className="text-xs mb-4" style={{ color: '#5F6E5F' }}>Tính lúc 00:00 hôm nay · Càng thấp càng tốt</p>
              <div className="flex flex-col gap-2">
                {[
                  { name: 'Delay Rate', value: 15, display: '15%' },
                  { name: 'Deadline Miss', value: 5, display: '5%' },
                  { name: 'Time Accuracy', value: 82, display: '82%' },
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="text-xs w-28 shrink-0 text-right" style={{ color: '#5F6E5F' }}>{m.name}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: '#E5E7EB' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(m.value, 100)}%`, background: m.value > 50 ? '#5FAF6E' : '#C1644C' }} />
                    </div>
                    <span className="text-xs font-semibold w-10" style={{ color: '#243024' }}>{m.display}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#F6D8C7', color: '#C1644C' }}>Hôm qua: 32</span>
                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#5FAF6E' }}>
                  <TrendingDown size={12} /> ▼ 4 điểm tốt hơn
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reshuffle Banner */}
        {showReshuffleBanner && (
          <div className="flex items-center justify-between rounded-xl p-4" style={{ background: '#DDF3DF', border: '1px solid rgba(95,175,110,0.30)' }}>
            <div className="flex items-center gap-3">
              <AlertCircle size={20} style={{ color: '#5FAF6E' }} />
              <span className="text-sm" style={{ color: '#243024' }}>Lịch đã được cập nhật! AI đã sắp xếp lại 3 task để đưa bạn trở lại đúng hướng.</span>
            </div>
            <button onClick={() => setShowReshuffleBanner(false)} className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#5FAF6E' }}>
              Xem thay đổi <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
