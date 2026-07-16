import { useState, useEffect, useRef } from 'react';
import {
  X, Circle, Trash2, Plus, ChevronUp, ChevronDown,
  Clock, Calendar, Timer, AlertCircle, Pencil, Check,
} from 'lucide-react';
import type { Task, TaskType, Importance } from '../../types';

/* ─── Confetti particle ─── */
interface Particle { id: number; x: number; y: number; color: string; angle: number; speed: number; size: number }

function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const colors = ['#5FAF6E', '#DDF3DF', '#F6D8C7', '#F7E7A8', '#DCECF8', '#4A9459'];

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    const ps: Particle[] = Array.from({ length: 32 }, (_, i) => ({
      id: i, x: 20 + Math.random() * 60, y: 20 + Math.random() * 30,
      color: colors[i % colors.length],
      angle: Math.random() * 360,
      speed: 0.6 + Math.random() * 1.2,
      size: 4 + Math.random() * 6,
    }));
    setParticles(ps);
    const t = setTimeout(() => setParticles([]), 1400);
    return () => clearTimeout(t);
  }, [active]);

  if (!particles.length) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm animate-bounce"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: p.color,
            transform: `rotate(${p.angle}deg)`,
            opacity: 0.85,
            animation: `fall-${p.id % 4} 1.2s ease-out forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Large score ring ─── */
function ScoreRingLarge({ score, label }: { score: number; label: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? '#C1644C' : score >= 50 ? '#B8860B' : '#4A7FB8';
  const ringColor = score >= 80 ? '#5FAF6E' : score >= 50 ? '#B8860B' : '#9CA3AF';
  return (
    <div className="flex items-center gap-5 px-5 py-4 rounded-2xl" style={{ background: '#F4FAF4', border: '1.5px solid #E8F5E8' }}>
      <div className="relative flex items-center justify-center shrink-0" style={{ width: 100, height: 100 }}>
        <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={50} cy={50} r={r} fill="none" stroke="#E8F5E8" strokeWidth={10} />
          <circle
            cx={50} cy={50} r={r} fill="none" stroke={ringColor} strokeWidth={10}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold" style={{ color: '#243024' }}>{score}</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>/100</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-bold mb-1" style={{ color: '#243024' }}>Priority Score</p>
        <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: score >= 80 ? '#F6D8C7' : score >= 50 ? '#F7E7A8' : '#DCECF8', color }}>
          {label}
        </span>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: '#5F6E5F' }}>
          {score >= 80 ? 'Ưu tiên cao — gần deadline' : score >= 50 ? 'Mức trung bình — cần theo dõi' : 'Ưu tiên thấp — có thể hoãn lại'}
        </p>
      </div>
    </div>
  );
}

/* ─── Date conversion helpers ─── */
/** ISO string → value cho input[type=datetime-local]: "YYYY-MM-DDTHH:mm" */
function isoToDatetimeLocal(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** value của datetime-local → ISO string */
function datetimeLocalToIso(val: string): string {
  if (!val) return '';
  return new Date(val).toISOString();
}

/* ─── Mini task history ─── */
const HISTORY = [
  { dot: '#9CA3AF', text: 'Tạo lúc 08:32 sáng nay' },
  { dot: '#4A7FB8', text: 'Dời lịch 1 lần: Thứ 3 → Hôm nay' },
  { dot: '#E8993A', text: 'Bắt đầu Pomodoro lúc 10:00' },
];

/* ─── Props ─── */
interface Props {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskDetailDrawer({ task, open, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Task | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confettiOn, setConfettiOn] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  /* Sync draft when task changes */
  useEffect(() => {
    if (task) setDraft({ ...task, subtasks: task.subtasks.map((s) => ({ ...s })) });
    setEditingTitle(false);
    setShowDeleteConfirm(false);
    setConfettiOn(false);
  }, [task]);

  /* Body scroll lock */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* Esc close */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    if (open) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open]);

  useEffect(() => {
    if (editingTitle) setTimeout(() => titleInputRef.current?.focus(), 50);
  }, [editingTitle]);

  if (!draft) return null;

  const handleClose = () => { setShowDeleteConfirm(false); onClose(); };

  const toggleAllDone = () => {
    const allDone = draft.status === 'done';
    const nextStatus = allDone ? 'todo' : 'done';
    const newDraft = {
      ...draft,
      status: nextStatus as Task['status'],
      subtasks: draft.subtasks.map((s) => ({ ...s, done: !allDone })),
    };
    setDraft(newDraft);
    if (!allDone) {
      setConfettiOn(true);
      setTimeout(() => setConfettiOn(false), 1500);
    }
  };

  const toggleSubtask = (id: string) =>
    setDraft((d) => d ? {
      ...d,
      subtasks: d.subtasks.map((s) => s.id === id ? { ...s, done: !s.done } : s),
    } : null);

  const updateSubtask = (id: string, field: 'title' | 'estimatedMinutes', value: string | number) =>
    setDraft((d) => d ? {
      ...d,
      subtasks: d.subtasks.map((s) => s.id === id ? { ...s, [field]: value } : s),
    } : null);

  const removeSubtask = (id: string) =>
    setDraft((d) => d ? { ...d, subtasks: d.subtasks.filter((s) => s.id !== id) } : null);

  const addSubtask = () =>
    setDraft((d) => d ? {
      ...d,
      subtasks: [...d.subtasks, { id: `new-${Date.now()}`, title: '', done: false, estimatedMinutes: 15 }],
    } : null);

  const moveSubtask = (idx: number, dir: -1 | 1) => {
    setDraft((d) => {
      if (!d) return null;
      const arr = [...d.subtasks];
      const t = idx + dir;
      if (t < 0 || t >= arr.length) return d;
      [arr[idx], arr[t]] = [arr[t], arr[idx]];
      return { ...d, subtasks: arr };
    });
  };

  const doneCount = draft.subtasks.filter((s) => s.done).length;
  const totalCount = draft.subtasks.length;
  const pct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const isDone = draft.status === 'done';
  const scoreLabel = draft.priorityScore >= 80 ? 'Cao' : draft.priorityScore >= 50 ? 'Trung bình' : 'Thấp';



  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{ background: 'rgba(36,48,36,0.38)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white transition-transform duration-300 ease-in-out"
        style={{
          width: 'min(480px, 100vw)',
          boxShadow: open ? '-12px 0 48px rgba(36,48,36,0.14)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Confetti */}
        <Confetti active={confettiOn} />

        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5 shrink-0" style={{ borderBottom: '1px solid #F0F7F0' }}>
          {/* Completion checkbox */}
          <button
            onClick={toggleAllDone}
            className="shrink-0 mt-1 transition-transform duration-200 hover:scale-110"
          >
            {isDone
              ? <div className="flex items-center justify-center w-6 h-6 rounded-full" style={{ background: '#5FAF6E' }}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </div>
              : <Circle size={24} style={{ color: '#D1D5DB' }} />}
          </button>

          {/* Title inline-edit */}
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((d) => d ? { ...d, title: e.target.value } : null)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false); }}
                className="w-full text-base font-bold outline-none bg-transparent border-b-2"
                style={{ color: '#243024', borderColor: '#5FAF6E' }}
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="flex items-start gap-2 group w-full text-left"
              >
                <span
                  className="text-base font-bold leading-snug"
                  style={{
                    color: isDone ? '#9CA3AF' : '#243024',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {draft.title}
                </span>
                <Pencil size={14} className="shrink-0 mt-1 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: '#5F6E5F' }} />
              </button>
            )}
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Nhấn tiêu đề để chỉnh sửa</p>
          </div>

          <button
            onClick={handleClose}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-[#F4FAF4]"
            style={{ color: '#5F6E5F' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Score ring */}
          <ScoreRingLarge score={draft.priorityScore} label={scoreLabel} />

          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>Loại</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { val: 'flexible' as TaskType, icon: Calendar, label: '🔄 Flexible' },
                { val: 'fixed' as TaskType, icon: Timer, label: '⏱ Fixed' },
              ] as const).map(({ val, icon: Icon, label }) => (
                <button
                  key={val}
                  onClick={() => setDraft((d) => d ? { ...d, type: val } : null)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={draft.type === val
                    ? { background: '#F0FBF0', border: '2px solid #5FAF6E', color: '#243024' }
                    : { background: '#F9FBF9', border: '2px solid #E8F5E8', color: '#5F6E5F' }}
                >
                  <Icon size={15} style={{ color: draft.type === val ? '#5FAF6E' : '#9CA3AF' }} />
                  {label}
                </button>
              ))}
            </div>

            {/* Deadline / fixed time */}
            <div className="mt-3">
              {draft.type === 'flexible' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>Deadline</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#F4FAF4', border: '1.5px solid #E8F5E8' }}>
                    <Calendar size={14} style={{ color: '#5F6E5F' }} />
                    <input
                      type="datetime-local"
                      value={isoToDatetimeLocal(draft.deadline)}
                      onChange={(e) => setDraft((d) => d ? { ...d, deadline: datetimeLocalToIso(e.target.value) } : null)}
                      className="flex-1 bg-transparent outline-none text-sm"
                      style={{ color: '#243024', colorScheme: 'light' }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>Khung giờ</label>
                  {/* Fixed task: chọn ngày + giờ bắt đầu / kết thúc riêng */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#F4FAF4', border: '1.5px solid #E8F5E8' }}>
                      <Clock size={14} style={{ color: '#5FAF6E' }} />
                      <span className="text-xs font-medium w-16 shrink-0" style={{ color: '#9CA3AF' }}>Bắt đầu</span>
                      <input
                        type="datetime-local"
                        value={isoToDatetimeLocal(draft.fixedTime?.split('–')[0]?.trim())}
                        onChange={(e) => {
                          const start = datetimeLocalToIso(e.target.value);
                          const end = draft.fixedTime?.split('–')[1]?.trim() ?? '';
                          setDraft((d) => d ? { ...d, fixedTime: `${start}–${end}` } : null);
                        }}
                        className="flex-1 bg-transparent outline-none text-sm"
                        style={{ color: '#243024', colorScheme: 'light' }}
                      />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#F4FAF4', border: '1.5px solid #E8F5E8' }}>
                      <Clock size={14} style={{ color: '#C1644C' }} />
                      <span className="text-xs font-medium w-16 shrink-0" style={{ color: '#9CA3AF' }}>Kết thúc</span>
                      <input
                        type="datetime-local"
                        value={isoToDatetimeLocal(draft.fixedTime?.split('–')[1]?.trim())}
                        onChange={(e) => {
                          const start = draft.fixedTime?.split('–')[0]?.trim() ?? '';
                          const end = datetimeLocalToIso(e.target.value);
                          setDraft((d) => d ? { ...d, fixedTime: `${start}–${end}` } : null);
                        }}
                        className="flex-1 bg-transparent outline-none text-sm"
                        style={{ color: '#243024', colorScheme: 'light' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>Mức ưu tiên</label>
            <div className="flex gap-3">
              {([
                { val: 'HIGH' as Importance, label: 'High', bg: '#F6D8C7', text: '#C1644C' },
                { val: 'LOW' as Importance, label: 'Low', bg: '#F7E7A8', text: '#B8860B' },
              ] as const).map(({ val, label, bg, text }) => (
                <button
                  key={val}
                  onClick={() => setDraft((d) => d ? { ...d, importance: val } : null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2"
                  style={draft.importance === val
                    ? { background: bg, color: text, borderColor: text, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                    : { color: '#5F6E5F', background: '#F4FAF4', borderColor: 'transparent' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
                Công việc con
              </label>
              <span className="text-xs font-semibold" style={{ color: '#5FAF6E' }}>
                {doneCount}/{totalCount} hoàn thành
              </span>
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="mb-3 h-1.5 rounded-full overflow-hidden" style={{ background: '#E8F5E8' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: '#5FAF6E' }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {draft.subtasks.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150"
                  style={{
                    background: sub.done ? 'rgba(221,243,223,0.4)' : '#F4FAF4',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#DDF3DF')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                >
                  <button
                    onClick={() => toggleSubtask(sub.id)}
                    className="shrink-0 transition-transform hover:scale-110"
                  >
                    {sub.done
                      ? <div className="flex items-center justify-center w-5 h-5 rounded-full" style={{ background: '#5FAF6E' }}>
                          <Check size={11} color="#fff" strokeWidth={3} />
                        </div>
                      : <Circle size={18} style={{ color: '#D1D5DB' }} />}
                  </button>
                  <input
                    type="text"
                    value={sub.title}
                    onChange={(e) => updateSubtask(sub.id, 'title', e.target.value)}
                    placeholder="Tên công việc con..."
                    className="flex-1 bg-transparent outline-none text-sm transition-all"
                    style={{
                      color: sub.done ? '#9CA3AF' : '#243024',
                      textDecoration: sub.done ? 'line-through' : 'none',
                    }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      value={sub.estimatedMinutes || 15}
                      min={1}
                      onChange={(e) => updateSubtask(sub.id, 'estimatedMinutes', Number(e.target.value))}
                      className="w-12 text-right bg-transparent outline-none text-xs font-medium"
                      style={{ color: '#5F6E5F' }}
                    />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>ph</span>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveSubtask(idx, -1)}
                      disabled={idx === 0}
                      className="p-0.5 rounded disabled:opacity-30 hover:bg-[#DDF3DF] transition-colors"
                      style={{ color: '#5F6E5F' }}
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      onClick={() => moveSubtask(idx, 1)}
                      disabled={idx === draft.subtasks.length - 1}
                      className="p-0.5 rounded disabled:opacity-30 hover:bg-[#DDF3DF] transition-colors"
                      style={{ color: '#5F6E5F' }}
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeSubtask(sub.id)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[#F6D8C7] shrink-0"
                    style={{ color: '#C1644C' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addSubtask}
              className="mt-3 flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: '#5FAF6E' }}
            >
              <Plus size={14} /> Thêm công việc con
            </button>
          </div>

          {/* Mini history */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>
              Lịch sử
            </label>
            <div className="relative">
              <div className="absolute left-[6px] top-2 bottom-0 w-px" style={{ background: '#E8F5E8' }} />
              <div className="flex flex-col gap-3">
                {HISTORY.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="relative z-10 w-3 h-3 rounded-full shrink-0" style={{ background: h.dot }} />
                    <p className="text-xs" style={{ color: '#5F6E5F' }}>{h.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="relative flex items-center justify-between gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid #F0F7F0' }}
        >
          {/* Delete confirm popover */}
          {showDeleteConfirm && (
            <div
              className="absolute bottom-full left-4 mb-2 p-4 rounded-2xl z-10 w-72"
              style={{ background: '#FFFFFF', boxShadow: '0 8px 32px rgba(36,48,36,0.16)', border: '1px solid #F6D8C7' }}
            >
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle size={16} style={{ color: '#C1644C', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#243024' }}>Xoá công việc?</p>
                  <p className="text-xs mt-0.5" style={{ color: '#5F6E5F' }}>Hành động này không thể hoàn tác.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-[#F4FAF4]"
                  style={{ color: '#5F6E5F', border: '1px solid #E5E7EB' }}
                >
                  Huỷ
                </button>
                <button
                  onClick={() => { onDelete(draft.id); onClose(); }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: '#F6D8C7', color: '#C1644C' }}
                >
                  Xoá
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowDeleteConfirm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-[#FDF0ED]"
            style={{ color: '#C1644C', border: '1.5px solid #F6D8C7' }}
          >
            <Trash2 size={15} /> Xoá
          </button>

          <button
            onClick={() => { if (draft) { onSave(draft); onClose(); } }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#5FAF6E', color: '#fff' }}
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </>
  );
}
