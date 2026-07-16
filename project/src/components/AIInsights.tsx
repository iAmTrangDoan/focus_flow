import { useState } from 'react';
import { Sparkles, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const insights = [
  'Your peak focus window is between 9–11 AM — try scheduling deep work then.',
  'You complete 40% more tasks when you batch similar work into blocks.',
  'Taking a 5-min break after each Pomodoro reduces mental fatigue by ~30%.',
  'Shorter task descriptions help you start faster — keep them under 10 words.',
  'Monday mornings are your lowest-energy slot — save admin tasks for then.',
];

export function AIInsights() {
  const [applied, setApplied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: '#FFFFFF', boxShadow: '0 2px 16px 0 rgba(36,48,36,0.07)', border: '1px solid #D4E8D4', borderRadius: 20 }}
    >
      <div
        className="flex items-center justify-between px-6 py-5 cursor-pointer select-none"
        style={{ background: '#F4FAF4', borderBottom: expanded ? '1px solid #D4E8D4' : 'none' }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: '#DDF3DF' }}
          >
            <Sparkles size={18} style={{ color: '#5FAF6E' }} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: '#243024' }}>AI Insights</h3>
            <p className="text-xs" style={{ color: '#5F6E5F' }}>Personalized tips based on your last 30 days</p>
          </div>
        </div>
        <button className="rounded-lg p-1.5" style={{ color: '#5F6E5F' }} aria-label="Toggle">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="px-6 py-5">
          <ul className="space-y-3 mb-6">
            {insights.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <div
                  className="mt-0.5 shrink-0 rounded-full flex items-center justify-center"
                  style={{ width: 20, height: 20, background: '#DDF3DF' }}
                >
                  <div className="rounded-full" style={{ width: 7, height: 7, background: '#5FAF6E' }} />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#5F6E5F' }}>{tip}</p>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setApplied(true)}
            disabled={applied}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed"
            style={applied ? { background: '#DDF3DF', color: '#4A9459' } : { background: '#5FAF6E', color: '#fff' }}
          >
            {applied ? <><CheckCircle2 size={16} />Applied to Schedule</> : <><Sparkles size={16} />One-click Apply</>}
          </button>

          {applied && (
            <p className="mt-3 text-xs" style={{ color: '#5F6E5F' }}>
              Your schedule has been updated with these recommendations.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
