import { useState, useEffect } from 'react';
import {
  Clock,
  ChevronDown,
  Loader2,
  Check,
  Hourglass,
  Zap,
  RefreshCw,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { Card } from '../components/ui/Card';

import { createToast, type ToastMessage } from '../components/common/Toast';
import aiService, { type AiInsight, type WeekOption } from '../services/ai.service';

/* ─── Types ─── */
interface Strength {
  id: string;
  content: string;
}

interface Concern {
  id: string;
  content: string;
}

interface Suggestion {
  id: string;
  content: string;
  actionType: string;
  status: 'new' | 'applied';
}

/* ─── Helpers ─── */
function mapApiInsight(ai: AiInsight) {
  const strengths: Strength[] = (ai.content?.strengths ?? []).map((s, i) => ({
    id: `${ai.id}-s-${i}`,
    content: s,
  }));

  const concerns: Concern[] = (ai.content?.concerns ?? []).map((c, i) => ({
    id: `${ai.id}-c-${i}`,
    content: c,
  }));

  const suggestions: Suggestion[] = (ai.content?.actionableSuggestions ?? []).map((s, i) => ({
    id: `${ai.id}-a-${i}`,
    content: s.content,
    actionType: s.actionType,
    status: 'new' as const,
  }));

  if (ai.content?.insights) {
    ai.content.insights.forEach((item, i) => {
      if (item.category === 'procrastination_pattern') {
        concerns.push({ id: `${ai.id}-con-${i}`, content: item.content });
      } else if (item.category === 'golden_hours' || item.category === 'completion_rate' || item.category === 'getting_started') {
        strengths.push({ id: `${ai.id}-str-${i}`, content: item.content });
      } else if (item.actionable) {
        suggestions.push({
          id: `${ai.id}-sugg-${i}`,
          content: item.content,
          actionType: item.actionType || 'none',
          status: 'new'
        });
      } else {
        concerns.push({ id: `${ai.id}-con-${i}`, content: item.content });
      }
    });
  }

  return { strengths, concerns, suggestions, summary: ai.content?.summary ?? '' };
}


// Week Dropdown
interface WeekDropdownProps {
  value: string;
  onChange: (value: string) => void;
  weeks: WeekOption[];
}

function WeekDropdown({ value, onChange, weeks }: WeekDropdownProps) {
  const [open, setOpen] = useState(false);

  const selected = weeks.find((w) => w.weekStartDate === value);

  return (
    <div className="relative" style={{ minWidth: 260 }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl transition-colors"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8F5E8',
        }}
      >
        <span className="text-sm font-medium" style={{ color: '#243024' }}>
          {selected?.label ?? 'Chọn tuần'}
        </span>
        <ChevronDown
          size={16}
          style={{ color: '#9CA3AF' }}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-20"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(36, 48, 36, 0.12)',
              border: '1px solid #E8F5E8',
            }}
          >
            {weeks.map((week) => (
              <button
                key={week.weekStartDate}
                onClick={() => {
                  onChange(week.weekStartDate);
                  setOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm transition-colors"
                style={{
                  background: value === week.weekStartDate ? '#DDF3DF' : 'transparent',
                  color: '#243024',
                }}
                onMouseEnter={(e) => {
                  if (value !== week.weekStartDate) {
                    e.currentTarget.style.background = '#F4FAF4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== week.weekStartDate) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {week.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


/* ─── Sub-components ─── */

// Strength Card
function StrengthCard({ strength }: { strength: Strength }) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md" style={{ borderColor: '#E8F5E8', borderWidth: 1 }}>
      <div className="p-5 flex gap-4">
        <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, background: '#DDF3DF' }}>
          <ThumbsUp size={20} style={{ color: '#5FAF6E' }} />
        </div>
        <p className="text-base leading-relaxed flex-1" style={{ color: '#243024', lineHeight: 1.6 }}>
          {strength.content}
        </p>
      </div>
    </Card>
  );
}

// Concern Card
function ConcernCard({ concern }: { concern: Concern }) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md" style={{ borderColor: '#FEF3C7', borderWidth: 1 }}>
      <div className="p-5 flex gap-4">
        <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, background: '#FEF3C7' }}>
          <AlertTriangle size={20} style={{ color: '#D97706' }} />
        </div>
        <p className="text-base leading-relaxed flex-1" style={{ color: '#243024', lineHeight: 1.6 }}>
          {concern.content}
        </p>
      </div>
    </Card>
  );
}

// Suggestion Card
function SuggestionCard({ suggestion, onApply }: { suggestion: Suggestion; onApply: (id: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const handleApply = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
    onApply(suggestion.id);
  };
  const isApplied = suggestion.status === 'applied';

  return (
    <Card className="transition-all duration-200 hover:shadow-md" style={{ borderColor: isApplied ? '#5FAF6E' : '#E8F5E8', borderWidth: 1 }}>
      <div className="p-5 flex gap-4">
        <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, background: '#FCE7F3' }}>
          <Lightbulb size={20} style={{ color: '#DB2777' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base leading-relaxed" style={{ color: '#243024', lineHeight: 1.6 }}>
            {suggestion.content}
          </p>
          {suggestion.actionType !== 'none' && (
            <div className="mt-4 flex items-center gap-3">
              {isApplied ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#DDF3DF', color: '#4A9459' }}>
                  <Check size={16} />Đã áp dụng
                </span>
              ) : (
                <button onClick={handleApply} disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-70"
                  style={{ background: '#DDF3DF', color: '#5FAF6E' }}
                >
                  {isLoading ? (<><Loader2 size={16} className="animate-spin" />Đang áp dụng...</>) : (<><Zap size={16} />Áp dụng ngay</>)}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Processing Card
function ProcessingCard() {
  return (
    <div className="flex items-center gap-4 px-6 py-5 rounded-2xl" style={{ border: '2px dashed #E8F5E8', background: '#FAFDFA' }}>
      <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, background: '#E8F5E8' }}>
        <Hourglass size={20} style={{ color: '#5FAF6E' }} />
      </div>
      <p className="text-base" style={{ color: '#5F6E5F' }}>
        AI đang tổng hợp dữ liệu hành vi tuần này, quay lại vào đầu tuần sau nhé!
      </p>
    </div>
  );
}

// Empty State
function EmptyState({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex items-center justify-center rounded-3xl mb-4" style={{ width: 80, height: 80, background: '#E8F5E8' }}>
        <Clock size={32} style={{ color: '#9CA3AF' }} />
      </div>
      <h3 className="text-base font-semibold text-center mb-2" style={{ color: '#243024' }}>Chưa có nhận xét nào</h3>
      <p className="text-sm text-center max-w-md mb-6" style={{ color: '#9CA3AF' }}>
        Chưa đủ dữ liệu hoặc chưa tạo nhận xét cho tuần này.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: '#5FAF6E', color: '#FFFFFF', opacity: generating ? 0.7 : 1 }}
      >
        {generating ? (<><Loader2 size={16} className="animate-spin" />Gemini đang suy nghĩ...</>) : (<><RefreshCw size={16} />Tạo nhận xét ngay</>)}
      </button>
    </div>
  );
}

/* ─── Main AI Insights Page ─── */
interface AIInsightsPageProps {
  onToast: (toast: ToastMessage) => void;
}

export default function AIInsightsPage({ onToast }: AIInsightsPageProps) {
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [strengths, setStrengths] = useState<Strength[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [apiInsight, setApiInsight] = useState<AiInsight | null>(null);

  /* Load available weeks */
  useEffect(() => {
    aiService.getAvailableWeeks()
      .then((w) => {
        setWeeks(w);
        if (w.length > 0) setSelectedWeek(w[0].weekStartDate);
      })
      .catch(() => {});
  }, []);

  /* Load insights for selected week */
  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true);
    aiService.getInsights(selectedWeek)
      .then((data) => {
        if (data.length > 0) {
          setApiInsight(data[0]);
          const mapped = mapApiInsight(data[0]);
          setStrengths(mapped.strengths);
          setConcerns(mapped.concerns);
          setSuggestions(mapped.suggestions);
          setSummary(mapped.summary);
        } else {
          setApiInsight(null);
          setStrengths([]);
          setConcerns([]);
          setSuggestions([]);
          setSummary('');
        }
      })
      .catch(() => {
        setStrengths([]);
        setConcerns([]);
        setSuggestions([]);
        setSummary('');
      })
      .finally(() => setLoading(false));
  }, [selectedWeek]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await aiService.generateInsight();
      setApiInsight(result);
      const mapped = mapApiInsight(result);
      setStrengths(mapped.strengths);
      setConcerns(mapped.concerns);
      setSuggestions(mapped.suggestions);
      setSummary(mapped.summary);
      // Refresh weeks list
      const updatedWeeks = await aiService.getAvailableWeeks();
      setWeeks(updatedWeeks);
      if (updatedWeeks.length > 0 && !selectedWeek) {
        setSelectedWeek(updatedWeeks[0].weekStartDate);
      }
      onToast(createToast('success', '✨ AI đã tạo nhận xét mới cho tuần của bạn!'));
    } catch (err: any) {
      onToast(createToast('error', err?.message ?? 'Không thể tạo nhận xét. Thử lại sau.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = (id: string) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'applied' as const } : s));
    onToast(createToast('success', 'Đã áp dụng gợi ý — lịch trình của bạn đã được cập nhật'));
  };

  const isProcessing = apiInsight?.status === 'PENDING';
  const hasContent = strengths.length > 0 || concerns.length > 0 || suggestions.length > 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header
        className="sticky top-0 z-30 py-4 px-6 lg:px-10 mb-8"
        style={{ background: 'rgba(244, 250, 244, 0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #E8F5E8' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>Nhận xét từ AI</h1>
            <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>Dựa trên dữ liệu hành vi làm việc của bạn tuần qua</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <WeekDropdown value={selectedWeek} onChange={setSelectedWeek} weeks={weeks} />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: '#DDF3DF', color: '#5FAF6E', opacity: generating ? 0.7 : 1 }}
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {generating ? 'Gemini đang suy nghĩ...' : 'Tạo nhận xét ngay'}
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 lg:px-10 pb-8">
        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin" style={{ color: '#5FAF6E' }} />
          </div>
        ) : isProcessing ? (
          <ProcessingCard />
        ) : hasContent ? (
          <div className="flex flex-col gap-8">
            {/* Summary */}
            {summary && (
              <div className="px-5 py-4 rounded-2xl" style={{ background: '#F4FAF4', border: '1px solid #E8F5E8' }}>
                <p className="text-base leading-relaxed" style={{ color: '#243024', lineHeight: 1.7 }}>
                  {summary}
                </p>
              </div>
            )}

            {/* Strengths */}
            {strengths.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#243024' }}>
                  <ThumbsUp size={18} style={{ color: '#5FAF6E' }} />
                  Điểm tích cực
                </h2>
                <div className="flex flex-col gap-4">
                  {strengths.map((s) => (
                    <StrengthCard key={s.id} strength={s} />
                  ))}
                </div>
              </section>
            )}

            {/* Concerns */}
            {concerns.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#243024' }}>
                  <AlertTriangle size={18} style={{ color: '#D97706' }} />
                  Điểm cần lưu ý
                </h2>
                <div className="flex flex-col gap-4">
                  {concerns.map((c) => (
                    <ConcernCard key={c.id} concern={c} />
                  ))}
                </div>
              </section>
            )}

            {/* Actionable Suggestions */}
            {suggestions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#243024' }}>
                  <Lightbulb size={18} style={{ color: '#DB2777' }} />
                  Gợi ý hành động
                </h2>
                <div className="flex flex-col gap-4">
                  {suggestions.map((s) => (
                    <SuggestionCard key={s.id} suggestion={s} onApply={handleApply} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <Card>
            <EmptyState onGenerate={handleGenerate} generating={generating} />
          </Card>
        )}

        {/* Footer Note */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid #E8F5E8' }}>
          <p className="text-center" style={{ fontSize: 13, color: '#5F6E5F' }}>
            Nhận xét AI chỉ mang tính chất hỗ trợ ra quyết định. Bạn luôn là người quyết định cuối cùng cho lịch làm việc của mình.
          </p>
        </div>
      </div>
    </div>
  );
}
