import { useState } from 'react';
import { CheckCircle2, Circle, Clock, MoreHorizontal } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  duration: string;
  priority: 'high' | 'medium' | 'info';
  done: boolean;
}

const initialTasks: Task[] = [
  { id: 1, title: 'Review Q2 OKRs with team', duration: '25 min', priority: 'high', done: true },
  { id: 2, title: 'Write user interview synthesis', duration: '50 min', priority: 'medium', done: false },
  { id: 3, title: 'Update project roadmap doc', duration: '25 min', priority: 'info', done: false },
  { id: 4, title: 'Reply to stakeholder emails', duration: '15 min', priority: 'medium', done: false },
  { id: 5, title: 'Prototype navigation micro-interactions', duration: '50 min', priority: 'high', done: false },
];

const priorityStyles = {
  high:   { bg: '#F6D8C7', text: '#C1644C', label: 'High' },
  medium: { bg: '#F7E7A8', text: '#B8860B', label: 'Medium' },
  info:   { bg: '#DCECF8', text: '#4A7FB8', label: 'Info' },
};

export function TaskQueue() {
  const [tasks, setTasks] = useState(initialTasks);

  const toggle = (id: number) =>
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div
      className="overflow-hidden"
      style={{ background: '#FFFFFF', boxShadow: '0 2px 16px 0 rgba(36,48,36,0.07)', borderRadius: 20 }}
    >
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: '1px solid #D4E8D4' }}
      >
        <div>
          <h3 className="text-base font-semibold" style={{ color: '#243024' }}>Today's Queue</h3>
          <p className="text-xs mt-0.5" style={{ color: '#5F6E5F' }}>{remaining} task{remaining !== 1 ? 's' : ''} remaining</p>
        </div>
        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-colors"
          style={{ background: '#DDF3DF', color: '#4A9459' }}
        >
          + Add Task
        </button>
      </div>

      <ul>
        {tasks.map((task, i) => {
          const p = priorityStyles[task.priority];
          return (
            <li
              key={task.id}
              className="flex items-center gap-4 px-6 py-4 group transition-colors hover:bg-[#F4FAF4]"
              style={i < tasks.length - 1 ? { borderBottom: '1px solid #F4FAF4' } : {}}
            >
              <button onClick={() => toggle(task.id)} className="shrink-0 transition-transform hover:scale-110">
                {task.done
                  ? <CheckCircle2 size={20} style={{ color: '#5FAF6E' }} />
                  : <Circle size={20} style={{ color: '#D4E8D4' }} />}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: task.done ? '#5F6E5F' : '#243024', textDecoration: task.done ? 'line-through' : 'none' }}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={12} style={{ color: '#5F6E5F' }} />
                  <span className="text-xs" style={{ color: '#5F6E5F' }}>{task.duration}</span>
                </div>
              </div>

              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: p.bg, color: p.text }}
              >
                {p.label}
              </span>

              <button
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1"
                style={{ color: '#5F6E5F' }}
              >
                <MoreHorizontal size={15} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
