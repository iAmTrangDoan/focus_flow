import { useState, useEffect, useRef } from 'react';
import {
  X, Wand2, Loader2, Plus, Trash2, Clock, Calendar,
  ChevronUp, ChevronDown, Timer,
} from 'lucide-react';
import type { TaskType, Importance, Subtask } from '../../types';
import tasksService from '../../services/tasks.service';

/* ─── Types ─── */
export interface NewTaskData {
  title: string;
  type: TaskType;
  importance: Importance;
  deadline?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  subtasks: Subtask[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewTaskData) => void;
}


export function CreateTaskDrawer({ open, onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('flexible');
  const [importance, setImportance] = useState<Importance>('HIGH');
  const [deadline, setDeadline] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [subtasks, setSubtasks] = useState<(Subtask & { estimatedMinutes: number })[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [typeVisible, setTypeVisible] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const canSave = title.trim().length > 0;

  /* Focus & scroll lock */
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 320);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* Animate type fields in */
  useEffect(() => {
    if (open) setTimeout(() => setTypeVisible(true), 50);
    else setTypeVisible(false);
  }, [open, type]);

  /* Esc close */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    if (open) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open]);

  const reset = () => {
    setTitle(''); setType('flexible'); setImportance('HIGH');
    setDeadline(''); setDate(''); setStartTime(''); setEndTime('');
    setSubtasks([]); setAiLoading(false); setAiError(null); setTypeVisible(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const aiLoadingRef = useRef(false);

  const handleAI = async () => {
    if (!title.trim() || aiLoadingRef.current) return;
    aiLoadingRef.current = true;
    setAiLoading(true);
    setSubtasks([]);
    setAiError(null);
    try {
      const suggested = await tasksService.getAiSuggestedSubtasks(title.trim(), deadline || undefined, importance);
      setSubtasks(
        suggested.map((s, i) => ({
          id: `ai-${Date.now()}-${i}`,
          title: s.title,
          done: false,
          estimatedMinutes: s.aiEstimatedMinutes,
        }))
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'AI tạm thời không khả dụng.';
      setAiError(msg);
      setSubtasks([]);
    } finally {
      aiLoadingRef.current = false;
      setAiLoading(false);
    }
  };

  const addSubtask = () =>
    setSubtasks((p) => [...p, { id: `m-${Date.now()}`, title: '', done: false, estimatedMinutes: 15 }]);

  const updateSubtask = (id: string, field: 'title' | 'estimatedMinutes', val: string | number) =>
    setSubtasks((p) => p.map((s) => s.id === id ? { ...s, [field]: val } : s));

  const removeSubtask = (id: string) =>
    setSubtasks((p) => p.filter((s) => s.id !== id));

  const moveSubtask = (idx: number, dir: -1 | 1) => {
    setSubtasks((p) => {
      const next = [...p];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(), type, importance,
      deadline: type === 'flexible' ? deadline : undefined,
      date: type === 'fixed' ? date : undefined,
      startTime: type === 'fixed' ? startTime : undefined,
      endTime: type === 'fixed' ? endTime : undefined,
      subtasks: subtasks.filter((s) => s.title.trim()),
    });
    reset(); onClose();
  };

  const totalMin = subtasks.reduce((s, t) => s + (Number(t.estimatedMinutes) || 0), 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          background: 'rgba(36,48,36,0.38)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: '1px solid #F0F7F0' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#243024' }}>Tạo công việc mới</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Điền thông tin để AI sắp xếp lịch tối ưu</p>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-[#F4FAF4]"
            style={{ color: '#5F6E5F' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Step 1: Title ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
              Tên công việc
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên công việc..."
              className="w-full px-4 py-3 rounded-xl text-base font-semibold outline-none transition-all duration-200"
              style={{ background: '#F4FAF4', color: '#243024', border: '2px solid transparent' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#5FAF6E')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'transparent')}
            />
          </div>

          {/* ── Step 2: Task type ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>
              Loại công việc
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { val: 'flexible' as TaskType, icon: Calendar, title: 'Flexible Task', desc: 'Có deadline linh hoạt, AI tự xếp lịch' },
                { val: 'fixed' as TaskType, icon: Timer, title: 'Fixed Event', desc: 'Lịch cố định, không thay đổi được' },
              ] as const).map(({ val, icon: Icon, title: t, desc }) => (
                <button
                  key={val}
                  onClick={() => setType(val)}
                  className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all duration-200"
                  style={{
                    background: type === val ? '#F0FBF0' : '#F9FBF9',
                    border: type === val ? '2px solid #5FAF6E' : '2px solid #E8F5E8',
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 36, height: 36, background: type === val ? '#DDF3DF' : '#F0F0F0' }}
                  >
                    <Icon size={18} style={{ color: type === val ? '#5FAF6E' : '#9CA3AF' }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: type === val ? '#243024' : '#5F6E5F' }}>{t}</span>
                  <span className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>{desc}</span>
                </button>
              ))}
            </div>

            {/* Animated fields */}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: typeVisible ? 200 : 0, opacity: typeVisible ? 1 : 0, marginTop: typeVisible ? 12 : 0 }}
            >
              {type === 'flexible' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>Deadline</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#F4FAF4', border: '1.5px solid #E8F5E8' }}>
                    <Calendar size={15} style={{ color: '#5F6E5F' }} />
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm"
                      style={{ color: '#243024' }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>Ngày</label>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#F4FAF4', border: '1.5px solid #E8F5E8' }}>
                      <Calendar size={15} style={{ color: '#5F6E5F' }} />
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: '#243024' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Giờ bắt đầu', val: startTime, set: setStartTime },
                      { label: 'Giờ kết thúc', val: endTime, set: setEndTime },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>{label}</label>
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#F4FAF4', border: '1.5px solid #E8F5E8' }}>
                          <Clock size={15} style={{ color: '#5F6E5F' }} />
                          <input type="time" value={val} onChange={(e) => set(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: '#243024' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Step 3: Priority ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>
              Mức ưu tiên
            </label>
            <div className="flex gap-3">
              {([
                { val: 'HIGH' as Importance, label: 'High', bg: '#F6D8C7', text: '#C1644C' },
                { val: 'LOW' as Importance, label: 'Low', bg: '#F7E7A8', text: '#B8860B' },
              ] as const).map(({ val, label, bg, text }) => (
                <button
                  key={val}
                  onClick={() => setImportance(val)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2"
                  style={importance === val
                    ? { background: bg, color: text, borderColor: text, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                    : { color: '#5F6E5F', background: '#F4FAF4', borderColor: 'transparent' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Step 4: AI breakdown ── */}
          <div>
            <button
              onClick={handleAI}
              disabled={!title.trim() || aiLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
              style={{
                background: aiLoading
                  ? '#F4FAF4'
                  : 'linear-gradient(135deg, #E8F5E9 0%, #F0FBF0 50%, #E3F4E3 100%)',
                color: '#5FAF6E',
                border: '1.5px dashed rgba(95,175,110,0.5)',
              }}
            >
              {/* shimmer overlay */}
              {aiLoading && (
                <div
                  className="absolute inset-0 animate-pulse"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(95,175,110,0.08) 50%, transparent 100%)' }}
                />
              )}
              {aiLoading ? (
                <><Loader2 size={16} className="animate-spin" /> AI đang phân tích và gợi ý công việc con...</>
              ) : (
                <><Wand2 size={16} /> ✨ AI phân rã công việc tự động</>
              )}
            </button>

            {/* ── Step 5: Subtasks ── */}
            <div className="mt-4">
              {/* AI error notice */}
              {aiError && !aiLoading && (
                <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: '#C1644C' }}>
                  <span>⚠️</span> {aiError} Bạn có thể tự thêm công việc con bên dưới.
                </p>
              )}
              {/* AI Skeleton */}
              {aiLoading && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>AI đang phân tích và gợi ý công việc con...</p>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse" style={{ background: '#F4FAF4' }}>
                      <div className="w-5 h-5 rounded-lg shrink-0" style={{ background: '#DDF3DF' }} />
                      <div className="flex-1 h-4 rounded-lg" style={{ background: '#DDF3DF', width: `${55 + i * 15}%` }} />
                      <div className="w-14 h-4 rounded-lg shrink-0" style={{ background: '#DDF3DF' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Subtask list */}
              {!aiLoading && subtasks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
                      Công việc con ({subtasks.length})
                    </label>
                    {totalMin > 0 && (
                      <span className="text-xs font-medium" style={{ color: '#5F6E5F' }}>
                        Tổng: {Math.floor(totalMin / 60) > 0 ? `${Math.floor(totalMin / 60)}g ` : ''}{totalMin % 60}ph
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {subtasks.map((sub, idx) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-150"
                        style={{ background: '#F4FAF4', border: '1px solid transparent' }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#DDF3DF')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                      >
                        <span className="text-xs font-bold w-5 text-center shrink-0" style={{ color: '#C4D4C4' }}>{idx + 1}</span>
                        <input
                          type="text"
                          value={sub.title}
                          onChange={(e) => updateSubtask(sub.id, 'title', e.target.value)}
                          placeholder="Tên công việc con..."
                          className="flex-1 bg-transparent outline-none text-sm"
                          style={{ color: '#243024' }}
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            value={sub.estimatedMinutes}
                            min={1}
                            onChange={(e) => updateSubtask(sub.id, 'estimatedMinutes', Number(e.target.value))}
                            className="w-12 text-right bg-transparent outline-none text-xs font-medium"
                            style={{ color: '#5F6E5F' }}
                          />
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>ph</span>
                        </div>
                        {/* Move up/down */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => moveSubtask(idx, -1)}
                            disabled={idx === 0}
                            className="p-0.5 rounded transition-colors disabled:opacity-30 hover:bg-[#DDF3DF]"
                            style={{ color: '#5F6E5F' }}
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={() => moveSubtask(idx, 1)}
                            disabled={idx === subtasks.length - 1}
                            className="p-0.5 rounded transition-colors disabled:opacity-30 hover:bg-[#DDF3DF]"
                            style={{ color: '#5F6E5F' }}
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeSubtask(sub.id)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-[#F6D8C7] shrink-0"
                          style={{ color: '#C1644C' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add manually */}
              <button
                onClick={addSubtask}
                className="mt-3 flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ color: '#5FAF6E' }}
              >
                <Plus size={15} /> Thêm thủ công
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid #F0F7F0' }}
        >
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-[#F4FAF4]"
            style={{ color: '#5F6E5F', border: '1.5px solid #E5E7EB' }}
          >
            Huỷ
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-[2] py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#5FAF6E', color: '#fff' }}
          >
            Tạo công việc
          </button>
        </div>
      </div>
    </>
  );
}
