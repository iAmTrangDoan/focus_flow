import { useState } from 'react';
import {
  Sun,
  Clock,
  BarChart3,
  ChevronDown,
  Loader2,
  Check,
  Hourglass,
  Zap,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { createToast, type ToastMessage } from './ui/Toast';

/* ─── Types ─── */
type InsightCategory = 'golden_hours' | 'procrastination_pattern' | 'completion_rate';
type InsightStatus = 'new' | 'applied' | 'processing';

interface Insight {
  id: string;
  category: InsightCategory;
  content: string;
  actionable: boolean;
  status: InsightStatus;
}

/* ─── Mock Data ─── */
const WEEKS = [
  { value: '27', label: 'Tuần 27 · 29/06 - 05/07/2026' },
  { value: '26', label: 'Tuần 26 · 22/06 - 28/06/2026' },
  { value: '25', label: 'Tuần 25 · 15/06 - 21/06/2026' },
];

const MOCK_INSIGHTS: Insight[] = [
  {
    id: '1',
    category: 'golden_hours',
    content:
      'Bạn thường hoàn thành các phiên Pomodoro vào khung giờ 9:00–11:00 với tỉ lệ tập trung cao nhất (trung bình 42 phút thực tập mỗi phiên). Đây là thời điểm não bộ của bạn tỉnh táo nhất. Hãy ưu tiên dành khung giờ này cho các task cần tư duy sâu hoặc deadline gấp.',
    actionable: true,
    status: 'new',
  },
  {
    id: '2',
    category: 'procrastination_pattern',
    content:
      'Bạn thường trì hoãn các task thuộc nhóm "Hành chính" (gửi email, báo cáo) vào buổi chiều, đặc biệt là sau 14:00. Trung bình mỗi task hành chính bị dời lịch 2.3 lần trước khi hoàn thành. Thử chuyển nhóm task này sang buổi sáng khi năng lượng còn cao hơn.',
    actionable: true,
    status: 'applied',
  },
  {
    id: '3',
    category: 'completion_rate',
    content:
      'Tuần qua bạn hoàn thành 92% các task có priority High — cao hơn 25% so với trung bình 4 tuần trước. Tiếp tục duy trì cách phân loại ưu tiên này nhé!',
    actionable: false,
    status: 'new',
  },
  {
    id: '4',
    category: 'golden_hours',
    content:
      'Các phiên tập trung vào buổi tối (19:00–21:00) thường ngắn hơn và hay bị cắt ngang. Trung bình mỗi phiên chỉ đạt 18 phút trước khi bạn dừng lại. Consider giữ buổi tối cho các task nhẹ nhàng hoặc review lại công việc trong ngày thay vì deep work.',
    actionable: false,
    status: 'new',
  },
  {
    id: '5',
    category: 'procrastination_pattern',
    content:
      'Task thuộc nhóm "Học tập" (ôn thi, đọc tài liệu) thường được bắt đầu vào sáng Thứ 2, nhưng lại bị gác lại nếu không hoàn thành trong ngày. Bạn có xu hướng over-estimate khả năng hoàn thành trong ngày đầu tuần. Thử chia nhỏ các task học tập thành subtask 30 phút để dễ bắt đầu hơn.',
    actionable: true,
    status: 'new',
  },
  {
    id: '6',
    category: 'completion_rate',
    content:
      'Tỉ lệ hoàn thành task có fixed time (meeting, cuộc hẹn) đạt 100% trong 2 tuần qua, trong khi task flexible chỉ đạt 71%. Điều này cho thấy bạn làm việc tốt khi có deadline cứng. Thử tự đặt "fake deadline" cho task flexible để cải thiện tỉ lệ này.',
    actionable: true,
    status: 'new',
  },
];

/* ─── Sub-components ─── */

// Week Dropdown
interface WeekDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

function WeekDropdown({ value, onChange }: WeekDropdownProps) {
  const [open, setOpen] = useState(false);

  const selected = WEEKS.find((w) => w.value === value);

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
          {selected?.label}
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
            {WEEKS.map((week) => (
              <button
                key={week.value}
                onClick={() => {
                  onChange(week.value);
                  setOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm transition-colors"
                style={{
                  background: value === week.value ? '#DDF3DF' : 'transparent',
                  color: '#243024',
                }}
                onMouseEnter={(e) => {
                  if (value !== week.value) {
                    e.currentTarget.style.background = '#F4FAF4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== week.value) {
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

// Category Icon
interface CategoryIconProps {
  category: InsightCategory;
}

function CategoryIcon({ category }: CategoryIconProps) {
  const config = {
    golden_hours: {
      icon: Sun,
      bg: '#FEF3C7',
      color: '#D97706',
    },
    procrastination_pattern: {
      icon: Clock,
      bg: '#FCE7F3',
      color: '#DB2777',
    },
    completion_rate: {
      icon: BarChart3,
      bg: '#DDF3DF',
      color: '#5FAF6E',
    },
  };

  const { icon: Icon, bg, color } = config[category];

  return (
    <div
      className="flex items-center justify-center rounded-xl shrink-0"
      style={{ width: 40, height: 40, background: bg }}
    >
      <Icon size={20} style={{ color }} />
    </div>
  );
}

// Insight Card
interface InsightCardProps {
  insight: Insight;
  onApply: (id: string) => void;
}

function InsightCard({ insight, onApply }: InsightCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleApply = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
    onApply(insight.id);
  };

  const isApplied = insight.status === 'applied';

  return (
    <Card
      className="transition-all duration-200 hover:shadow-md"
      style={{
        borderColor: isApplied ? '#5FAF6E' : '#E8F5E8',
        borderWidth: 1,
      }}
    >
      <div className="flex gap-4">
        <CategoryIcon category={insight.category} />

        <div className="flex-1 min-w-0">
          <p
            className="text-base leading-relaxed"
            style={{ color: '#243024', lineHeight: 1.6 }}
          >
            {insight.content}
          </p>

          {insight.actionable && (
            <div className="mt-4 flex items-center gap-3">
              {isApplied ? (
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: '#DDF3DF',
                    color: '#4A9459',
                  }}
                >
                  <Check size={16} />
                  Đã áp dụng
                </span>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-70"
                  style={{
                    background: '#DDF3DF',
                    color: '#5FAF6E',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Đang áp dụng...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Áp dụng ngay
                    </>
                  )}
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
    <div
      className="flex items-center gap-4 px-6 py-5 rounded-2xl"
      style={{
        border: '2px dashed #E8F5E8',
        background: '#FAFDFA',
      }}
    >
      <div
        className="flex items-center justify-center rounded-xl shrink-0"
        style={{ width: 40, height: 40, background: '#E8F5E8' }}
      >
        <Hourglass size={20} style={{ color: '#5FAF6E' }} />
      </div>
      <p className="text-base" style={{ color: '#5F6E5F' }}>
        AI đang tổng hợp dữ liệu hành vi tuần này, quay lại vào đầu tuần sau nhé!
      </p>
    </div>
  );
}

// Empty State
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div
        className="flex items-center justify-center rounded-3xl mb-4"
        style={{
          width: 80,
          height: 80,
          background: '#E8F5E8',
        }}
      >
        <Clock size={32} style={{ color: '#9CA3AF' }} />
      </div>
      <h3
        className="text-base font-semibold text-center mb-2"
        style={{ color: '#243024' }}
      >
        Chưa đủ dữ liệu hành vi
      </h3>
      <p
        className="text-sm text-center max-w-md"
        style={{ color: '#9CA3AF' }}
      >
        Bạn cần sử dụng FocusFlow thêm vài ngày để AI có đủ dữ liệu hành vi đưa ra
        nhận xét chính xác nhé!
      </p>
    </div>
  );
}

/* ─── Main AI Insights Page ─── */
interface AIInsightsPageProps {
  onToast: (toast: ToastMessage) => void;
}

export default function AIInsightsPage({ onToast }: AIInsightsPageProps) {
  const [selectedWeek, setSelectedWeek] = useState('27');
  const [insights, setInsights] = useState<Insight[]>(MOCK_INSIGHTS);

  const handleApply = (id: string) => {
    setInsights((prev) =>
      prev.map((insight) =>
        insight.id === id ? { ...insight, status: 'applied' as InsightStatus } : insight
      )
    );
    onToast(createToast('success', 'Đã áp dụng gợi ý — lịch trình của bạn đã được cập nhật'));
  };

  const hasEnoughData = true;
  const isProcessing = false;

  return (
    <div className="flex flex-col min-h-full px-6 lg:px-10 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#243024' }}>
              Nhận xét từ AI
            </h1>
            <p className="text-sm mt-1" style={{ color: '#5F6E5F' }}>
              Dựa trên dữ liệu hành vi làm việc của bạn tuần qua
            </p>
          </div>

          <div className="flex items-center gap-3">
            <WeekDropdown value={selectedWeek} onChange={setSelectedWeek} />
            <Badge variant="neutral">
              Cập nhật lúc 00:00 Thứ 2
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      {hasEnoughData ? (
        <>
          {isProcessing ? (
            <ProcessingCard />
          ) : (
            <div className="flex flex-col gap-6">
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onApply={handleApply}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <Card>
          <EmptyState />
        </Card>
      )}

      {/* Footer Note */}
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid #E8F5E8' }}>
        <p
          className="text-center"
          style={{
            fontSize: 13,
            color: '#5F6E5F',
          }}
        >
          Nhận xét AI chỉ mang tính chất hỗ trợ ra quyết định. Bạn luôn là người quyết định cuối
          cùng cho lịch làm việc của mình.
        </p>
      </div>
    </div>
  );
}
